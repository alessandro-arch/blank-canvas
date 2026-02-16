import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";
import type { AdminMemberFlat, OrgInvite } from "@/types/admin-members";

export function useAdminMembers() {
  const { currentOrganization } = useOrganizationContext();
  const { toast } = useToast();
  const [members, setMembers] = useState<AdminMemberFlat[]>([]);
  const [invites, setInvites] = useState<OrgInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const orgId = currentOrganization?.id;

  const fetchMembers = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const res = await fetch(
        `${supabaseUrl}/functions/v1/admin-list-members?organization_id=${orgId}&include_inactive=true`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: anonKey,
          },
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao buscar membros");
      }

      const { members: fetched } = await res.json();
      setMembers(fetched || []);
    } catch (err: any) {
      console.error("Error fetching members:", err);
      toast({ title: "Erro ao carregar membros", description: err.message, variant: "destructive" });
    }

    // Fetch pending invites
    try {
      const { data } = await (supabase as any)
        .from("organization_invites")
        .select("*")
        .eq("organization_id", orgId)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      setInvites((data || []) as OrgInvite[]);
    } catch {
      // table may not be in generated types yet
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

  const createInvite = async (email: string, role: string, expiresDays: number = 7) => {
    if (!orgId) return null;
    const { data, error } = await supabase.rpc("create_org_invite" as any, {
      p_organization_id: orgId,
      p_email: email,
      p_role: role,
      p_expires_days: expiresDays,
    });
    if (error) {
      toast({ title: "Erro ao criar convite", description: error.message, variant: "destructive" });
      return null;
    }
    toast({ title: "Convite criado com sucesso!" });
    await fetchMembers();
    return data as unknown as { invite_id: string; token: string };
  };

  const revokeInvite = async (inviteId: string) => {
    const { error } = await (supabase as any)
      .from("organization_invites")
      .update({ status: "revoked" })
      .eq("id", inviteId);
    if (error) {
      toast({ title: "Erro ao revogar convite", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Convite revogado" });
    await fetchMembers();
    return true;
  };

  return {
    members,
    invites,
    loading,
    updateMemberRole,
    toggleMemberActive,
    createInvite,
    revokeInvite,
    refreshMembers: fetchMembers,
  };
}
