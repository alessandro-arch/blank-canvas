import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Footer } from '@/components/layout/Footer';
import { AdminBanner } from '@/components/admin/AdminBanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  FolderOpen, 
  Plus, 
  Download,
  Building2,
  Users,
  Briefcase,
  DollarSign,
  MoreHorizontal,
  Edit,
  Archive,
  Trash2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent } from '@/components/ui/card';
import { CreateThematicProjectDialog } from '@/components/thematic-projects/CreateThematicProjectDialog';
import { EditThematicProjectDialog } from '@/components/thematic-projects/EditThematicProjectDialog';
import { ArchiveThematicProjectDialog } from '@/components/thematic-projects/ArchiveThematicProjectDialog';
import { DeleteThematicProjectDialog } from '@/components/thematic-projects/DeleteThematicProjectDialog';
import { format } from 'date-fns';
import { useUserRole } from '@/hooks/useUserRole';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

interface ThematicProjectWithStats {
  id: string;
  title: string;
  sponsor_name: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  subprojects_count: number;
  assigned_scholars_count: number;
  total_monthly_value: number;
}

type StatusFilter = 'all' | 'active' | 'archived';

export default function ThematicProjectsList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin } = useUserRole();
  const { currentOrganization } = useOrganizationContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sponsorFilter, setSponsorFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ThematicProjectWithStats | null>(null);

  // Fetch all thematic projects with stats filtered by organization
  const { data: thematicProjects, isLoading } = useQuery({
    queryKey: ['thematic-projects-list', statusFilter, currentOrganization?.id],
    queryFn: async () => {
      let query = supabase
        .from('thematic_projects')
        .select('*')
        .order('created_at', { ascending: false });

      // Filter by current organization
      if (currentOrganization?.id) {
        query = query.eq('organization_id', currentOrganization.id);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data: projects, error } = await query;
      if (error) throw error;

      // Fetch subprojects for all thematic projects
      const projectIds = projects?.map(p => p.id) || [];
      
      if (projectIds.length === 0) {
        return [];
      }

      const { data: subprojects, error: subError } = await supabase
        .from('projects')
        .select('id, thematic_project_id, valor_mensal')
        .in('thematic_project_id', projectIds);

      if (subError) throw subError;

      // Fetch enrollments for subprojects
      const subprojectIds = subprojects?.map(s => s.id) || [];
      let enrollments: { project_id: string }[] = [];
      
      if (subprojectIds.length > 0) {
        const { data: enrollmentData, error: enrollError } = await supabase
          .from('enrollments')
          .select('project_id')
          .in('project_id', subprojectIds)
          .eq('status', 'active');
        
        if (enrollError) throw enrollError;
        enrollments = enrollmentData || [];
      }

      // Build stats map
      const statsMap: Record<string, {
        subprojects_count: number;
        assigned_scholars_count: number;
        total_monthly_value: number;
      }> = {};

      projectIds.forEach(id => {
        const projectSubprojects = subprojects?.filter(s => s.thematic_project_id === id) || [];
        const projectSubprojectIds = projectSubprojects.map(s => s.id);
        const assignedScholars = enrollments?.filter(e => projectSubprojectIds.includes(e.project_id)) || [];
        
        statsMap[id] = {
          subprojects_count: projectSubprojects.length,
          assigned_scholars_count: assignedScholars.length,
          total_monthly_value: projectSubprojects.reduce((sum, s) => sum + (s.valor_mensal || 0), 0)
        };
      });

      return projects?.map(p => ({
        ...p,
        ...statsMap[p.id]
      })) as ThematicProjectWithStats[];
    }
  });

  // Get unique sponsors for filter
  const sponsors = [...new Set(thematicProjects?.map(p => p.sponsor_name) || [])];

  // Filter projects
  const filteredProjects = thematicProjects?.filter(project => {
    const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.sponsor_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSponsor = sponsorFilter === 'all' || project.sponsor_name === sponsorFilter;
    return matchesSearch && matchesSponsor;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-success text-success-foreground">Ativo</Badge>;
      case 'archived':
        return <Badge variant="outline">Arquivado</Badge>;
      case 'closed':
        return <Badge variant="secondary">Encerrado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleOpenProject = (projectId: string) => {
    navigate(`/admin/projetos-tematicos/${projectId}`);
  };

  const handleEditProject = (project: ThematicProjectWithStats) => {
    setSelectedProject(project);
    setEditDialogOpen(true);
  };

  const handleArchiveProject = (project: ThematicProjectWithStats) => {
    setSelectedProject(project);
    setArchiveDialogOpen(true);
  };

  const handleDeleteProject = (project: ThematicProjectWithStats) => {
    setSelectedProject(project);
    setDeleteDialogOpen(true);
  };

  const handleExport = () => {
    if (!filteredProjects?.length) return;
    
    const headers = ['Título', 'Financiador', 'Status', 'Subprojetos', 'Bolsistas', 'Valor Mensal Total'];
    const rows = filteredProjects.map(p => [
      p.title,
      p.sponsor_name,
      p.status,
      p.subprojects_count.toString(),
      p.assigned_scholars_count.toString(),
      p.total_monthly_value.toString()
    ]);

    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `projetos-tematicos-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleProjectSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['thematic-projects-list'] });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <AdminBanner />
      
      <div className="flex-1 flex">
        <Sidebar />
        
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <FolderOpen className="h-6 w-6 text-primary" />
                  Projetos Temáticos
                </h1>
                <p className="text-muted-foreground mt-1">
                  Gestão de financiadores, temas e subprojetos
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleExport} disabled={!filteredProjects?.length}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Projeto Temático
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título do projeto temático..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={sponsorFilter}
                onValueChange={setSponsorFilter}
              >
                <SelectTrigger className="w-[220px]">
                  <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Financiador" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os financiadores</SelectItem>
                  {sponsors.map(sponsor => (
                    <SelectItem key={sponsor} value={sponsor}>{sponsor}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as StatusFilter)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="archived">Arquivados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Stats */}
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>{filteredProjects?.length ?? 0} projeto(s) temático(s) encontrado(s)</span>
            </div>

            {/* Cards Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-6 w-full" />
                        <Skeleton className="h-4 w-32" />
                        <div className="flex gap-4">
                          <Skeleton className="h-8 w-20" />
                          <Skeleton className="h-8 w-20" />
                          <Skeleton className="h-8 w-20" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : filteredProjects?.length === 0 ? (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum projeto temático encontrado</p>
                </div>
              ) : (
                filteredProjects?.map((project) => (
                  <Card 
                    key={project.id} 
                    className="hover:shadow-md transition-shadow cursor-pointer group"
                    onClick={() => handleOpenProject(project.id)}
                  >
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          {getStatusBadge(project.status)}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditProject(project); }}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar Projeto Temático
                              </DropdownMenuItem>
                              {isAdmin && project.status === 'active' && (
                                <DropdownMenuItem 
                                  onClick={(e) => { e.stopPropagation(); handleArchiveProject(project); }}
                                  className="text-destructive"
                                >
                                  <Archive className="h-4 w-4 mr-2" />
                                  Arquivar
                                </DropdownMenuItem>
                              )}
                              {isAdmin && (
                                <DropdownMenuItem 
                                  onClick={(e) => { e.stopPropagation(); handleDeleteProject(project); }}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Title */}
                        <div>
                          <h3 className="font-semibold text-foreground line-clamp-2 leading-tight mb-2">
                            {project.title}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Building2 className="h-4 w-4" />
                            <span>{project.sponsor_name}</span>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1 text-muted-foreground">
                              <Briefcase className="h-3 w-3" />
                            </div>
                            <p className="text-lg font-semibold text-foreground">{project.subprojects_count}</p>
                            <p className="text-xs text-muted-foreground">Subprojetos</p>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1 text-muted-foreground">
                              <Users className="h-3 w-3" />
                            </div>
                            <p className="text-lg font-semibold text-foreground">{project.assigned_scholars_count}</p>
                            <p className="text-xs text-muted-foreground">Bolsistas</p>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1 text-muted-foreground">
                              <DollarSign className="h-3 w-3" />
                            </div>
                            <p className="text-sm font-semibold text-foreground">{formatCurrency(project.total_monthly_value)}</p>
                            <p className="text-xs text-muted-foreground">Mensal</p>
                          </div>
                        </div>

                        {/* Open Button */}
                        <Button className="w-full" variant="outline">
                          Abrir
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
      
      <Footer />

      {/* Dialogs */}
      <CreateThematicProjectDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleProjectSuccess}
      />

      {selectedProject && (
        <>
          <EditThematicProjectDialog
            project={selectedProject}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            onSuccess={handleProjectSuccess}
          />

          <ArchiveThematicProjectDialog
            project={selectedProject}
            open={archiveDialogOpen}
            onOpenChange={setArchiveDialogOpen}
            onSuccess={handleProjectSuccess}
          />

          <DeleteThematicProjectDialog
            project={selectedProject}
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            onSuccess={handleProjectSuccess}
          />
        </>
      )}
    </div>
  );
}
