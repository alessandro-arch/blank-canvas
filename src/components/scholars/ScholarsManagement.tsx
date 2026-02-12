import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
  Users, 
  Download,
  Building2,
  RefreshCw,
  Upload,
  Calendar
} from 'lucide-react';
import { ThematicScholarCard } from './ThematicScholarCard';
import { useUserRole } from '@/hooks/useUserRole';
import { getModalityLabel } from '@/lib/modality-labels';
import { cn } from '@/lib/utils';
import type { ThematicProjectWithScholars, ScholarWithProject } from './types';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

type StatusFilter = 'all' | 'active' | 'suspended' | 'completed' | 'cancelled' | 'no_enrollment' | 'inactive';
type OriginFilter = 'all' | 'manual' | 'import';
type PeriodFilter = 'all' | 'today' | '7days' | '30days';

export function ScholarsManagement() {
  const { hasManagerAccess } = useUserRole();
  const { currentOrganization } = useOrganizationContext();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [modalityFilter, setModalityFilter] = useState<string>('all');
  const [sponsorFilter, setSponsorFilter] = useState<string>('all');
  const [originFilter, setOriginFilter] = useState<OriginFilter>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');

  // Fetch all data
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['scholars-management', currentOrganization?.id],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      // Fetch profiles that are scholars (have role = scholar) filtered by organization
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'scholar');

      if (rolesError) throw rolesError;

      const scholarUserIds = rolesData?.map(r => r.user_id) || [];
      
      if (scholarUserIds.length === 0) {
        return { scholars: [], thematicProjects: [] };
      }

      // Fetch profiles for scholars, filtered by organization
      let profilesQuery = supabase
        .from('profiles')
        .select('user_id, full_name, email, cpf, phone, is_active, origin, created_at, organization_id')
        .in('user_id', scholarUserIds);

      // Filter by current organization
      if (currentOrganization?.id) {
        profilesQuery = profilesQuery.eq('organization_id', currentOrganization.id);
      }

      const { data: profiles, error: profilesError } = await profilesQuery;

      if (profilesError) throw profilesError;

      // Fetch enrollments with project and thematic project info
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select(`
          id,
          user_id,
          status,
          modality,
          project_id,
          projects (
            id,
            title,
            code,
            thematic_project_id,
            modalidade_bolsa,
            thematic_projects (
              id,
              title,
              sponsor_name,
              status
            )
          )
        `)
        .in('user_id', scholarUserIds);

      if (enrollmentsError) throw enrollmentsError;

      // Fetch pending reports count
      const { data: reports, error: reportsError } = await supabase
        .from('reports')
        .select('user_id, status')
        .in('user_id', scholarUserIds)
        .eq('status', 'under_review');

      if (reportsError) throw reportsError;

      // Fetch all payments (for paid/total counts and pending count)
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('user_id, status')
        .in('user_id', scholarUserIds);

      if (paymentsError) throw paymentsError;

      // Build lookup maps
      const pendingReportsMap = new Map<string, number>();
      reports?.forEach(r => {
        pendingReportsMap.set(r.user_id, (pendingReportsMap.get(r.user_id) || 0) + 1);
      });

      const pendingPaymentsMap = new Map<string, number>();
      const paidInstallmentsMap = new Map<string, number>();
      const totalInstallmentsMap = new Map<string, number>();
      payments?.forEach(p => {
        totalInstallmentsMap.set(p.user_id, (totalInstallmentsMap.get(p.user_id) || 0) + 1);
        if (p.status === 'pending') {
          pendingPaymentsMap.set(p.user_id, (pendingPaymentsMap.get(p.user_id) || 0) + 1);
        }
        if (p.status === 'paid') {
          paidInstallmentsMap.set(p.user_id, (paidInstallmentsMap.get(p.user_id) || 0) + 1);
        }
      });

      // Map enrollments by user_id (get most recent or active one)
      const enrollmentMap = new Map<string, typeof enrollments[0]>();
      enrollments?.forEach(e => {
        const existing = enrollmentMap.get(e.user_id);
        if (!existing || e.status === 'active') {
          enrollmentMap.set(e.user_id, e);
        }
      });

      // Build scholar data
      const scholars: ScholarWithProject[] = (profiles || []).map(profile => {
        const enrollment = enrollmentMap.get(profile.user_id);
        const project = enrollment?.projects as {
          id: string;
          title: string;
          code: string;
          thematic_project_id: string;
          modalidade_bolsa: string | null;
          thematic_projects: {
            id: string;
            title: string;
            sponsor_name: string;
            status: string;
          } | null;
        } | null;
        
        // Use project's modalidade_bolsa as source of truth
        const modality = project?.modalidade_bolsa || enrollment?.modality || null;
        
        return {
          userId: profile.user_id,
          fullName: profile.full_name,
          email: profile.email,
          cpf: profile.cpf,
          phone: profile.phone,
          isActive: profile.is_active,
          projectId: project?.id || null,
          projectTitle: project?.title || null,
          projectCode: project?.code || null,
          thematicProjectId: project?.thematic_projects?.id || null,
          thematicProjectTitle: project?.thematic_projects?.title || null,
          modality,
          enrollmentStatus: enrollment?.status || null,
          enrollmentId: enrollment?.id || null,
          pendingReports: pendingReportsMap.get(profile.user_id) || 0,
          pendingPayments: pendingPaymentsMap.get(profile.user_id) || 0,
          paidInstallments: paidInstallmentsMap.get(profile.user_id) || 0,
          totalInstallments: totalInstallmentsMap.get(profile.user_id) || 0,
          origin: profile.origin || 'manual',
          createdAt: profile.created_at,
        };
      });

      // Fetch all thematic projects filtered by organization
      let thematicQuery = supabase
        .from('thematic_projects')
        .select('*')
        .order('title');

      if (currentOrganization?.id) {
        thematicQuery = thematicQuery.eq('organization_id', currentOrganization.id);
      }

      const { data: thematicProjects, error: tpError } = await thematicQuery;

      if (tpError) throw tpError;

      // Build thematic projects with stats
      const thematicWithStats: ThematicProjectWithScholars[] = (thematicProjects || []).map(tp => {
        const tpScholars = scholars.filter(s => s.thematicProjectId === tp.id);
        
        return {
          id: tp.id,
          title: tp.title,
          sponsor_name: tp.sponsor_name,
          status: tp.status,
          start_date: tp.start_date,
          end_date: tp.end_date,
          scholars_count: tpScholars.length,
          active_scholars_count: tpScholars.filter(s => s.enrollmentStatus === 'active' && s.isActive).length,
          pending_reports_count: tpScholars.reduce((sum, s) => sum + s.pendingReports, 0),
          pending_payments_count: tpScholars.reduce((sum, s) => sum + s.pendingPayments, 0),
        };
      });

      // Add "unassigned" virtual project for scholars without thematic project
      const unassignedScholars = scholars.filter(s => !s.thematicProjectId);
      if (unassignedScholars.length > 0) {
        thematicWithStats.push({
          id: '__unassigned__',
          title: 'Sem Projeto Temático',
          sponsor_name: 'N/A',
          status: 'active',
          start_date: null,
          end_date: null,
          scholars_count: unassignedScholars.length,
          active_scholars_count: unassignedScholars.filter(s => s.isActive).length,
          pending_reports_count: unassignedScholars.reduce((sum, s) => sum + s.pendingReports, 0),
          pending_payments_count: unassignedScholars.reduce((sum, s) => sum + s.pendingPayments, 0),
        });
      }

      return { scholars, thematicProjects: thematicWithStats };
    },
    enabled: hasManagerAccess,
  });

  // Get unique sponsors and modalities for filters
  const { sponsors, modalities } = useMemo(() => {
    const sponsorSet = new Set(data?.thematicProjects?.map(p => p.sponsor_name).filter(s => s !== 'N/A') || []);
    const modalitySet = new Set(data?.scholars?.map(s => s.modality).filter(Boolean) as string[] || []);
    return {
      sponsors: Array.from(sponsorSet),
      modalities: Array.from(modalitySet),
    };
  }, [data]);

  // Filter scholars
  const filteredData = useMemo(() => {
    if (!data) return { thematicProjects: [], scholarsByThematic: {} };

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000);

    const searchLower = searchTerm.toLowerCase();

    // Filter scholars
    const filteredScholars = data.scholars.filter(scholar => {
      // Search filter
      const matchesSearch = 
        !searchTerm ||
        scholar.fullName?.toLowerCase().includes(searchLower) ||
        scholar.email?.toLowerCase().includes(searchLower) ||
        scholar.cpf?.includes(searchTerm) ||
        scholar.projectTitle?.toLowerCase().includes(searchLower) ||
        scholar.projectCode?.toLowerCase().includes(searchLower);

      // Status filter
      let matchesStatus = true;
      switch (statusFilter) {
        case 'active':
          matchesStatus = scholar.enrollmentStatus === 'active' && scholar.isActive;
          break;
        case 'suspended':
          matchesStatus = scholar.enrollmentStatus === 'suspended';
          break;
        case 'completed':
          matchesStatus = scholar.enrollmentStatus === 'completed';
          break;
        case 'cancelled':
          matchesStatus = scholar.enrollmentStatus === 'cancelled';
          break;
        case 'no_enrollment':
          matchesStatus = !scholar.enrollmentStatus;
          break;
        case 'inactive':
          matchesStatus = !scholar.isActive;
          break;
      }

      // Modality filter
      const matchesModality = modalityFilter === 'all' || scholar.modality === modalityFilter;

      // Origin filter
      const matchesOrigin = originFilter === 'all' || scholar.origin === originFilter;

      // Period filter
      let matchesPeriod = true;
      if (periodFilter !== 'all' && scholar.createdAt) {
        const createdDate = new Date(scholar.createdAt);
        switch (periodFilter) {
          case 'today':
            matchesPeriod = createdDate >= todayStart;
            break;
          case '7days':
            matchesPeriod = createdDate >= sevenDaysAgo;
            break;
          case '30days':
            matchesPeriod = createdDate >= thirtyDaysAgo;
            break;
        }
      }

      return matchesSearch && matchesStatus && matchesModality && matchesOrigin && matchesPeriod;
    });

    // Group scholars by thematic project
    const scholarsByThematic = filteredScholars.reduce((acc, s) => {
      const key = s.thematicProjectId || '__unassigned__';
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(s);
      return acc;
    }, {} as Record<string, ScholarWithProject[]>);

    // Filter thematic projects based on sponsor and whether they have matching scholars
    const filteredThematic = data.thematicProjects.filter(tp => {
      const matchesSponsor = sponsorFilter === 'all' || tp.sponsor_name === sponsorFilter;
      const hasMatchingScholars = scholarsByThematic[tp.id]?.length > 0;
      
      // Also include if thematic project title matches search
      const matchesSearch = tp.title.toLowerCase().includes(searchLower) || 
                           tp.sponsor_name.toLowerCase().includes(searchLower);
      
      return matchesSponsor && (hasMatchingScholars || matchesSearch);
    });

    return { thematicProjects: filteredThematic, scholarsByThematic };
  }, [data, searchTerm, statusFilter, modalityFilter, sponsorFilter, originFilter, periodFilter]);

  // Total counts
  const totalScholars = data?.scholars?.length || 0;
  const filteredCount = Object.values(filteredData.scholarsByThematic).flat().length;

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setModalityFilter('all');
    setSponsorFilter('all');
    setOriginFilter('all');
    setPeriodFilter('all');
  };

  const hasActiveFilters = searchTerm || 
    statusFilter !== 'all' || 
    modalityFilter !== 'all' || 
    sponsorFilter !== 'all' ||
    originFilter !== 'all' ||
    periodFilter !== 'all';

  const handleExport = () => {
    const allScholars = Object.entries(filteredData.scholarsByThematic).flatMap(([tpId, scholars]) => {
      const tp = filteredData.thematicProjects.find(p => p.id === tpId);
      return scholars.map(s => ({
        ...s,
        thematicProjectTitle: tp?.title || 'Sem Projeto Temático',
        sponsorName: tp?.sponsor_name || 'N/A',
      }));
    });

    const headers = ['Projeto Temático', 'Financiador', 'Bolsista', 'Email', 'Subprojeto', 'Código', 'Modalidade', 'Status'];
    const rows = allScholars.map(s => [
      s.thematicProjectTitle,
      s.sponsorName,
      s.fullName || '',
      s.email || '',
      s.projectTitle || '',
      s.projectCode || '',
      s.modality ? getModalityLabel(s.modality) : '',
      s.enrollmentStatus || 'Sem Vínculo',
    ]);

    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bolsistas-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!hasManagerAccess) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Gestão de Bolsistas
            </CardTitle>
            <CardDescription>
              {filteredCount} de {totalScholars} bolsistas • Agrupados por Projeto Temático
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-2"
            >
              <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={filteredCount === 0}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email, CPF ou projeto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="suspended">Suspenso</SelectItem>
              <SelectItem value="completed">Concluído</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
              <SelectItem value="no_enrollment">Sem Vínculo</SelectItem>
              <SelectItem value="inactive">Desativado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={modalityFilter} onValueChange={setModalityFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Modalidade" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">Todas Modalidades</SelectItem>
              {modalities.map((modality) => (
                <SelectItem key={modality} value={modality}>
                  {getModalityLabel(modality)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sponsorFilter} onValueChange={setSponsorFilter}>
            <SelectTrigger>
              <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Financiador" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">Todos os financiadores</SelectItem>
              {sponsors.map(sponsor => (
                <SelectItem key={sponsor} value={sponsor}>{sponsor}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={originFilter} onValueChange={(v) => setOriginFilter(v as OriginFilter)}>
            <SelectTrigger>
              <Upload className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">Todas Origens</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="import">Importação</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Second row of filters */}
        <div className="flex items-center gap-4 flex-wrap">
          <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">Todos os períodos</SelectItem>
              <SelectItem value="today">Cadastrados hoje</SelectItem>
              <SelectItem value="7days">Últimos 7 dias</SelectItem>
              <SelectItem value="30days">Últimos 30 dias</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Limpar filtros
            </Button>
          )}

          <span className="text-sm text-muted-foreground ml-auto">
            {filteredData.thematicProjects.length} projeto(s) temático(s)
          </span>
        </div>

        {/* Thematic Project Cards with Scholars */}
        <div className="space-y-4">
          {isLoading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    <Skeleton className="w-10 h-10 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-6 w-full max-w-lg" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <div className="flex gap-6">
                      <Skeleton className="w-16 h-16" />
                      <Skeleton className="w-16 h-16" />
                      <Skeleton className="w-16 h-16" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : filteredData.thematicProjects.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border rounded-lg">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum bolsista encontrado</p>
              {hasActiveFilters && (
                <Button variant="link" onClick={clearFilters} className="mt-2">
                  Limpar filtros
                </Button>
              )}
            </div>
          ) : (
            filteredData.thematicProjects.map(tp => (
              <ThematicScholarCard
                key={tp.id}
                project={tp}
                scholars={filteredData.scholarsByThematic[tp.id] || []}
                onRefresh={() => refetch()}
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
