import { useOrganizationContext } from "@/contexts/OrganizationContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrganizationSwitcherProps {
  collapsed?: boolean;
}

export function OrganizationSwitcher({ collapsed }: OrganizationSwitcherProps) {
  const {
    organizations,
    currentOrganization,
    setCurrentOrganization,
    loading,
  } = useOrganizationContext();

  if (loading || organizations.length <= 1) {
    // Don't show switcher if only one org
    return null;
  }

  if (collapsed) {
    return (
      <div 
        className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mx-auto cursor-pointer"
        title={currentOrganization?.name || "Selecionar organização"}
      >
        <Building2 className="w-4 h-4 text-primary" />
      </div>
    );
  }

  return (
    <Select
      value={currentOrganization?.id || ""}
      onValueChange={(value) => {
        const org = organizations.find((o) => o.id === value);
        if (org) {
          setCurrentOrganization(org);
          // Reload page to refresh data for new org
          window.location.reload();
        }
      }}
    >
      <SelectTrigger className="w-full h-auto p-2 bg-muted/50 border-0 hover:bg-muted">
        <div className="flex items-center gap-2 text-left">
          {currentOrganization?.logo_url ? (
            <img
              src={currentOrganization.logo_url}
              alt={currentOrganization.name}
              className="w-6 h-6 rounded object-cover"
            />
          ) : (
            <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center">
              <Building2 className="w-3 h-3 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">
              {currentOrganization?.name || "Selecionar"}
            </p>
          </div>
          <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {organizations.map((org) => (
          <SelectItem key={org.id} value={org.id}>
            <div className="flex items-center gap-2">
              {org.logo_url ? (
                <img
                  src={org.logo_url}
                  alt={org.name}
                  className="w-5 h-5 rounded object-cover"
                />
              ) : (
                <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center">
                  <Building2 className="w-3 h-3 text-primary" />
                </div>
              )}
              <span>{org.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
