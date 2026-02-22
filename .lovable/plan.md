
# Fix: Add 'auditor' to database CHECK constraints

## Problem
When creating an invite with role "Auditor" via Membros Admin, the database rejects the insert because two CHECK constraints don't include 'auditor':

1. `organization_invites_role_check` -- only allows ('admin', 'manager', 'reviewer', 'beneficiary')
2. `org_members_role_check` on `organization_members` -- same list, also missing 'auditor'

## Solution
A single database migration that:

1. Drops and recreates `organization_invites_role_check` to include 'auditor'
2. Drops and recreates `org_members_role_check` to include 'auditor'

```sql
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
```

## What this fixes
- Creating auditor invites from "Membros Admin > Convidar Membro" will work
- Accepting auditor invites (which inserts into organization_members) will work

## No frontend changes needed
All frontend code already supports the auditor role from previous implementation steps.

## Scope
- 1 database migration
- 0 file changes
