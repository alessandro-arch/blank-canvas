export interface AdminMemberFlat {
  id: string;
  user_id: string;
  organization_id: string;
  role: string;
  is_active: boolean;
  permissions: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

export interface OrgInvite {
  id: string;
  organization_id: string;
  invited_email: string;
  role: string;
  token: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  expires_at: string;
  created_by: string;
  created_at: string;
  accepted_by: string | null;
  accepted_at: string | null;
}

export interface InviteDetails {
  valid: boolean;
  error?: string;
  email?: string;
  role?: string;
  organization_name?: string;
  expires_at?: string;
}
