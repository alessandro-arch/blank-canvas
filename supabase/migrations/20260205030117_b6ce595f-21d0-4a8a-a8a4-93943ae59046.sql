
-- Drop the existing restrictive INSERT policy that's causing issues
DROP POLICY IF EXISTS "Users can insert their own reports" ON public.reports;

-- Create a simpler INSERT policy that just checks user_id matches
CREATE POLICY "Users can insert their own reports"
ON public.reports
FOR INSERT
WITH CHECK (auth.uid() = user_id);
