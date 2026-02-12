import { createContext, useContext, ReactNode } from "react";
import { useOrganization, Organization, OrganizationMember } from "@/hooks/useOrganization";

interface OrganizationContextType {
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

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const organizationData = useOrganization();

  return (
    <OrganizationContext.Provider value={organizationData}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganizationContext(): OrganizationContextType {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error("useOrganizationContext must be used within an OrganizationProvider");
  }
  return context;
}
