ALTER TABLE organization_invites
  DROP CONSTRAINT IF EXISTS organization_invites_role_check;
ALTER TABLE organization_invites
  ADD CONSTRAINT organization_invites_role_check
  CHECK (role IN ('admin','manager','reviewer','auditor','beneficiary'));

ALTER TABLE organization_members
  DROP CONSTRAINT IF EXISTS org_members_role_check;
ALTER TABLE organization_members
  ADD CONSTRAINT org_members_role_check
  CHECK (role IN ('admin','manager','reviewer','auditor','beneficiary'));