-- Drop existing scholar enrollment SELECT policy and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Scholars can view their own enrollments" ON public.enrollments;

-- Create permissive policy for scholars to view their own enrollments
CREATE POLICY "Scholars can view their own enrollments"
ON public.enrollments
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_active = true
  )
);