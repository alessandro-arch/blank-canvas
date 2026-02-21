
-- Login attempts tracking table (no FK to auth.users to avoid reserved schema)
CREATE TABLE public.login_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  ip_address text,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  success boolean NOT NULL DEFAULT false
);

-- Index for fast lookups by email + time
CREATE INDEX idx_login_attempts_email_time ON public.login_attempts (email, attempted_at DESC);

-- Auto-cleanup: delete attempts older than 24h
CREATE OR REPLACE FUNCTION public.cleanup_old_login_attempts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.login_attempts
  WHERE attempted_at < now() - interval '24 hours';
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cleanup_login_attempts
  AFTER INSERT ON public.login_attempts
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.cleanup_old_login_attempts();

-- RPC: Check if email is locked (5 failures in last 15 min)
CREATE OR REPLACE FUNCTION public.check_login_lockout(p_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
  v_last_attempt timestamptz;
  v_lockout_until timestamptz;
BEGIN
  SELECT count(*), max(attempted_at)
  INTO v_count, v_last_attempt
  FROM public.login_attempts
  WHERE email = lower(trim(p_email))
    AND success = false
    AND attempted_at > now() - interval '15 minutes';

  IF v_count >= 5 THEN
    v_lockout_until := v_last_attempt + interval '15 minutes';
    RETURN json_build_object(
      'locked', true,
      'attempts', v_count,
      'lockout_until', v_lockout_until,
      'remaining_seconds', GREATEST(0, EXTRACT(EPOCH FROM (v_lockout_until - now()))::int)
    );
  END IF;

  RETURN json_build_object(
    'locked', false,
    'attempts', v_count,
    'remaining_attempts', 5 - v_count
  );
END;
$$;

-- RPC: Record a login attempt
CREATE OR REPLACE FUNCTION public.record_login_attempt(p_email text, p_success boolean)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.login_attempts (email, success)
  VALUES (lower(trim(p_email)), p_success);

  -- On success, clear previous failures for this email
  IF p_success THEN
    DELETE FROM public.login_attempts
    WHERE email = lower(trim(p_email))
      AND success = false;
  END IF;

  RETURN public.check_login_lockout(p_email);
END;
$$;

-- RLS: No direct access to the table (only via RPCs)
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Grant execute on RPCs to anon (needed before auth)
GRANT EXECUTE ON FUNCTION public.check_login_lockout(text) TO anon;
GRANT EXECUTE ON FUNCTION public.record_login_attempt(text, boolean) TO anon;
