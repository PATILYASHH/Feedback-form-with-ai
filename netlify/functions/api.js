require('dotenv').config();
const express = require('express');
const serverless = require('serverless-http');
const session = require('express-session');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();

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
app.use(session({
    secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: true,
        httpOnly: true,
        sameSite: 'lax'
    }
}));

// Student Sign Up
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Sign up with Supabase Auth
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { name }
            }
        });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        if (!data.user) {
            return res.status(400).json({ error: 'Signup failed' });
        }

        // Create authenticated client with the new user's token
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

        // Insert user record
        const { error: insertError } = await userSupabase
            .from('users')
            .upsert([{
                id: data.user.id,
                email: data.user.email,
                name: name,
                is_admin: false
            }], {
                onConflict: 'email',
                ignoreDuplicates: false
            });

        if (insertError) {
            console.error('Insert error:', insertError);
        }

        res.json({ 
            message: 'Account created successfully! Please login.',
            user: { email: data.user.email }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Student/Admin Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Sign in with Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        if (!data.user || !data.session) {
            return res.status(400).json({ error: 'Login failed' });
        }

        // Create authenticated client with user's token
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

        // Get or create user record
        let { data: userData, error: userError } = await userSupabase
            .from('users')
            .select('*')
            .eq('email', data.user.email)
            .maybeSingle();

        // If user not found, try one more time
        if (!userData && !userError) {
            const result = await userSupabase
                .from('users')
                .select('*')
                .eq('id', data.user.id)
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
                    
                    // Ensure admin status for yashpatil@admin.com
                    if (userData.email === 'yashpatil@admin.com' && !userData.is_admin) {
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
            user: {
                name: userData.name,
                email: userData.email,
                isAdmin: userData.is_admin
            }
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
        
        const prompt = `Analyze the following student feedback and categorize it as ONLY "positive" or "negative". 
        There is NO neutral option - you must choose one or the other.
        
        Rules:
        - If the feedback contains any praise, appreciation, satisfaction, or positive comments: respond "positive"
        - If the feedback contains complaints, criticism, dissatisfaction, or suggestions for improvement: respond "negative"
        - If mixed, lean towards the dominant sentiment
        - When in doubt, if they're giving constructive feedback or pointing out issues: respond "negative"
        
        Respond with ONLY one word: positive or negative.
        
        Feedback: "${feedbackText}"`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const sentiment = response.text().trim().toLowerCase();
        
        // Validate response - only accept positive or negative
        if (sentiment === 'positive') {
            return 'positive';
        }
        return 'negative'; // Default to negative if not clearly positive
    } catch (error) {
        console.error('Gemini API Error:', error);
        return 'negative'; // Fallback on error
    }
}

// Submit feedback
app.post('/api/feedback/submit', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ error: 'Please login to submit feedback' });
        }

        const { facultyName, subject, feedbackText, isAnonymous } = req.body;

        // Analyze sentiment using AI
        const sentiment = await analyzeSentiment(feedbackText);

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
            .insert([{
                student_id: req.session.user.id,
                student_name: isAnonymous ? null : req.session.user.name,
                faculty_name: facultyName,
                subject: subject,
                feedback_text: feedbackText,
                is_anonymous: isAnonymous,
                sentiment: sentiment
            }])
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
            console.error('Error fetching feedback:', error);
            return res.status(400).json({ error: error.message });
        }

        console.log('Fetched feedback:', data ? data.length : 0, 'items');
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
            negative: data?.filter(f => f.sentiment === 'negative').length || 0
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
            return res.status(401).json({ error: 'Please login first' });
        }

        const { data, error } = await supabase
            .from('feedback')
            .select('*')
            .eq('student_id', req.session.user.id)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ feedback: data || [] });
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
            .select('*');

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        // Extract keywords from negative feedback
        const keywords = {};
        const facultyIssues = {};
        const subjectIssues = {};
        
        data.forEach(feedback => {
            if (feedback.sentiment === 'negative') {
                const text = feedback.feedback_text.toLowerCase();
                const faculty = feedback.faculty_name;
                const subject = feedback.subject;
                
                // Common issue keywords
                const patterns = [
                    'teaching', 'explanation', 'clarity', 'understanding',
                    'behavior', 'rude', 'attitude', 'late', 'absent',
                    'marks', 'grading', 'unfair', 'bias', 'partial',
                    'syllabus', 'incomplete', 'slow', 'fast', 'pace',
                    'practical', 'theory', 'notes', 'material', 'book',
                    'exam', 'test', 'assignment', 'homework', 'project',
                    'time', 'schedule', 'punctual', 'delay',
                    'doubt', 'question', 'help', 'support', 'guidance',
                    'interactive', 'boring', 'monotonous', 'interesting',
                    'communication', 'english', 'language', 'accent',
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
            }
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
                facultyStats[faculty] = { positive: 0, negative: 0, total: 0 };
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

// Export the serverless function
module.exports.handler = serverless(app);
