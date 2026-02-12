-- Fix profiles_email_phone_exposure: Add explicit policy to deny anonymous access to profiles table
-- This ensures unauthenticated users cannot read any profile data
CREATE POLICY "deny_anon_access_profiles"
ON public.profiles
FOR SELECT
TO anon
USING (false);