require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// Initialize Supabase Admin client (bypasses RLS)
const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
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

        // Insert user details into users table using admin client to bypass RLS
        const { error: dbError } = await supabaseAdmin
            .from('users')
            .insert([
                { 
                    id: authData.user.id,
                    email, 
                    name,
                    is_admin: false
                }
            ]);

        if (dbError) {
            return res.status(400).json({ error: dbError.message });
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

        // Get user details from database
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (userError) {
            return res.status(400).json({ error: userError.message });
        }

        req.session.user = {
            id: data.user.id,
            email: data.user.email,
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

        // Insert feedback into database
        const { data, error } = await supabase
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

        const { data, error } = await supabase
            .from('feedback')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ feedback: data });
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

        const { data, error } = await supabase
            .from('feedback')
            .select('sentiment');

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        const stats = {
            total: data.length,
            positive: data.filter(f => f.sentiment === 'positive').length,
            negative: data.filter(f => f.sentiment === 'negative').length,
            neutral: data.filter(f => f.sentiment === 'neutral').length
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

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
