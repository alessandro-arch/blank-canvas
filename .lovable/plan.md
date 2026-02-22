

# Fix: Auditor access to Grant Terms and Work Plans

## Problem
The auditor can see the tabs for "Termo de Outorga" and "Plano de Trabalho" in the project details dialog, but the data doesn't load because:
1. The database Row Level Security (RLS) policies on `grant_terms` and `work_plans` tables don't include auditor read access
2. The `generate-workplan-signed-url` edge function explicitly blocks non-admin/manager/scholar users

## Changes Required

### 1. Add RLS SELECT policy on `grant_terms` for auditors
- Create a new policy `grant_terms_select_auditor_org_scoped` that allows auditors to SELECT grant terms for scholars within their organization
- Scoped via `organization_members` to ensure multi-tenant isolation

### 2. Add RLS SELECT policy on `work_plans` for auditors
- Create a new policy `work_plans_select_auditor_org` that allows auditors to SELECT work plans within their organization
- Scoped via `organization_id` matching the auditor's active organization memberships

### 3. Update `generate-workplan-signed-url` edge function
- Add `isAuditor` role check (line 75)
- Add org-scoping verification for auditors (similar to the existing manager check)
- Redeploy the edge function

## Technical Details

### RLS Policy for `grant_terms`
```text
CREATE POLICY "grant_terms_select_auditor_org_scoped"
  ON public.grant_terms FOR SELECT
  USING (
    has_role(auth.uid(), 'auditor'::app_role)
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = grant_terms.user_id
      AND p.organization_id IN (SELECT get_user_organizations())
    )
  );
```

### RLS Policy for `work_plans`
```text
CREATE POLICY "work_plans_select_auditor_org"
  ON public.work_plans FOR SELECT
  USING (
    has_role(auth.uid(), 'auditor'::app_role)
    AND organization_id IN (SELECT get_user_organizations())
  );
```

### Edge function update
Add `auditor` to the allowed roles list in the access check, with org-scoping validation identical to the manager pattern.

## Impact
- Auditors will be able to view and download grant terms and work plans for scholars in their organization
- Read-only access only (no INSERT/UPDATE/DELETE policies added)
- No changes needed for admin or manager flows
