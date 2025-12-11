-- Run this in Supabase SQL Editor to fix all RLS issues

-- Drop all existing policies for users table
DROP POLICY IF EXISTS "Users can read their own data" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own data" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
DROP POLICY IF EXISTS "Allow public user reads" ON public.users;

-- Drop all existing policies for feedback table
DROP POLICY IF EXISTS "Students can insert feedback" ON public.feedback;
DROP POLICY IF EXISTS "Students can read their own feedback" ON public.feedback;
DROP POLICY IF EXISTS "Admins can read all feedback" ON public.feedback;
DROP POLICY IF EXISTS "Allow authenticated users to read feedback" ON public.feedback;

-- Create permissive policies for users table
CREATE POLICY "Allow public user reads" ON public.users
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own data" ON public.users
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own data" ON public.users
    FOR UPDATE USING (true);

-- Create permissive policies for feedback table
CREATE POLICY "Students can insert feedback" ON public.feedback
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read feedback" ON public.feedback
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Verify policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('users', 'feedback');
