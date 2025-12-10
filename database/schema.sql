-- Create users table for students
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create feedback table
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.users(id),
    student_name TEXT,
    faculty_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    feedback_text TEXT NOT NULL,
    is_anonymous BOOLEAN DEFAULT FALSE,
    sentiment TEXT, -- 'positive', 'negative', or 'neutral'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_feedback_faculty ON public.feedback(faculty_name);
CREATE INDEX IF NOT EXISTS idx_feedback_sentiment ON public.feedback(sentiment);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read their own data" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own data" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
DROP POLICY IF EXISTS "Students can insert feedback" ON public.feedback;
DROP POLICY IF EXISTS "Students can read their own feedback" ON public.feedback;
DROP POLICY IF EXISTS "Admins can read all feedback" ON public.feedback;

-- Policies for users table
CREATE POLICY "Users can read their own data" ON public.users
    FOR SELECT USING (auth.uid() = id OR is_admin = true);

-- Allow inserts during signup (authenticated users can insert their own record)
CREATE POLICY "Users can insert their own data" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id OR auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own data" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Policies for feedback table
CREATE POLICY "Students can insert feedback" ON public.feedback
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Students can read their own feedback" ON public.feedback
    FOR SELECT USING (
        student_id = auth.uid() OR 
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
    );

CREATE POLICY "Admins can read all feedback" ON public.feedback
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
    );

-- Insert admin user (you'll need to create this user in Supabase Auth first)
-- Then link it here. For now, we'll create a placeholder.
-- After creating the user yashpatil@admin.com in Supabase Auth dashboard,
-- you need to get their UUID and insert it here.

-- Example (replace 'your-admin-uuid' with actual UUID from Supabase Auth):
-- INSERT INTO public.users (id, email, name, is_admin) 
-- VALUES ('your-admin-uuid', 'yashpatil@admin.com', 'Yash Patil', true)
-- ON CONFLICT (email) DO UPDATE SET is_admin = true;
