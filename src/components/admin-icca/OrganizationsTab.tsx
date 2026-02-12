import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Building2, Search, MoreHorizontal, Eye, BarChart2, Lock, Unlock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  thematicProjectsCount: number;
  scholarsCount: number;
  pendenciesCount: number;
}

export function OrganizationsTab() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: organizations, isLoading } = useQuery({
    queryKey: ["admin-icca-organizations"],
    queryFn: async (): Promise<OrganizationRow[]> => {
      const { data: orgs, error } = await supabase
        .from("organizations")
        .select("*")
        .order("name");

      if (error) throw error;

      const enrichedOrgs: OrganizationRow[] = [];

      for (const org of orgs || []) {
        // Count thematic projects
        const { count: projectsCount } = await supabase
          .from("thematic_projects")
          .select("id", { count: "exact" })
          .eq("organization_id", org.id)
          .eq("status", "active");

        // Count scholars (profiles in this org)
        const { count: scholarsCount } = await supabase
          .from("profiles")
          .select("id", { count: "exact" })
          .eq("organization_id", org.id)
          .eq("is_active", true);

        // Count pendencies (bank accounts pending + reports under review)
        const { data: profileIds } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("organization_id", org.id);

        let pendencies = 0;
        if (profileIds && profileIds.length > 0) {
          const userIds = profileIds.map(p => p.user_id);
          
          const { count: bankPending } = await supabase
            .from("bank_accounts")
            .select("id", { count: "exact" })
            .in("user_id", userIds)
            .eq("validation_status", "pending");

          const { count: reportsPending } = await supabase
            .from("reports")
            .select("id", { count: "exact" })
            .in("user_id", userIds)
            .eq("status", "under_review");

          pendencies = (bankPending || 0) + (reportsPending || 0);
        }

        enrichedOrgs.push({
          id: org.id,
          name: org.name,
          slug: org.slug,
          is_active: org.is_active,
          created_at: org.created_at,
          thematicProjectsCount: projectsCount || 0,
          scholarsCount: scholarsCount || 0,
          pendenciesCount: pendencies
        });
      }

      return enrichedOrgs;
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("organizations")
        .update({ is_active: isActive })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-icca-organizations"] });
      toast.success(isActive ? "Organização reativada" : "Organização bloqueada");
    },
    onError: () => {
      toast.error("Erro ao atualizar status da organização");
    }
  });

  const filteredOrgs = organizations?.filter(org =>
    org.name.toLowerCase().includes(search.toLowerCase()) ||
    org.slug.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const getStatusBadge = (isActive: boolean, pendencies: number) => {
    if (!isActive) {
      return <Badge variant="destructive">Bloqueada</Badge>;
    }
    if (pendencies > 0) {
      return <Badge className="bg-warning text-warning-foreground">Com Pendências</Badge>;
    }
    return <Badge className="bg-success text-success-foreground">Regular</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organizações
          </CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar organização..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead className="text-center">Projetos Temáticos</TableHead>
                  <TableHead className="text-center">Bolsistas</TableHead>
                  <TableHead className="text-center">Pendências</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrgs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhuma organização encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrgs.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell className="font-medium">{org.name}</TableCell>
                      <TableCell className="text-muted-foreground">{org.slug}</TableCell>
                      <TableCell className="text-center">{org.thematicProjectsCount}</TableCell>
                      <TableCell className="text-center">{org.scholarsCount}</TableCell>
                      <TableCell className="text-center">
                        {org.pendenciesCount > 0 ? (
                          <Badge variant="outline" className="text-warning border-warning">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {org.pendenciesCount}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(org.is_active, org.pendenciesCount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/admin/organizacoes`)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Acessar Dashboard
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <BarChart2 className="h-4 w-4 mr-2" />
                              Visualizar KPIs
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => toggleActiveMutation.mutate({ id: org.id, isActive: !org.is_active })}
                            >
                              {org.is_active ? (
                                <>
                                  <Lock className="h-4 w-4 mr-2" />
                                  Bloquear Organização
                                </>
                              ) : (
                                <>
                                  <Unlock className="h-4 w-4 mr-2" />
                                  Reativar Organização
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
