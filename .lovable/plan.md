

# Patch: Auditor Onboarding via Membros Admin

## Summary
Adjust the Auditor entry flow so it exclusively uses the "Membros Admin > Convidar Membro" path (already functional), and fix missing pieces: redirect mapping, role labels, and ensure the scholar signup flow does NOT allow auditor creation.

## Current State (already working)
- AddMemberDialog already includes "Auditor" role option
- OrgMemberSignup page collects only Name/Email/Password (no CPF) -- suitable for auditors
- InviteAccept page handles invite token validation and auto-accept
- AuditorProtectedRoute and AuditorDashboard exist
- Auditor login at /auditor/login exists

## Changes Required

### 1. Fix InviteAccept role redirect and label for Auditor
**File:** `src/pages/InviteAccept.tsx`
- Add `auditor: "/auditor/dashboard"` to `roleRedirects` map (currently missing)
- Add "Auditor" to the `roleLabel` mapping in the accepted state so it shows "Auditor" instead of "Proponente"

### 2. Ensure Scholar signup does NOT create auditors
**File:** `src/pages/ScholarSignup.tsx`
- Verify this page only creates `scholar` roles (it should already be the case since it uses invite codes, not org invites). No changes expected, just verification.

### 3. No database changes needed
- The `accept_org_invite` RPC was already updated in a previous migration to handle `auditor` role in both `organization_members` and `user_roles`.
- RLS policies already exclude auditor from `bank_accounts` and `profiles_sensitive`.

### 4. Minor UX polish in InviteAccept for auditor-specific messaging
When an auditor receives an invite and is not logged in, the page currently directs to `/admin/login`. This is correct since the OrgMemberSignup flow also works. No change needed here.

## Technical Details

### InviteAccept.tsx changes
```typescript
// Add auditor to roleRedirects
const roleRedirects: Record<string, string> = {
  admin: "/admin/dashboard",
  manager: "/admin/dashboard",
  reviewer: "/admin/dashboard",
  auditor: "/auditor/dashboard",       // NEW
  beneficiary: "/bolsista/painel",
  proponente: "/bolsista/painel",
};

// Fix roleLabel to include Auditor
const roleLabel = acceptedRole === "admin" ? "Administrador" 
  : acceptedRole === "manager" ? "Gestor" 
  : acceptedRole === "reviewer" ? "Avaliador" 
  : acceptedRole === "auditor" ? "Auditor"   // NEW
  : "Proponente";
```

### Scope
- 1 file modified (InviteAccept.tsx)
- 0 database migrations
- 0 new files

