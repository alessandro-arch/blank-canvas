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
  FolderOpen, 
  Download,
  Building2,
  Calendar
} from 'lucide-react';
import { ThematicProjectCard } from './ThematicProjectCard';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ThematicProjectWithStats, SubprojectWithScholar } from './types';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

type StatusFilter = 'all' | 'active' | 'archived' | 'paused';
type PendencyFilter = 'all' | 'pending_report' | 'under_review' | 'blocked_payment' | 'awaiting_assignment';

export function ProjectsManagement() {
  const currentMonth = format(new Date(), 'yyyy-MM');
  const { currentOrganization } = useOrganizationContext();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sponsorFilter, setSponsorFilter] = useState<string>('all');
  const [pendencyFilter, setPendencyFilter] = useState<PendencyFilter>('all');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  // Fetch all thematic projects with subprojects and stats
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['projects-management', statusFilter, selectedMonth, currentOrganization?.id],
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    queryFn: async () => {
      // Fetch thematic projects filtered by organization
      let thematicQuery = supabase
        .from('thematic_projects')
        .select('*')
        .order('created_at', { ascending: false });

      // Filter by current organization
      if (currentOrganization?.id) {
        thematicQuery = thematicQuery.eq('organization_id', currentOrganization.id);
      }

      if (statusFilter !== 'all') {
        thematicQuery = thematicQuery.eq('status', statusFilter);
      }

      const { data: thematicProjects, error: thematicError } = await thematicQuery;
      if (thematicError) throw thematicError;

      if (!thematicProjects?.length) {
        return { thematicProjects: [], subprojects: [] };
      }

      const thematicIds = thematicProjects.map(p => p.id);

      // Fetch all subprojects (projects)
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .in('thematic_project_id', thematicIds)
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      const projectIds = projectsData?.map(p => p.id) || [];

      // Fetch enrollments with profile info
      let enrollmentsMap: Record<string, { 
        user_id: string; 
        enrollment_id: string;
        status: string; 
        scholar_name: string | null; 
        scholar_email: string | null;
      }> = {};

      if (projectIds.length > 0) {
        const { data: enrollments, error: enrollError } = await supabase
          .from('enrollments')
          .select('id, project_id, user_id, status')
          .in('project_id', projectIds)
          .eq('status', 'active');

        if (enrollError) throw enrollError;

        const userIds = [...new Set(enrollments?.map(e => e.user_id) || [])];

        if (userIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('user_id, full_name, email')
            .in('user_id', userIds);

          if (profilesError) throw profilesError;

          const profilesMap = (profiles || []).reduce((acc, p) => {
            acc[p.user_id] = { name: p.full_name, email: p.email };
            return acc;
          }, {} as Record<string, { name: string | null; email: string | null }>);

          enrollmentsMap = (enrollments || []).reduce((acc, e) => {
            if (!acc[e.project_id]) {
              const profile = profilesMap[e.user_id];
              acc[e.project_id] = {
                user_id: e.user_id,
                enrollment_id: e.id,
                status: e.status,
                scholar_name: profile?.name || null,
                scholar_email: profile?.email || null,
              };
            }
            return acc;
          }, {} as typeof enrollmentsMap);
        }
      }

      // Fetch reports for selected month
      const monthStart = startOfMonth(parseISO(`${selectedMonth}-01`));
      const monthEnd = endOfMonth(monthStart);
      const referenceMonth = format(monthStart, 'yyyy-MM');

      let reportsMap: Record<string, string> = {};
      
      const userIdsWithEnrollments = Object.values(enrollmentsMap).map(e => e.user_id);
      if (userIdsWithEnrollments.length > 0) {
        // Parse selected month into year/month for monthly_reports query
        const [selYear, selMonth] = referenceMonth.split('-').map(Number);

        // Fetch from legacy reports table
        const { data: legacyReports, error: reportsError } = await supabase
          .from('reports')
          .select('user_id, status, reference_month')
          .in('user_id', userIdsWithEnrollments)
          .eq('reference_month', referenceMonth);

        if (!reportsError && legacyReports) {
          legacyReports.forEach(r => {
            reportsMap[r.user_id] = r.status;
          });
        }

        // Fetch from digital monthly_reports table (takes priority)
        const { data: digitalReports, error: digitalError } = await supabase
          .from('monthly_reports')
          .select('beneficiary_user_id, status')
          .in('beneficiary_user_id', userIdsWithEnrollments)
          .eq('period_year', selYear)
          .eq('period_month', selMonth)
          .neq('status', 'draft');

        if (!digitalError && digitalReports) {
          digitalReports.forEach(r => {
            // Digital report status takes priority over legacy
            reportsMap[r.beneficiary_user_id] = r.status === 'submitted' ? 'under_review' : r.status;
          });
        }
      }

      // Fetch payments for selected month
      let paymentsMap: Record<string, { status: string; amount: number }> = {};
      
      const enrollmentIds = Object.values(enrollmentsMap).map(e => e.enrollment_id);
      if (enrollmentIds.length > 0) {
        const { data: payments, error: paymentsError } = await supabase
          .from('payments')
          .select('enrollment_id, status, amount, reference_month')
          .in('enrollment_id', enrollmentIds)
          .eq('reference_month', referenceMonth);

        if (!paymentsError && payments) {
          // Map by enrollment_id
          const enrollmentToProject = Object.entries(enrollmentsMap).reduce((acc, [projectId, enrollment]) => {
            acc[enrollment.enrollment_id] = projectId;
            return acc;
          }, {} as Record<string, string>);

          payments.forEach(p => {
            const projectId = enrollmentToProject[p.enrollment_id];
            if (projectId) {
              paymentsMap[projectId] = { status: p.status, amount: p.amount };
            }
          });
        }
      }

      // Build subprojects with all info
      const subprojects: SubprojectWithScholar[] = (projectsData || []).map(project => {
        const enrollment = enrollmentsMap[project.id];
        const reportStatus = enrollment ? reportsMap[enrollment.user_id] || null : null;
        const paymentInfo = paymentsMap[project.id];

        // Calculate pending/blocked counts
        const pendingReports = reportStatus && ['under_review', 'pending'].includes(reportStatus) ? 1 : 0;
        const blockedPayments = paymentInfo?.status === 'cancelled' ? 1 : 0;
        const releasedAmount = paymentInfo && ['eligible', 'paid'].includes(paymentInfo.status) 
          ? paymentInfo.amount 
          : 0;

        return {
          ...project,
          scholar_name: enrollment?.scholar_name || null,
          scholar_email: enrollment?.scholar_email || null,
          enrollment_id: enrollment?.enrollment_id || null,
          enrollment_status: enrollment?.status || null,
          enrollment_total_installments: null,
          enrollment_paid_installments: null,
          enrollment_replaced_by: null,
          user_id: enrollment?.user_id || null,
          report_status: reportStatus,
          payment_status: paymentInfo?.status || null,
          pending_reports: pendingReports,
          blocked_payments: blockedPayments,
          released_amount: releasedAmount,
        };
      });

      // Build thematic projects with stats
      const thematicWithStats: ThematicProjectWithStats[] = thematicProjects.map(tp => {
        const tpSubprojects = subprojects.filter(s => s.thematic_project_id === tp.id);
        const activeSubprojects = tpSubprojects.filter(s => s.status === 'active');
        
        return {
          ...tp,
          subprojects_count: tpSubprojects.length,
          assigned_scholars_count: tpSubprojects.filter(s => s.scholar_name).length,
          total_monthly_value: activeSubprojects.reduce((sum, s) => sum + (s.valor_mensal || 0), 0),
        };
      });

      return { thematicProjects: thematicWithStats, subprojects };
    },
  });

  // Get unique sponsors for filter
  const sponsors = useMemo(() => {
    return [...new Set(data?.thematicProjects?.map(p => p.sponsor_name) || [])];
  }, [data?.thematicProjects]);

  // Filter thematic projects and their subprojects
  const filteredData = useMemo(() => {
    if (!data) return { thematicProjects: [], subprojectsByThematic: {} };

    const searchLower = searchTerm.toLowerCase();

    // Filter subprojects first
    let filteredSubprojects = data.subprojects.filter(s => {
      const matchesSearch = 
        s.code.toLowerCase().includes(searchLower) ||
        s.title.toLowerCase().includes(searchLower) ||
        (s.scholar_name?.toLowerCase().includes(searchLower) ?? false);
      
      let matchesPendency = true;
      switch (pendencyFilter) {
        case 'pending_report':
          matchesPendency = s.report_status === 'pending' || !s.report_status;
          break;
        case 'under_review':
          matchesPendency = s.report_status === 'under_review';
          break;
        case 'blocked_payment':
          matchesPendency = s.payment_status === 'cancelled';
          break;
        case 'awaiting_assignment':
          matchesPendency = !s.scholar_name && s.status === 'active';
          break;
      }

      return matchesSearch && matchesPendency;
    });

    // Group subprojects by thematic project
    const subprojectsByThematic = filteredSubprojects.reduce((acc, s) => {
      if (!acc[s.thematic_project_id]) {
        acc[s.thematic_project_id] = [];
      }
      acc[s.thematic_project_id].push(s);
      return acc;
    }, {} as Record<string, SubprojectWithScholar[]>);

    // Filter thematic projects
    let filteredThematic = data.thematicProjects.filter(tp => {
      const matchesSearch = 
        tp.title.toLowerCase().includes(searchLower) ||
        tp.sponsor_name.toLowerCase().includes(searchLower);
      const matchesSponsor = sponsorFilter === 'all' || tp.sponsor_name === sponsorFilter;
      
      // Include thematic if it matches search OR has matching subprojects
      const hasMatchingSubprojects = subprojectsByThematic[tp.id]?.length > 0;
      
      return (matchesSearch || hasMatchingSubprojects) && matchesSponsor;
    });

    return { thematicProjects: filteredThematic, subprojectsByThematic };
  }, [data, searchTerm, sponsorFilter, pendencyFilter]);

  const handleExport = () => {
    if (!filteredData.thematicProjects.length) return;
    
    const headers = ['Projeto Temático', 'Financiador', 'Código', 'Subprojeto', 'Bolsista', 'Modalidade', 'Valor', 'Status'];
    const rows: string[][] = [];

    filteredData.thematicProjects.forEach(tp => {
      const subprojects = filteredData.subprojectsByThematic[tp.id] || [];
      subprojects.forEach(s => {
        rows.push([
          tp.title,
          tp.sponsor_name,
          s.code,
          s.title,
          s.scholar_name || 'Não atribuído',
          s.modalidade_bolsa || '',
          s.valor_mensal.toString(),
          s.status
        ]);
      });
    });

    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gestao-projetos-${selectedMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Generate month options (current and 11 previous months)
  const monthOptions = useMemo(() => {
    const options = [];
    const today = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      options.push({
        value: format(date, 'yyyy-MM'),
        label: format(date, "MMMM 'de' yyyy", { locale: ptBR })
      });
    }
    return options;
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Gestão de Projetos
            </CardTitle>
            <CardDescription>
              Acompanhe projetos temáticos, bolsistas, relatórios e pagamentos
            </CardDescription>
          </div>
          <Button variant="outline" onClick={handleExport} disabled={!filteredData.thematicProjects.length}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, código ou bolsista..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger>
              <SelectValue placeholder="Status do Temático" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="paused">Pausado</SelectItem>
              <SelectItem value="archived">Arquivado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sponsorFilter} onValueChange={setSponsorFilter}>
            <SelectTrigger>
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

          <Select value={pendencyFilter} onValueChange={(v) => setPendencyFilter(v as PendencyFilter)}>
            <SelectTrigger>
              <SelectValue placeholder="Pendências" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as pendências</SelectItem>
              <SelectItem value="pending_report">Relatório pendente</SelectItem>
              <SelectItem value="under_review">Em análise</SelectItem>
              <SelectItem value="blocked_payment">Pagamento bloqueado</SelectItem>
              <SelectItem value="awaiting_assignment">Aguardando atribuição</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Período:</span>
          </div>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            {filteredData.thematicProjects.length} projeto(s) temático(s)
          </span>
        </div>

        {/* Thematic Project Cards */}
        <div className="space-y-4">
          {isLoading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    <Skeleton className="w-12 h-12 rounded-lg" />
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
              <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum projeto temático encontrado</p>
            </div>
          ) : (
            filteredData.thematicProjects.map(tp => (
              <ThematicProjectCard
                key={tp.id}
                project={tp}
                subprojects={filteredData.subprojectsByThematic[tp.id] || []}
                selectedMonth={selectedMonth}
                onRefresh={refetch}
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
