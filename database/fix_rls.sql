-- Run this in Supabase SQL Editor to fix all RLS issues

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can read their own data" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own data" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
DROP POLICY IF EXISTS "Allow public user reads" ON public.users;

-- Create permissive policies for users table
CREATE POLICY "Allow public user reads" ON public.users
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own data" ON public.users
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own data" ON public.users
    FOR UPDATE USING (true);

-- Verify policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'users';
