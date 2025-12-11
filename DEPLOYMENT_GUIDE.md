# Netlify Deployment Guide

## Prerequisites
- A GitHub account
- A Netlify account (sign up at https://netlify.com)
- Your project pushed to GitHub

## Step-by-Step Deployment

### 1. Prepare Your Repository

1. Make sure all your changes are committed:
```bash
git add .
git commit -m "Prepare for Netlify deployment"
git push origin main
```

### 2. Create a Netlify Account

1. Go to https://netlify.com
2. Click "Sign up" and sign in with GitHub
3. Authorize Netlify to access your repositories

### 3. Deploy Your Site

1. Click "Add new site" → "Import an existing project"
2. Choose "GitHub" as your Git provider
3. Select your repository: `Feedback-form-with-ai`
4. Configure build settings (Netlify should auto-detect from `netlify.toml`):
   - **Build command**: `npm install`
   - **Publish directory**: `public`
   - **Functions directory**: `netlify/functions`

### 4. Configure Environment Variables

In your Netlify site dashboard:

1. Go to **Site settings** → **Environment variables**
2. Click **Add a variable** and add these one by one:

```
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
SESSION_SECRET=generate_a_random_long_string_here
```

**Important**: 
- Use the same values from your local `.env` file
- For SESSION_SECRET, generate a new random string (at least 32 characters)

### 5. Deploy

1. Click **Deploy site**
2. Wait for the deployment to complete (usually 1-2 minutes)
3. Your site will be live at: `https://your-site-name.netlify.app`

### 6. Custom Domain (Optional)

1. Go to **Site settings** → **Domain management**
2. Click **Add custom domain**
3. Follow the instructions to configure your DNS

## Important Notes

### Security
- ✅ All environment variables are secure and not exposed
- ✅ HTTPS is enabled by default
- ✅ Sessions use secure cookies in production

### Supabase Configuration
Make sure your Supabase RLS policies are properly configured:
1. Go to your Supabase dashboard
2. Run the SQL from `database/fix_rls.sql`

### Testing Your Deployment

1. Visit your Netlify URL
2. Try signing up: `https://your-site-name.netlify.app/signup.html`
3. Login with your credentials
4. Submit feedback
5. Login as admin: `yashpatil@admin.com` / `yash@123`
6. Check the admin dashboard

### Troubleshooting

**If you see "Function not found" errors:**
- Check that `netlify/functions/api.js` exists
- Verify the Functions directory is set to `netlify/functions`
- Check build logs for any errors

**If APIs don't work:**
- Verify all environment variables are set correctly
- Check Function logs in Netlify dashboard
- Make sure RLS policies are configured in Supabase

**If sessions don't persist:**
- Make sure SESSION_SECRET is set
- Check that cookies are enabled in your browser

### Continuous Deployment

Every time you push to GitHub, Netlify will automatically:
1. Pull your latest code
2. Run the build command
3. Deploy the new version

## Admin Access

Admin email: `yashpatil@admin.com`

Make sure this user exists in your Supabase Auth and has `is_admin: true` in the users table.

## Monitoring

- **Build logs**: Netlify Dashboard → Deploys → Click on a deploy
- **Function logs**: Netlify Dashboard → Functions → Click on `api`
- **Analytics**: Available in Netlify Pro plan

## Cost

- Netlify Free Tier includes:
  - 100GB bandwidth/month
  - 300 build minutes/month
  - Unlimited sites
  - HTTPS included
  - This should be sufficient for a college feedback system

## Support

If you encounter issues:
1. Check Netlify documentation: https://docs.netlify.com
2. Check Function logs in Netlify dashboard
3. Verify Supabase connection and RLS policies
