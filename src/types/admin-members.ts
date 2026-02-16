export interface OrgMember {
  id: string;
  user_id: string;
  organization_id: string;
  role: string;
  is_active: boolean;
  permissions: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

export interface OrgInvite {
  id: string;
  organization_id: string;
  email: string;
  role: string;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_by: string;
  created_at: string;
}

export interface InviteDetails {
  valid: boolean;
  error?: string;
  email?: string;
  role?: string;
  organization_name?: string;
  expires_at?: string;
}
