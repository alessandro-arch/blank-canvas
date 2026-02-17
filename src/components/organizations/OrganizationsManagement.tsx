import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Plus, Settings, Users, Loader2, Crown, Shield, UserCog } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CreateOrganizationDialog } from "./CreateOrganizationDialog";
import { EditOrganizationDialog } from "./EditOrganizationDialog";
import { OrganizationMembersDialog } from "./OrganizationMembersDialog";
import type { Organization } from "@/hooks/useOrganization";

interface OrganizationWithStats {
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
  member_count?: number;
  project_count?: number;
}

export function OrganizationsManagement() {
  const { isAdmin } = useUserRole();
  const { currentOrganization, canManageOrg, refreshOrganizations } = useOrganizationContext();
  const [organizations, setOrganizations] = useState<OrganizationWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      
      const { data: orgs, error } = await supabase
        .from("organizations")
        .select("*")
        .order("name");

      if (error) throw error;

      // Fetch stats for each org
      const orgsWithStats: OrganizationWithStats[] = await Promise.all(
        (orgs || []).map(async (org) => {
          const [membersResult, projectsResult] = await Promise.all([
            supabase
              .from("organization_members")
              .select("id", { count: "exact", head: true })
              .eq("organization_id", org.id),
            supabase
              .from("thematic_projects")
              .select("id", { count: "exact", head: true })
              .eq("organization_id", org.id),
          ]);

          return {
            ...org,
            member_count: membersResult.count || 0,
            project_count: projectsResult.count || 0,
          };
        })
      );

      setOrganizations(orgsWithStats);
    } catch (err) {
      console.error("Error fetching organizations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const handleEditOrg = (org: Organization) => {
    setSelectedOrg(org);
    setEditDialogOpen(true);
  };

  const handleManageMembers = (org: Organization) => {
    setSelectedOrg(org);
    setMembersDialogOpen(true);
  };

  const handleSuccess = () => {
    fetchOrganizations();
    refreshOrganizations();
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "owner":
        return <Badge className="bg-warning/20 text-warning border-warning/30"><Crown className="w-3 h-3 mr-1" />Proprietário</Badge>;
      case "admin":
        return <Badge className="bg-primary/20 text-primary border-primary/30"><Shield className="w-3 h-3 mr-1" />Admin</Badge>;
      case "manager":
        return <Badge className="bg-info/20 text-info border-info/30"><UserCog className="w-3 h-3 mr-1" />Gestor</Badge>;
      default:
        return <Badge variant="secondary">Membro</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Organizações
            </CardTitle>
            <CardDescription>
              Gerencie as organizações cadastradas na plataforma
            </CardDescription>
          </div>
          {isAdmin && (
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Organização
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {organizations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma organização cadastrada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organização</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead className="text-center">Membros</TableHead>
                  <TableHead className="text-center">Projetos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations.map((org) => (
                  <TableRow 
                    key={org.id}
                    className={currentOrganization?.id === org.id ? "bg-primary/5" : ""}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {org.logo_url ? (
                          <img 
                            src={org.logo_url} 
                            alt={org.name} 
                            className="h-8 w-8 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Building2 className="h-4 w-4 text-primary" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{org.name}</p>
                          {currentOrganization?.id === org.id && (
                            <Badge variant="outline" className="text-xs">Atual</Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{org.slug}</code>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-medium">{org.member_count}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-medium">{org.project_count}</span>
                    </TableCell>
                    <TableCell>
                      {org.is_active ? (
                        <Badge variant="default" className="bg-success/20 text-success border-success/30">
                          Ativa
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inativa</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(org.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleManageMembers(org)}
                          title="Gerenciar membros"
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                        {(isAdmin || canManageOrg) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditOrg(org)}
                            title="Editar organização"
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateOrganizationDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleSuccess}
      />

      {selectedOrg && (
        <>
          <EditOrganizationDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            organization={selectedOrg}
            onSuccess={handleSuccess}
          />
          <OrganizationMembersDialog
            open={membersDialogOpen}
            onOpenChange={setMembersDialogOpen}
            organization={selectedOrg}
            onSuccess={handleSuccess}
          />
        </>
      )}
    </>
  );
}
