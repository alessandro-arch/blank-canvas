import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  watermark_text: string | null;
  report_footer_text: string | null;
  settings: unknown;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: "owner" | "admin" | "manager" | "member";
  created_at: string;
  updated_at: string;
}

interface UseOrganizationReturn {
  organizations: Organization[];
  currentOrganization: Organization | null;
  currentMembership: OrganizationMember | null;
  loading: boolean;
  error: string | null;
  setCurrentOrganization: (org: Organization) => void;
  refreshOrganizations: () => Promise<void>;
  isOwner: boolean;
  isOrgAdmin: boolean;
  isOrgManager: boolean;
  canManageOrg: boolean;
}

const CURRENT_ORG_KEY = "bolsa_conecta_current_org";

export function useOrganization(): UseOrganizationReturn {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrganization, setCurrentOrganizationState] = useState<Organization | null>(null);
  const [currentMembership, setCurrentMembership] = useState<OrganizationMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrganizations = useCallback(async () => {
    if (!user) {
      setOrganizations([]);
      setCurrentOrganizationState(null);
      setCurrentMembership(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch organizations the user is a member of
      const { data: memberships, error: membershipError } = await supabase
        .from("organization_members")
        .select(`
          id,
          organization_id,
          user_id,
          role,
          created_at,
          updated_at,
          organizations (
            id,
            name,
            slug,
            logo_url,
            settings,
            is_active,
            created_at,
            updated_at
          )
        `)
        .eq("user_id", user.id);

      if (membershipError) throw membershipError;

      const orgs: Organization[] = [];
      const membershipMap = new Map<string, OrganizationMember>();

      memberships?.forEach((m) => {
        const org = m.organizations as unknown as Organization;
        if (org && org.is_active) {
          orgs.push(org);
          membershipMap.set(org.id, {
            id: m.id,
            organization_id: m.organization_id,
            user_id: m.user_id,
            role: m.role as "owner" | "admin" | "manager" | "member",
            created_at: m.created_at,
            updated_at: m.updated_at,
          });
        }
      });

      setOrganizations(orgs);

      // Try to restore saved organization or use first one
      const savedOrgId = localStorage.getItem(CURRENT_ORG_KEY);
      let selectedOrg = orgs.find((o) => o.id === savedOrgId);
      
      if (!selectedOrg && orgs.length > 0) {
        selectedOrg = orgs[0];
      }

      if (selectedOrg) {
        setCurrentOrganizationState(selectedOrg);
        setCurrentMembership(membershipMap.get(selectedOrg.id) || null);
        localStorage.setItem(CURRENT_ORG_KEY, selectedOrg.id);
      }
    } catch (err: unknown) {
      console.error("Error fetching organizations:", err);
      setError(err instanceof Error ? err.message : "Erro ao carregar organizações");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const setCurrentOrganization = useCallback((org: Organization) => {
    setCurrentOrganizationState(org);
    localStorage.setItem(CURRENT_ORG_KEY, org.id);
    
    // Update membership for new org
    if (user) {
      supabase
        .from("organization_members")
        .select("*")
        .eq("organization_id", org.id)
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setCurrentMembership(data as OrganizationMember);
          }
        });
    }
  }, [user]);

  const isOwner = currentMembership?.role === "owner";
  const isOrgAdmin = currentMembership?.role === "admin" || isOwner;
  const isOrgManager = currentMembership?.role === "manager" || isOrgAdmin;
  const canManageOrg = isOrgAdmin;

  return {
    organizations,
    currentOrganization,
    currentMembership,
    loading,
    error,
    setCurrentOrganization,
    refreshOrganizations: fetchOrganizations,
    isOwner,
    isOrgAdmin,
    isOrgManager,
    canManageOrg,
  };
}
