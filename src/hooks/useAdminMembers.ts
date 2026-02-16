import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";
import type { OrgMember, OrgInvite } from "@/types/admin-members";

export function useAdminMembers() {
  const { currentOrganization } = useOrganizationContext();
  const { toast } = useToast();
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [invites, setInvites] = useState<OrgInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const orgId = currentOrganization?.id;

  const fetchMembers = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("organization_members")
        .select("*, profiles!organization_members_user_id_fkey(full_name, email, avatar_url)")
        .eq("organization_id", orgId)
        .in("role", ["admin", "owner", "manager"])
        .order("created_at", { ascending: false }) as any;

      if (error) throw error;
      setMembers(data || []);
    } catch (err: any) {
      console.error("Error fetching members:", err);
      // Fallback: fetch without join
      try {
        const { data, error } = await supabase
          .from("organization_members")
          .select("*")
          .eq("organization_id", orgId)
          .in("role", ["admin", "owner", "manager"])
          .order("created_at", { ascending: false });
        if (error) throw error;
        
        // Fetch profiles separately
        const userIds = (data || []).map((m: any) => m.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, email, avatar_url")
          .in("user_id", userIds);
        
        const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
        const membersWithProfiles = (data || []).map((m: any) => ({
          ...m,
          profiles: profileMap.get(m.user_id) || null,
        }));
        setMembers(membersWithProfiles);
      } catch (fallbackErr) {
        console.error("Fallback fetch also failed:", fallbackErr);
      }
    }

    // Fetch pending invites
    try {
      const { data: inviteData } = await supabase
        .from("org_invites")
        .select("*")
        .eq("organization_id", orgId)
        .is("accepted_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false }) as any;
      setInvites(inviteData || []);
    } catch {
      // org_invites may not be in generated types yet
    }

    setLoading(false);
  }, [orgId]);

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
    const { data, error } = await supabase.rpc("create_org_invite", {
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
    return data as { invite_id: string; token: string };
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
