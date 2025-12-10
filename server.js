require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
    secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Routes

// Home page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Student Sign Up
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { email, password, name } = req.body;

        // Create user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
        });

        if (authError) {
            return res.status(400).json({ error: authError.message });
        }

        // Create authenticated client with the new user's token
        const userSupabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY,
            {
                global: {
                    headers: {
                        Authorization: `Bearer ${authData.session?.access_token}`
                    }
                }
            }
        );

        // Check if this is the admin email
        const isAdmin = email === 'yashpatil@admin.com';

        // Insert user details into users table using authenticated client
        const { error: dbError } = await userSupabase
            .from('users')
            .insert([
                { 
                    id: authData.user.id,
                    email, 
                    name: isAdmin ? 'Yash Patil (Admin)' : name,
                    is_admin: isAdmin
                }
            ]);

        if (dbError) {
            // Ignore if user already exists
            if (!dbError.message.includes('duplicate') && !dbError.message.includes('unique')) {
                return res.status(400).json({ error: dbError.message });
            }
        }

        res.json({ 
            message: 'Signup successful! Please check your email to verify your account.',
            user: { id: authData.user.id, email, name }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Student/Admin Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            return res.status(401).json({ error: error.message });
        }

        // Create authenticated supabase client with user's token
        const userSupabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY,
            {
                global: {
                    headers: {
                        Authorization: `Bearer ${data.session.access_token}`
                    }
                }
            }
        );

        // Get user details from database using authenticated client
        let { data: userData, error: userError } = await userSupabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .maybeSingle();

        // If user not found, try by email
        if (!userData && !userError) {
            const result = await userSupabase
                .from('users')
                .select('*')
                .eq('email', data.user.email)
                .maybeSingle();
            
            userData = result.data;
            userError = result.error;
        }

        // If still not found, create the user
        if (!userData && !userError) {
            // Check if this is the admin email
            const isAdmin = data.user.email === 'yashpatil@admin.com';
            
            const { data: newUser, error: insertError } = await userSupabase
                .from('users')
                .insert([{
                    id: data.user.id,
                    email: data.user.email,
                    name: isAdmin ? 'Yash Patil (Admin)' : data.user.email.split('@')[0],
                    is_admin: isAdmin
                }])
                .select()
                .maybeSingle();

            if (!insertError && newUser) {
                userData = newUser;
            } else if (insertError) {
                // One more attempt - try to fetch again
                const retryResult = await userSupabase
                    .from('users')
                    .select('*')
                    .eq('email', data.user.email)
                    .maybeSingle();
                
                if (retryResult.data) {
                    userData = retryResult.data;
                    
                    // Update admin status if this is the admin email
                    if (isAdmin && !userData.is_admin) {
                        await userSupabase
                            .from('users')
                            .update({ is_admin: true, name: 'Yash Patil (Admin)' })
                            .eq('id', userData.id);
                        
                        userData.is_admin = true;
                        userData.name = 'Yash Patil (Admin)';
                    }
                } else {
                    return res.status(400).json({ error: 'Could not create or find user record' });
                }
            }
        }

        // Ensure admin status for yashpatil@admin.com
        if (userData && userData.email === 'yashpatil@admin.com' && !userData.is_admin) {
            await userSupabase
                .from('users')
                .update({ is_admin: true, name: 'Yash Patil (Admin)' })
                .eq('id', userData.id);
            
            userData.is_admin = true;
            userData.name = 'Yash Patil (Admin)';
        }

        if (!userData) {
            return res.status(400).json({ error: 'User record not found' });
        }

        req.session.user = {
            id: userData.id,
            email: userData.email,
            name: userData.name,
            isAdmin: userData.is_admin,
            accessToken: data.session.access_token
        };

        res.json({ 
            message: 'Login successful',
            user: req.session.user
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Logout
app.post('/api/auth/logout', async (req, res) => {
    req.session.destroy();
    res.json({ message: 'Logged out successfully' });
});

// Check auth status
app.get('/api/auth/status', (req, res) => {
    if (req.session.user) {
        res.json({ authenticated: true, user: req.session.user });
    } else {
        res.json({ authenticated: false });
    }
});

// Analyze sentiment using Gemini AI
async function analyzeSentiment(feedbackText) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        const prompt = `Analyze the following student feedback and categorize it as either "positive", "negative", or "neutral". 
        Respond with ONLY one word: positive, negative, or neutral.
        
        Feedback: "${feedbackText}"`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const sentiment = response.text().trim().toLowerCase();
        
        // Validate response
        if (['positive', 'negative', 'neutral'].includes(sentiment)) {
            return sentiment;
        }
        return 'neutral'; // Default fallback
    } catch (error) {
        console.error('Gemini API Error:', error);
        return 'neutral'; // Fallback on error
    }
}

