import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";
import type { OrgInvite } from "@/types/admin-members";

export interface AdminMember {
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

export function useAdminMembers() {
  const { currentOrganization } = useOrganizationContext();
  const { toast } = useToast();
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [invites, setInvites] = useState<OrgInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const orgId = currentOrganization?.id;

  const fetchMembers = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      // Use edge function to get members with emails from auth.users
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await supabase.functions.invoke("admin-list-members", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        body: undefined,
      });

      // supabase.functions.invoke doesn't support query params well, so let's use fetch directly
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      const fetchUrl = `${supabaseUrl}/functions/v1/admin-list-members?organization_id=${orgId}&include_inactive=true`;
      const res = await fetch(fetchUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: anonKey,
        },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao buscar membros");
      }

      const { members: fetchedMembers } = await res.json();
      
      // Filter to admin/manager/owner roles only
      const adminMembers = (fetchedMembers || []).filter(
        (m: AdminMember) => ["admin", "owner", "manager"].includes(m.role)
      );
      setMembers(adminMembers);
    } catch (err: any) {
      console.error("Error fetching members via edge function:", err);
      toast({ title: "Erro ao carregar membros", description: err.message, variant: "destructive" });
    }

    // Fetch pending invites (still via direct query - no email data needed)
    try {
      const { data: inviteData } = await (supabase as any)
        .from("org_invites")
        .select("*")
        .eq("organization_id", orgId)
        .is("accepted_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      setInvites((inviteData || []) as OrgInvite[]);
    } catch {
      // org_invites may not be in generated types yet
    }

    setLoading(false);
  }, [orgId, toast]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const updateMemberRole = async (memberId: string, newRole: string) => {
    const { error } = await supabase
      .from("organization_members")
      .update({ role: newRole })
      .eq("id", memberId);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Role atualizada com sucesso" });
    await fetchMembers();
    return true;
  };

  const toggleMemberActive = async (memberId: string, isActive: boolean) => {
    const { error } = await supabase
      .from("organization_members")
      .update({ is_active: isActive } as any)
      .eq("id", memberId);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: isActive ? "Membro reativado" : "Membro desativado" });
    await fetchMembers();
    return true;
  };

  const createInvite = async (email: string, role: string) => {
    if (!orgId) return null;
    const { data, error } = await supabase.rpc("create_org_invite" as any, {
      p_organization_id: orgId,
      p_email: email,
      p_role: role,
    });
    if (error) {
      toast({ title: "Erro ao criar convite", description: error.message, variant: "destructive" });
      return null;
    }
    toast({ title: "Convite criado com sucesso!" });
    await fetchMembers();
    return data as unknown as { invite_id: string; token: string };
  };

  return {
    members,
    invites,
    loading,
    updateMemberRole,
    toggleMemberActive,
    createInvite,
    refreshMembers: fetchMembers,
  };
}
