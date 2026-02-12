-- Remove FK constraint that references auth.users (causes issues when users are deleted)
ALTER TABLE public.enrollments DROP CONSTRAINT IF EXISTS enrollments_user_id_fkey;

-- Same for payments table
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_user_id_fkey;