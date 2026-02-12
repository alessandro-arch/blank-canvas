-- Drop the overly permissive policy
DROP POLICY IF EXISTS "System can insert notifications for users" ON public.notifications;

-- The triggers use SECURITY DEFINER so they can insert notifications
-- We only need the manager/admin policy for manual notifications if needed