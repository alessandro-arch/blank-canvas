-- =====================================================
-- SECURITY FIX: Audit Log Manipulation Vulnerability
-- =====================================================
-- Issue: The audit_logs table allows any authenticated user to insert records
-- Fix: Remove INSERT policy and create a SECURITY DEFINER function that validates
--      the caller has admin or manager role before allowing audit log insertion

-- Step 1: Drop the permissive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;

-- Step 2: Create a secure audit logging function
-- This function runs with elevated privileges (SECURITY DEFINER) but validates
-- that only admins and managers can insert audit logs
CREATE OR REPLACE FUNCTION public.insert_audit_log(
  p_action text,
  p_entity_type text,
  p_entity_id uuid DEFAULT NULL,
  p_details jsonb DEFAULT '{}'::jsonb,
  p_previous_value jsonb DEFAULT NULL,
  p_new_value jsonb DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_email text;
  v_log_id uuid;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to create audit logs';
  END IF;
  
  -- Verify caller has admin or manager role
  IF NOT (has_role(v_user_id, 'admin'::app_role) OR has_role(v_user_id, 'manager'::app_role)) THEN
    RAISE EXCEPTION 'Only admins and managers can create audit logs';
  END IF;
  
  -- Get user email from auth.users
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = v_user_id;
  
  -- Insert the audit log
  INSERT INTO public.audit_logs (
    user_id,
    user_email,
    action,
    entity_type,
    entity_id,
    details,
    previous_value,
    new_value,
    user_agent
  ) VALUES (
    v_user_id,
    v_user_email,
    p_action,
    p_entity_type,
    p_entity_id,
    COALESCE(p_details, '{}'::jsonb),
    p_previous_value,
    p_new_value,
    p_user_agent
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Grant execute permission to authenticated users
-- (the function itself validates roles internally)
GRANT EXECUTE ON FUNCTION public.insert_audit_log TO authenticated;