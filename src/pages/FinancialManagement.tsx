import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Footer } from '@/components/layout/Footer';
import { AdminBanner } from '@/components/admin/AdminBanner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DollarSign,
  TrendingUp,
  Wallet,
  PiggyBank,
  Receipt,
  BarChart3,
  Calendar,
  Percent,
  Users,
  AlertTriangle,
  GraduationCap,
  Target,
  ShieldAlert,
  Clock,
  Activity,
} from 'lucide-react';
import { differenceInMonths, format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

// Generate month options for period filter (last 24 months + next 12)
function generatePeriodOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = -24; i <= 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    options.push({
      value: format(d, 'yyyy-MM'),
      label: format(d, "MMMM 'de' yyyy", { locale: ptBR }),
    });
  }
  return options;
}

const periodOptions = generatePeriodOptions();

export default function FinancialManagement() {
  const isMobile = useIsMobile();
  const { currentOrganization } = useOrganizationContext();
  const orgId = currentOrganization?.id;
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedSponsor, setSelectedSponsor] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');

  // ── Data fetching (scoped to current organization) ──

  const { data: projects, isLoading: loadingProjects } = useQuery({
    queryKey: ['financial-thematic-projects', orgId],
    queryFn: async () => {
      let query = supabase
        .from('thematic_projects')
        .select('id, title, sponsor_name, status, start_date, end_date, valor_total_projeto, taxa_administrativa_percentual, impostos_percentual, atribuicao_modo, valor_total_atribuido_bolsas_manual')
        .order('title');
      if (orgId) {
        query = query.eq('organization_id', orgId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  const { data: subprojects } = useQuery({
    queryKey: ['financial-subprojects-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, thematic_project_id, valor_mensal, status');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: enrollmentsData } = useQuery({
    queryKey: ['financial-enrollments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select('id, project_id, user_id, status, total_installments');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: paymentsData } = useQuery({
    queryKey: ['financial-payments-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('enrollment_id, amount, status, reference_month');
      if (error) throw error;
      return data || [];
    },
  });

  // ── Derived data maps ──

  const sponsors = useMemo(() => {
    if (!projects) return [];
    return [...new Set(projects.map(p => p.sponsor_name))].sort();
  }, [projects]);

  const enrollToProject = useMemo(() => {
    const map: Record<string, string> = {};
    enrollmentsData?.forEach(e => { map[e.id] = e.project_id; });
    return map;
  }, [enrollmentsData]);

  const projectToThematic = useMemo(() => {
    const map: Record<string, string> = {};
    subprojects?.forEach(s => { map[s.id] = s.thematic_project_id; });
    return map;
  }, [subprojects]);

  // ── Filtering ──

  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    let result = projects;
    if (selectedProjectId !== 'all') {
      result = result.filter(p => p.id === selectedProjectId);
    }
    if (selectedSponsor !== 'all') {
      result = result.filter(p => p.sponsor_name === selectedSponsor);
    }
    return result;
  }, [projects, selectedProjectId, selectedSponsor]);

  const filteredThematicIds = useMemo(() => new Set(filteredProjects.map(p => p.id)), [filteredProjects]);

  // Period-filtered payments
  const filteredPayments = useMemo(() => {
    if (!paymentsData) return [];
    let result = paymentsData.filter(p => {
      const projectId = enrollToProject[p.enrollment_id];
      const thematicId = projectId ? projectToThematic[projectId] : null;
      return thematicId && filteredThematicIds.has(thematicId);
    });
    if (selectedPeriod !== 'all') {
      result = result.filter(p => p.reference_month === selectedPeriod);
    }
    return result;
  }, [paymentsData, enrollToProject, projectToThematic, filteredThematicIds, selectedPeriod]);

  // ── Aggregated KPIs ──

  const agg = useMemo(() => {
    // ── Estrutura financeira padronizada ──
    // teto_projeto = valor aprovado pelo financiador
    const tetoProjeto = filteredProjects.reduce((s, p) => s + (p.valor_total_projeto || 0), 0);

    // encargos_previstos = ISS + taxa administrativa (sobre o teto)
    const totalTaxaAdmin = filteredProjects.reduce((s, p) => s + ((p.valor_total_projeto || 0) * (p.taxa_administrativa_percentual || 0) / 100), 0);
    const totalImpostos = filteredProjects.reduce((s, p) => s + ((p.valor_total_projeto || 0) * (p.impostos_percentual || 0) / 100), 0);
    const encargosPrevistos = totalTaxaAdmin + totalImpostos;

    // custo_operacional_bruto = teto_projeto + encargos_previstos (informativo)
    const custoOperacionalBruto = tetoProjeto + encargosPrevistos;

    // teto_bolsas = limite total de bolsas previsto (estimado por subprojetos x duração)
    const tetoBolsas = filteredProjects.reduce((s, p) => {
      if (!p.start_date || !p.end_date) return s;
      try {
        const dur = Math.max(1, differenceInMonths(new Date(p.end_date), new Date(p.start_date)) + 1);
        const subs = (subprojects || []).filter(sp => sp.thematic_project_id === p.id && sp.status === 'active');
        const mensal = subs.reduce((sum, sp) => sum + (sp.valor_mensal || 0), 0);
        return s + mensal * dur;
      } catch { return s; }
    }, 0);

    const totalMensalBolsas = (subprojects || [])
      .filter(s => filteredThematicIds.has(s.thematic_project_id) && s.status === 'active')
      .reduce((s, sp) => s + (sp.valor_mensal || 0), 0);

    // Execução: % comprometido e % executado são sobre o teto do projeto
    const percentComprometido = tetoProjeto > 0 ? (tetoBolsas / tetoProjeto) * 100 : 0;
    const saldoDisponivel = tetoProjeto - tetoBolsas;

    const totalPago = filteredPayments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0);
    const percentExecutado = tetoProjeto > 0 ? (totalPago / tetoProjeto) * 100 : 0;

    // Passivo programado
    const passivoProgramado = filteredPayments.filter(p => p.status === 'pending' || p.status === 'eligible').reduce((s, p) => s + Number(p.amount), 0);

    // Força de trabalho
    const activeEnrollments = (enrollmentsData || []).filter(e => {
      const projectId = e.project_id;
      const thematicId = projectToThematic[projectId];
      return thematicId && filteredThematicIds.has(thematicId) && e.status === 'active';
    });
    const bolsistasAtivos = new Set(activeEnrollments.map(e => e.user_id)).size;
    const bolsasPrevistas = activeEnrollments.reduce((s, e) => s + (e.total_installments || 0), 0);
    const totalActiveSubs = (subprojects || []).filter(s => filteredThematicIds.has(s.thematic_project_id) && s.status === 'active').length;
    const taxaAtivacao = totalActiveSubs > 0 ? (bolsistasAtivos / totalActiveSubs) * 100 : 0;
    const custoMedioBolsista = bolsistasAtivos > 0 ? totalPago / bolsistasAtivos : 0;

    // Risco
    const pagamentosPendentes = filteredPayments.filter(p => p.status === 'pending' || p.status === 'eligible').length;
    const indiceRisco = (() => {
      let score = 0;
      if (percentComprometido > 90) score += 3;
      else if (percentComprometido > 75) score += 1;
      if (saldoDisponivel < 0) score += 3;
      if (pagamentosPendentes > 10) score += 2;
      else if (pagamentosPendentes > 5) score += 1;
      if (taxaAtivacao < 50) score += 1;
      if (score >= 5) return { level: 'Alto', color: 'text-destructive', bgColor: 'bg-destructive/10' };
      if (score >= 3) return { level: 'Médio', color: 'text-warning', bgColor: 'bg-warning/10' };
      return { level: 'Baixo', color: 'text-success', bgColor: 'bg-success/10' };
    })();

    return {
      tetoProjeto,
      tetoBolsas,
      encargosPrevistos,
      custoOperacionalBruto,
      totalTaxaAdmin,
      totalImpostos,
      totalMensalBolsas,
      percentComprometido,
      totalPago,
      percentExecutado,
      saldoDisponivel,
      passivoProgramado,
      bolsistasAtivos,
      bolsasPrevistas,
      taxaAtivacao,
      custoMedioBolsista,
      pagamentosPendentes,
      indiceRisco,
    };
  }, [filteredProjects, filteredPayments, subprojects, enrollmentsData, projectToThematic, filteredThematicIds]);

  const isLoading = loadingProjects;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <AdminBanner />

      <div className="flex-1 flex">
        <Sidebar />

        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                Gestão Financeira
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {currentOrganization?.name ? (
                  <>{currentOrganization.name} — Indicadores consolidados de orçamento, execução e força de trabalho</>
                ) : (
                  <>Indicadores consolidados de orçamento, execução e força de trabalho</>
                )}
              </p>
            </div>

            {/* ── Filtros Globais ── */}
            <Card>
              <CardContent className="p-4">
                <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Período</label>
                    <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                      <SelectTrigger className={isMobile ? 'min-h-[44px]' : ''}>
                        <SelectValue placeholder="Todos os períodos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os períodos</SelectItem>
                        {periodOptions.map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Projeto Temático</label>
                    <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                      <SelectTrigger className={isMobile ? 'min-h-[44px]' : ''}>
                        <SelectValue placeholder="Todos os projetos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os projetos</SelectItem>
                        {projects?.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Financiador</label>
                    <Select value={selectedSponsor} onValueChange={setSelectedSponsor}>
                      <SelectTrigger className={isMobile ? 'min-h-[44px]' : ''}>
                        <SelectValue placeholder="Todos os financiadores" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os financiadores</SelectItem>
                        {sponsors.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {(selectedProjectId !== 'all' || selectedSponsor !== 'all' || selectedPeriod !== 'all') && (
                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
                    {selectedProjectId !== 'all' && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        Projeto: {projects?.find(p => p.id === selectedProjectId)?.title?.substring(0, 20)}...
                      </Badge>
                    )}
                    {selectedSponsor !== 'all' && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        Financiador: {selectedSponsor}
                      </Badge>
                    )}
                    {selectedPeriod !== 'all' && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        Período: {periodOptions.find(o => o.value === selectedPeriod)?.label}
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-5 space-y-3">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-3 w-16" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <>
                {/* ═══ Bloco 1: Orçamento ═══ */}
                <section>
                  <SectionHeader icon={<Wallet className="h-4 w-4" />} title="Orçamento" />
                  <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}>
                    <KPICard
                      icon={<Wallet className="h-5 w-5" />}
                      label="Teto do Projeto"
                      value={formatCurrency(agg.tetoProjeto)}
                      subtitle="Valor aprovado pelo financiador"
                      tooltip="Limite financeiro real aprovado em contrato pelo financiador. Todos os indicadores de execução são calculados sobre este valor."
                      iconColor="text-primary"
                    />
                    <KPICard
                      icon={<GraduationCap className="h-5 w-5" />}
                      label="Teto em Bolsas"
                      value={formatCurrency(agg.tetoBolsas)}
                      subtitle={`${agg.percentComprometido.toFixed(1)}% do teto do projeto`}
                      tooltip="Limite total de investimento em capital humano (bolsas). Calculado pela soma mensal das bolsas ativas × duração do projeto."
                      iconColor="text-primary"
                    >
                      <Progress value={Math.min(agg.percentComprometido, 100)} className="mt-2 h-1.5" />
                    </KPICard>
                    <KPICard
                      icon={<Receipt className="h-5 w-5" />}
                      label="Encargos Previstos"
                      value={formatCurrency(agg.encargosPrevistos)}
                      subtitle={`ISS: ${formatCurrency(agg.totalImpostos)} · Tx. Adm.: ${formatCurrency(agg.totalTaxaAdmin)}`}
                      tooltip="Custos tributários e administrativos previstos no contrato (ISS + Taxa Administrativa). Não reduzem o teto do projeto e não geram risco financeiro."
                      iconColor="text-muted-foreground"
                    />
                    <KPICard
                      icon={<PiggyBank className="h-5 w-5" />}
                      label="Custo Operacional Bruto"
                      value={formatCurrency(agg.custoOperacionalBruto)}
                      subtitle="Teto + Encargos (informativo)"
                      tooltip="Soma do teto do projeto com os encargos previstos. Valor apenas informativo que representa o custo total da operação para o financiador."
                      iconColor="text-muted-foreground"
                    />
                  </div>
                </section>

                {/* ═══ Bloco 2: Execução ═══ */}
                <section>
                  <SectionHeader icon={<Activity className="h-4 w-4" />} title="Execução" />
                  <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'}`}>
                    <Card>
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs text-muted-foreground font-medium">% Comprometido</p>
                          <Percent className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className={`text-3xl font-bold ${agg.percentComprometido > 100 ? 'text-destructive' : 'text-foreground'}`}>
                          {agg.percentComprometido.toFixed(1)}%
                        </p>
                        <Progress value={Math.min(agg.percentComprometido, 100)} className="mt-3 h-2" />
                        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                          <span>Encargos: {formatCurrency(agg.encargosPrevistos)}</span>
                          <span>Bolsas: {formatCurrency(agg.tetoBolsas)}</span>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs text-muted-foreground font-medium">% Executado</p>
                          <Target className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-3xl font-bold text-success">
                          {agg.percentExecutado.toFixed(1)}%
                        </p>
                        <Progress value={Math.min(agg.percentExecutado, 100)} className="mt-3 h-2" />
                        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                          <span>Pago: {formatCurrency(agg.totalPago)}</span>
                          <span>Teto: {formatCurrency(agg.tetoProjeto)}</span>
                        </div>
                      </CardContent>
                    </Card>
                    <KPICard
                      icon={<Clock className="h-5 w-5" />}
                      label="Passivo Programado"
                      value={formatCurrency(agg.passivoProgramado)}
                      subtitle={`${agg.pagamentosPendentes} parcela(s) pendente(s)`}
                      iconColor="text-warning"
                    />
                  </div>
                </section>

                {/* ═══ Bloco 3: Força de Trabalho ═══ */}
                <section>
                  <SectionHeader icon={<Users className="h-4 w-4" />} title="Força de Trabalho" />
                  <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}>
                    <KPICard
                      icon={<GraduationCap className="h-5 w-5" />}
                      label="Bolsistas Ativos"
                      value={String(agg.bolsistasAtivos)}
                      iconColor="text-primary"
                    />
                    <KPICard
                      icon={<Calendar className="h-5 w-5" />}
                      label="Bolsas Previstas"
                      value={`${agg.bolsasPrevistas} parcelas`}
                      iconColor="text-info"
                    />
                    <KPICard
                      icon={<Activity className="h-5 w-5" />}
                      label="Taxa de Ativação"
                      value={`${agg.taxaAtivacao.toFixed(0)}%`}
                      subtitle={`${agg.bolsistasAtivos} de ${(subprojects || []).filter(s => filteredThematicIds.has(s.thematic_project_id) && s.status === 'active').length} vagas`}
                      iconColor={agg.taxaAtivacao >= 80 ? 'text-success' : agg.taxaAtivacao >= 50 ? 'text-warning' : 'text-destructive'}
                    >
                      <Progress value={Math.min(agg.taxaAtivacao, 100)} className="mt-2 h-1.5" />
                    </KPICard>
                    <KPICard
                      icon={<DollarSign className="h-5 w-5" />}
                      label="Custo Médio / Bolsista"
                      value={formatCurrency(agg.custoMedioBolsista)}
                      subtitle="Total pago ÷ bolsistas ativos"
                      iconColor="text-muted-foreground"
                    />
                  </div>
                </section>

                {/* ═══ Bloco 4: Risco ═══ */}
                <section>
                  <SectionHeader icon={<ShieldAlert className="h-4 w-4" />} title="Risco" />
                  <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    <Card>
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-xl ${agg.indiceRisco.bgColor}`}>
                            <AlertTriangle className={`h-6 w-6 ${agg.indiceRisco.color}`} />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground font-medium mb-1">Índice de Risco Financeiro</p>
                            <p className={`text-2xl font-bold ${agg.indiceRisco.color}`}>
                              {agg.indiceRisco.level}
                            </p>
                            <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                              <div className="flex justify-between">
                                <span>Comprometimento</span>
                                <span className={agg.percentComprometido > 90 ? 'text-destructive font-medium' : ''}>
                                  {agg.percentComprometido.toFixed(1)}%
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Saldo</span>
                                <span className={agg.saldoDisponivel < 0 ? 'text-destructive font-medium' : ''}>
                                  {formatCurrency(agg.saldoDisponivel)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Taxa de Ativação</span>
                                <span className={agg.taxaAtivacao < 50 ? 'text-warning font-medium' : ''}>
                                  {agg.taxaAtivacao.toFixed(0)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <KPICard
                      icon={<Receipt className="h-5 w-5" />}
                      label="Pagamentos Pendentes"
                      value={String(agg.pagamentosPendentes)}
                      subtitle={`Total: ${formatCurrency(agg.passivoProgramado)}`}
                      iconColor={agg.pagamentosPendentes > 10 ? 'text-destructive' : 'text-warning'}
                    />
                  </div>
                </section>

                {/* ═══ Detalhamento por Projeto ═══ */}
                {filteredProjects.length > 1 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-primary" />
                        Detalhamento por Projeto
                      </CardTitle>
                      <CardDescription>Comparativo financeiro consolidado</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-lg border overflow-auto">
                         <table className="w-full text-sm min-w-[800px]">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="text-left p-3 font-medium">Projeto</th>
                              <th className="text-left p-3 font-medium">Financiador</th>
                              <th className="text-right p-3 font-medium">Teto Projeto</th>
                              <th className="text-right p-3 font-medium">Teto Bolsas</th>
                              <th className="text-right p-3 font-medium">Pago</th>
                              <th className="text-right p-3 font-medium">Saldo</th>
                              <th className="text-center p-3 font-medium">Bolsistas</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredProjects.map(p => {
                              const encargos = ((p.valor_total_projeto || 0) * (p.taxa_administrativa_percentual || 0) / 100) + ((p.valor_total_projeto || 0) * (p.impostos_percentual || 0) / 100);
                              
                              // Calc per-project values
                              const subs = (subprojects || []).filter(s => s.thematic_project_id === p.id && s.status === 'active');
                              const mensal = subs.reduce((sum, s) => sum + (s.valor_mensal || 0), 0);
                              let dur: number | null = null;
                              if (p.start_date && p.end_date) {
                                try { dur = Math.max(1, differenceInMonths(new Date(p.end_date), new Date(p.start_date)) + 1); } catch {}
                              }
                              const tetoBolsasProj = dur ? mensal * dur : 0;
                              const saldo = (p.valor_total_projeto || 0) - tetoBolsasProj;

                              const pago = filteredPayments
                                .filter(pay => {
                                  const pid = enrollToProject[pay.enrollment_id];
                                  return pid && projectToThematic[pid] === p.id && pay.status === 'paid';
                                })
                                .reduce((s, pay) => s + Number(pay.amount), 0);

                              const projEnrollments = (enrollmentsData || []).filter(e => {
                                const thId = projectToThematic[e.project_id];
                                return thId === p.id && e.status === 'active';
                              });
                              const scholars = new Set(projEnrollments.map(e => e.user_id)).size;

                              return (
                                <tr key={p.id} className="border-t hover:bg-muted/30 transition-colors">
                                  <td className="p-3 font-medium max-w-[200px] truncate" title={p.title}>{p.title}</td>
                                  <td className="p-3 text-muted-foreground">{p.sponsor_name}</td>
                                  <td className="p-3 text-right font-mono">{formatCurrency(p.valor_total_projeto || 0)}</td>
                                  <td className="p-3 text-right font-mono">{formatCurrency(tetoBolsasProj)}</td>
                                  <td className="p-3 text-right font-mono">{formatCurrency(pago)}</td>
                                  <td className={`p-3 text-right font-mono font-semibold ${saldo >= 0 ? 'text-success' : 'text-destructive'}`}>
                                    {formatCurrency(saldo)}
                                  </td>
                                  <td className="p-3 text-center">
                                    <Badge variant="outline" className="text-xs">{scholars}</Badge>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}

// ── Sub-components ──

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="text-primary">{icon}</div>
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{title}</h2>
      <Separator className="flex-1" />
    </div>
  );
}

interface KPICardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle?: string;
  tooltip?: string;
  iconColor?: string;
  valueColor?: string;
  children?: React.ReactNode;
}

function KPICard({ icon, label, value, subtitle, tooltip, iconColor = 'text-primary', valueColor, children }: KPICardProps) {
  const content = (
    <Card>
      <CardContent className="p-4 md:p-5">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg bg-muted/50 ${iconColor} flex-shrink-0`}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] md:text-xs text-muted-foreground font-medium leading-tight">{label}</p>
            <p className={`text-lg md:text-xl font-bold mt-0.5 ${valueColor || 'text-foreground'} truncate`}>{value}</p>
            {subtitle && <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5 leading-tight">{subtitle}</p>}
            {children}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div>{content}</div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[250px] text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}
