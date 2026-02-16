-- Revoke all pending invites for contato@innovago.app so a new one can be created
-- This is a data fix, not a schema change, but we need write access
DO $$
BEGIN
  UPDATE organization_invites 
  SET status = 'revoked' 
  WHERE invited_email = 'contato@innovago.app' 
    AND status = 'pending';
END;
$$;