// Submit feedback
app.post('/api/feedback/submit', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ error: 'Please login to submit feedback' });
        }

        const { facultyName, subject, feedbackText, isAnonymous } = req.body;

        if (!facultyName || !subject || !feedbackText) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Analyze sentiment using Gemini AI
        const sentiment = await analyzeSentiment(feedbackText);

        // Prepare feedback data
        const feedbackData = {
            student_id: req.session.user.id,
            student_name: isAnonymous ? 'Anonymous' : req.session.user.name,
            faculty_name: facultyName,
            subject: subject,
            feedback_text: feedbackText,
            is_anonymous: isAnonymous,
            sentiment: sentiment
        };

        // Create authenticated client with user's token
        const userSupabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY,
            {
                global: {
                    headers: {
                        Authorization: `Bearer ${req.session.user.accessToken}`
                    }
                }
            }
        );

        // Insert feedback into database
        const { data, error } = await userSupabase
            .from('feedback')
            .insert([feedbackData])
            .select();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ 
            message: 'Feedback submitted successfully!',
            feedback: data[0]
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all feedback (Admin only)
app.get('/api/feedback/all', async (req, res) => {
    try {
        if (!req.session.user || !req.session.user.isAdmin) {
            return res.status(403).json({ error: 'Access denied. Admin only.' });
        }

        // Create authenticated client with user's token
        const userSupabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY,
            {
                global: {
                    headers: {
                        Authorization: `Bearer ${req.session.user.accessToken}`
                    }
                }
            }
        );

        const { data, error } = await userSupabase
            .from('feedback')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ feedback: data || [] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get feedback statistics (Admin only)
app.get('/api/feedback/stats', async (req, res) => {
    try {
        if (!req.session.user || !req.session.user.isAdmin) {
            return res.status(403).json({ error: 'Access denied. Admin only.' });
        }

        // Create authenticated client with user's token
        const userSupabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY,
            {
                global: {
                    headers: {
                        Authorization: `Bearer ${req.session.user.accessToken}`
                    }
                }
            }
        );

        const { data, error } = await userSupabase
            .from('feedback')
            .select('sentiment');

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        const stats = {
            total: data?.length || 0,
            positive: data?.filter(f => f.sentiment === 'positive').length || 0,
            negative: data?.filter(f => f.sentiment === 'negative').length || 0,
            neutral: data?.filter(f => f.sentiment === 'neutral').length || 0
        };

        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get student's own feedback
app.get('/api/feedback/my-feedback', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ error: 'Please login to view your feedback' });
        }

        const { data, error } = await supabase
            .from('feedback')
            .select('*')
            .eq('student_id', req.session.user.id)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ feedback: data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get top issues and analytics (Admin only)
app.get('/api/feedback/analytics', async (req, res) => {
    try {
        if (!req.session.user || !req.session.user.isAdmin) {
            return res.status(403).json({ error: 'Access denied. Admin only.' });
        }

        // Create authenticated client with user's token
        const userSupabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY,
            {
                global: {
                    headers: {
                        Authorization: `Bearer ${req.session.user.accessToken}`
                    }
                }
            }
        );

        const { data, error } = await userSupabase
            .from('feedback')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        // Handle empty feedback
        if (!data || data.length === 0) {
            return res.json({
                topKeywords: [],
                topFacultyIssues: [],
                topSubjectIssues: [],
                facultyStats: {}
            });
        }

        // Extract common keywords from negative feedback
        const negativeFeedback = data.filter(f => f.sentiment === 'negative');
        const keywords = {};
        const facultyIssues = {};
        const subjectIssues = {};

        negativeFeedback.forEach(feedback => {
            const text = feedback.feedback_text.toLowerCase();
            const faculty = feedback.faculty_name;
            const subject = feedback.subject;

            // Common issue patterns
            const patterns = [
                'pc', 'computer', 'laptop', 'system', 'lab', 'projector', 
                'ac', 'fan', 'light', 'bench', 'chair', 'board', 'marker',
                'wifi', 'internet', 'network', 'not working', 'broken', 'damaged'
            ];

            patterns.forEach(pattern => {
                if (text.includes(pattern)) {
                    keywords[pattern] = (keywords[pattern] || 0) + 1;
                    
                    // Track by faculty
                    const key = `${pattern} - ${faculty}`;
                    facultyIssues[key] = (facultyIssues[key] || 0) + 1;
                }
            });

            // Track by subject
            const subjectKey = `${subject} - ${faculty}`;
            subjectIssues[subjectKey] = (subjectIssues[subjectKey] || 0) + 1;
        });

        // Sort and get top issues
        const topKeywords = Object.entries(keywords)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([keyword, count]) => ({ keyword, count }));

        const topFacultyIssues = Object.entries(facultyIssues)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([issue, count]) => ({ issue, count }));

        const topSubjectIssues = Object.entries(subjectIssues)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([subject, count]) => ({ subject, count }));

        // Faculty-wise sentiment breakdown
        const facultyStats = {};
        data.forEach(feedback => {
            const faculty = feedback.faculty_name;
            if (!facultyStats[faculty]) {
                facultyStats[faculty] = { positive: 0, negative: 0, neutral: 0, total: 0 };
            }
            facultyStats[faculty][feedback.sentiment]++;
            facultyStats[faculty].total++;
        });

        res.json({
            topKeywords,
            topFacultyIssues,
            topSubjectIssues,
            facultyStats
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
