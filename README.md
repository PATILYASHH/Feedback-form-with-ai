# The new collage Kolhapur - Student Feedback System with AI

A modern web application for collecting and analyzing student feedback for The new collage Kolhapur using AI-powered sentiment analysis.

## Features

- 🎓 Student authentication (sign up/login)
- 📝 Anonymous and named feedback submission
- 🤖 AI-powered sentiment analysis using Google Gemini
- 👨‍💼 Admin dashboard for viewing all feedback
- 💾 Supabase backend for data storage
- 🎨 Modern, professional UI with Bootstrap Icons

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment Variables**
   - Copy `.env.example` to `.env`
   - Add your Supabase credentials (URL and Anon Key)
   - Add your Google Gemini API key
   - Set a random session secret

3. **Set Up Supabase**
   - Create a new Supabase project
   - Run the SQL schema provided in `database/schema.sql`
   - Create admin user with email: yashpatil@admin.com

4. **Run the Application**
   ```bash
   npm start
   ```
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

5. **Access the Application**
   - Open http://localhost:3000
   - Admin Login: yashpatil@admin.com / yash@123
   - Students need to sign up to submit feedback

## Project Structure

```
├── public/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── auth.js
│   │   ├── feedback.js
│   │   └── admin.js
│   ├── index.html
│   ├── login.html
│   ├── signup.html
│   ├── feedback.html
│   └── admin.html
├── database/
│   └── schema.sql
├── server.js
├── .env
└── package.json
```

## Technologies Used

- **Frontend**: HTML5, CSS3, Bootstrap 5, Bootstrap Icons
- **Backend**: Node.js, Express.js
- **Database**: Supabase (PostgreSQL)
- **AI**: Google Gemini API
- **Authentication**: Supabase Auth
