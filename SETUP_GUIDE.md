# Complete Setup Guide for The new collage Kolhapur

## 📋 Prerequisites
- Node.js installed (v14 or higher)
- A Supabase account (free tier works)
- A Google Gemini API key (free tier available)

## 🚀 Step-by-Step Setup

### 1. Install Dependencies
Open a terminal in the project directory and run:
```bash
npm install
```

### 2. Set Up Supabase

#### Create a Supabase Project:
1. Go to https://supabase.com
2. Click "New Project"
3. Fill in project details and create

#### Run the Database Schema:
1. In your Supabase dashboard, go to "SQL Editor"
2. Copy the contents from `database/schema.sql`
3. Paste and run it

#### Create Admin User:
1. In Supabase dashboard, go to "Authentication" → "Users"
2. Click "Add user" → "Create new user"
3. Email: `yashpatil@admin.com`
4. Password: `yash@123`
5. Click "Create user"
6. Copy the user's UUID

#### Update Admin in Database:
1. Go to "SQL Editor" in Supabase
2. Run this query (replace `YOUR_UUID_HERE` with the copied UUID):
```sql
INSERT INTO public.users (id, email, name, is_admin) 
VALUES ('YOUR_UUID_HERE', 'yashpatil@admin.com', 'Yash Patil', true)
ON CONFLICT (email) DO UPDATE SET is_admin = true;
```

#### Get Your Supabase Credentials:
1. In Supabase dashboard, go to "Settings" → "API"
2. Copy your "Project URL" (looks like: https://xxxxx.supabase.co)
3. Copy your "anon public" key

### 3. Get Google Gemini API Key

1. Go to https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy your API key

### 4. Configure Environment Variables

1. Copy `.env.example` to `.env`:
```bash
copy .env.example .env
```

2. Edit `.env` file and add your credentials:
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
SESSION_SECRET=any_random_string_here_make_it_long_and_secure
PORT=3000
```

### 5. Start the Application

```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

### 6. Access the Application

Open your browser and go to: http://localhost:3000

## 👥 User Access

### Admin Login:
- URL: http://localhost:3000/login.html
- Email: yashpatil@admin.com
- Password: yash@123

### Student Access:
1. Go to http://localhost:3000/signup.html
2. Create an account
3. Login with your credentials
4. Submit feedback

## 🎨 Features

✅ **Student Features:**
- Sign up / Login
- Submit feedback (anonymous or named)
- AI-powered sentiment analysis
- Modern, responsive UI

✅ **Admin Features:**
- Secure dashboard access
- View all feedback
- Filter by sentiment (positive/negative/neutral)
- Real-time statistics
- Export-ready table view

✅ **AI Integration:**
- Automatic sentiment analysis using Google Gemini
- Categorizes feedback as positive, negative, or neutral
- Instant results

## 🔧 Troubleshooting

### Issue: "Cannot find module" errors
**Solution:** Run `npm install` again

### Issue: Database connection errors
**Solution:** 
- Check your Supabase URL and API key in `.env`
- Ensure the database schema is properly created

### Issue: AI sentiment analysis not working
**Solution:**
- Verify your Gemini API key is correct
- Check if you have API quota remaining

### Issue: Admin can't login
**Solution:**
- Ensure admin user is created in Supabase Auth
- Verify the UUID is correctly inserted in the users table with `is_admin = true`

## 📱 Project Structure

```
Feedback-form-with-ai/
├── public/
│   ├── css/
│   │   └── style.css          # All styling
│   ├── js/
│   │   ├── auth.js            # Login functionality
│   │   ├── feedback.js        # Feedback submission
│   │   └── admin.js           # Admin dashboard
│   ├── index.html             # Home page
│   ├── login.html             # Login page
│   ├── signup.html            # Signup page
│   ├── feedback.html          # Feedback form
│   └── admin.html             # Admin dashboard
├── database/
│   └── schema.sql             # Database schema
├── server.js                  # Express server + API
├── package.json               # Dependencies
├── .env                       # Environment variables
└── README.md                  # Documentation
```

## 🎯 Technology Stack

- **Frontend:** HTML5, CSS3, Bootstrap 5, Bootstrap Icons
- **Backend:** Node.js, Express.js
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **AI:** Google Gemini API
- **Session:** Express Session

## 🌟 Key Features Implemented

1. ✅ Student authentication (signup/login)
2. ✅ Anonymous and named feedback options
3. ✅ Admin login (yashpatil@admin.com / yash@123)
4. ✅ AI-powered sentiment analysis (Gemini API)
5. ✅ Supabase for data storage
6. ✅ Modern UI with Bootstrap Icons
7. ✅ Professional design with matched theme
8. ✅ Responsive design for all devices
9. ✅ Real-time statistics
10. ✅ Filter feedback by sentiment

## 💡 Usage Tips

- **For Students:** Use anonymous mode for sensitive feedback
- **For Admin:** Use filters to quickly find specific types of feedback
- **Sentiment Analysis:** The AI automatically analyzes feedback tone
- **Security:** All passwords are handled securely by Supabase Auth

## 📞 Support

If you encounter any issues, check:
1. All environment variables are set correctly
2. Supabase database schema is created
3. Admin user is properly configured
4. API keys are valid and have quota

---

Made with ❤️ for education
