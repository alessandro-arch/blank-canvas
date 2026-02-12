import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FolderOpen, Search, Eye, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ThematicProjectRow {
  id: string;
  title: string;
  sponsor_name: string;
  status: string;
  organizationName: string;
  organizationId: string;
  subprojectsCount: number;
  scholarsCount: number;
}

export function ThematicProjectsTab() {
  const [search, setSearch] = useState("");
  const [orgFilter, setOrgFilter] = useState<string>("all");
  const [sponsorFilter, setSponsorFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const navigate = useNavigate();

  // Fetch organizations for filter
  const { data: organizations } = useQuery({
    queryKey: ["admin-icca-orgs-filter"],
    queryFn: async () => {
      const { data } = await supabase
        .from("organizations")
        .select("id, name")
        .order("name");
      return data || [];
    }
  });

  // Fetch thematic projects
  const { data: projects, isLoading } = useQuery({
    queryKey: ["admin-icca-thematic-projects"],
    queryFn: async (): Promise<ThematicProjectRow[]> => {
      const { data: thematicProjects, error } = await supabase
        .from("thematic_projects")
        .select(`
          *,
          organizations(id, name)
        `)
        .order("title");

      if (error) throw error;

      const enrichedProjects: ThematicProjectRow[] = [];

      for (const project of thematicProjects || []) {
        // Count subprojects
        const { count: subprojectsCount } = await supabase
          .from("projects")
          .select("id", { count: "exact" })
          .eq("thematic_project_id", project.id);

        // Count scholars (enrollments in subprojects of this thematic project)
        const { data: subprojectIds } = await supabase
          .from("projects")
          .select("id")
          .eq("thematic_project_id", project.id);

        let scholarsCount = 0;
        if (subprojectIds && subprojectIds.length > 0) {
          const { count } = await supabase
            .from("enrollments")
            .select("id", { count: "exact" })
            .in("project_id", subprojectIds.map(p => p.id))
            .eq("status", "active");
          scholarsCount = count || 0;
        }

        enrichedProjects.push({
          id: project.id,
          title: project.title,
          sponsor_name: project.sponsor_name,
          status: project.status,
          organizationName: (project.organizations as any)?.name || "Sem organização",
          organizationId: (project.organizations as any)?.id || "",
          subprojectsCount: subprojectsCount || 0,
          scholarsCount
        });
      }

      return enrichedProjects;
    }
  });

  // Get unique sponsors for filter
  const sponsors = [...new Set(projects?.map(p => p.sponsor_name) || [])].sort();

  // Filter projects
  const filteredProjects = projects?.filter(project => {
    const matchesSearch = 
      project.title.toLowerCase().includes(search.toLowerCase()) ||
      project.sponsor_name.toLowerCase().includes(search.toLowerCase());
    const matchesOrg = orgFilter === "all" || project.organizationId === orgFilter;
    const matchesSponsor = sponsorFilter === "all" || project.sponsor_name === sponsorFilter;
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;

    return matchesSearch && matchesOrg && matchesSponsor && matchesStatus;
  }) || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-success text-success-foreground">Ativo</Badge>;
      case "inactive":
        return <Badge variant="secondary">Inativo</Badge>;
      case "archived":
        return <Badge variant="outline">Arquivado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Projetos Temáticos (Visão ICCA)
          </CardTitle>
          
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar projeto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={orgFilter} onValueChange={setOrgFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Organização" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Organizações</SelectItem>
                {organizations?.map(org => (
                  <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sponsorFilter} onValueChange={setSponsorFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Financiador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Financiadores</SelectItem>
                {sponsors.map(sponsor => (
                  <SelectItem key={sponsor} value={sponsor}>{sponsor}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
                <SelectItem value="archived">Arquivado</SelectItem>
              </SelectContent>
            </Select>
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
                  <TableHead>Organização</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Financiador</TableHead>
                  <TableHead className="text-center">Subprojetos</TableHead>
                  <TableHead className="text-center">Bolsistas</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum projeto temático encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProjects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell>
                        <Badge variant="outline">{project.organizationName}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{project.title}</TableCell>
                      <TableCell className="text-muted-foreground">{project.sponsor_name}</TableCell>
                      <TableCell className="text-center">{project.subprojectsCount}</TableCell>
                      <TableCell className="text-center">{project.scholarsCount}</TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(project.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/admin/projetos-tematicos/${project.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Detalhes
                        </Button>
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
