-- Run this in Supabase SQL Editor to ensure yashpatil@admin.com is set as admin
-- This will update existing records or you can run after first login

UPDATE public.users 
SET is_admin = true, 
    name = 'Yash Patil (Admin)'
WHERE email = 'yashpatil@admin.com';

-- Verify the admin user
SELECT id, email, name, is_admin, created_at 
FROM public.users 
WHERE email = 'yashpatil@admin.com';
