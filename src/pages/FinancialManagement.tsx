import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Footer } from '@/components/layout/Footer';
import { AdminBanner } from '@/components/admin/AdminBanner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
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
  TrendingDown,
  Wallet,
  PiggyBank,
  Receipt,
  BarChart3,
  Calendar,
  Percent,
  ArrowUpDown,
} from 'lucide-react';
import { differenceInMonths } from 'date-fns';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

interface ProjectFinancials {
  id: string;
  title: string;
  sponsor_name: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  valor_total_projeto: number;
  taxa_administrativa_percentual: number;
  impostos_percentual: number;
  atribuicao_modo: string;
  valor_total_atribuido_bolsas_manual: number | null;
  // computed
  totalMensalBolsas: number;
  totalPago: number;
  duracaoMeses: number | null;
}

export default function FinancialManagement() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');

  // Fetch all thematic projects
  const { data: projects, isLoading: loadingProjects } = useQuery({
    queryKey: ['financial-thematic-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('thematic_projects')
        .select('id, title, sponsor_name, status, start_date, end_date, valor_total_projeto, taxa_administrativa_percentual, impostos_percentual, atribuicao_modo, valor_total_atribuido_bolsas_manual')
        .order('title');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all active subprojects with valor_mensal
  const { data: subprojects } = useQuery({
    queryKey: ['financial-subprojects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, thematic_project_id, valor_mensal, status')
        .eq('status', 'active');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch paid payments grouped by enrollment -> project
  const { data: payments } = useQuery({
    queryKey: ['financial-payments'],
    queryFn: async () => {
      // Get all enrollments
      const { data: enrollments, error: eErr } = await supabase
        .from('enrollments')
        .select('id, project_id');
      if (eErr) throw eErr;

      if (!enrollments?.length) return {};

      const { data: paidData, error: pErr } = await supabase
        .from('payments')
        .select('enrollment_id, amount, status')
        .eq('status', 'paid');
      if (pErr) throw pErr;

      // Map enrollment_id -> project_id
      const enrollToProject: Record<string, string> = {};
      enrollments.forEach(e => { enrollToProject[e.id] = e.project_id; });

      // Aggregate paid by thematic_project_id (via subproject lookup)
      // We need subprojects to map project_id -> thematic_project_id
      const { data: allSubs } = await supabase
        .from('projects')
        .select('id, thematic_project_id');

      const projectToThematic: Record<string, string> = {};
      allSubs?.forEach(s => { projectToThematic[s.id] = s.thematic_project_id; });

      const paidByThematic: Record<string, number> = {};
      paidData?.forEach(p => {
        const projectId = enrollToProject[p.enrollment_id];
        const thematicId = projectId ? projectToThematic[projectId] : null;
        if (thematicId) {
          paidByThematic[thematicId] = (paidByThematic[thematicId] || 0) + Number(p.amount);
        }
      });

      // Also pending payments
      const { data: pendingData } = await supabase
        .from('payments')
        .select('enrollment_id, amount, status')
        .in('status', ['pending', 'eligible']);

      const pendingByThematic: Record<string, number> = {};
      pendingData?.forEach(p => {
        const projectId = enrollToProject[p.enrollment_id];
        const thematicId = projectId ? projectToThematic[projectId] : null;
        if (thematicId) {
          pendingByThematic[thematicId] = (pendingByThematic[thematicId] || 0) + Number(p.amount);
        }
      });

      return { paid: paidByThematic, pending: pendingByThematic };
    },
  });

  // Compute financials per project
  const projectFinancials: ProjectFinancials[] = useMemo(() => {
    if (!projects || !subprojects) return [];

    return projects.map(proj => {
      const subs = subprojects.filter(s => s.thematic_project_id === proj.id);
      const totalMensalBolsas = subs.reduce((sum, s) => sum + (s.valor_mensal || 0), 0);

      let duracaoMeses: number | null = null;
      if (proj.start_date && proj.end_date) {
        try {
          duracaoMeses = Math.max(1, differenceInMonths(new Date(proj.end_date), new Date(proj.start_date)) + 1);
        } catch { duracaoMeses = null; }
      }

      const totalPago = (payments as any)?.paid?.[proj.id] || 0;

      return {
        ...proj,
        valor_total_projeto: proj.valor_total_projeto || 0,
        taxa_administrativa_percentual: proj.taxa_administrativa_percentual || 0,
        impostos_percentual: proj.impostos_percentual || 0,
        totalMensalBolsas,
        totalPago,
        duracaoMeses,
      };
    });
  }, [projects, subprojects, payments]);

  // Filter
  const filtered = selectedProjectId === 'all'
    ? projectFinancials
    : projectFinancials.filter(p => p.id === selectedProjectId);

  // Aggregate
  const agg = useMemo(() => {
    const orcamentoTotal = filtered.reduce((s, p) => s + p.valor_total_projeto, 0);
    const totalMensalBolsas = filtered.reduce((s, p) => s + p.totalMensalBolsas, 0);

    const totalTaxaAdmin = filtered.reduce((s, p) => s + (p.valor_total_projeto * p.taxa_administrativa_percentual / 100), 0);
    const totalImpostos = filtered.reduce((s, p) => s + (p.valor_total_projeto * p.impostos_percentual / 100), 0);
    const custoTotalEncargos = totalTaxaAdmin + totalImpostos;

    const totalEstimadoBolsas = filtered.reduce((s, p) => {
      if (!p.duracaoMeses) return s;
      return s + (p.totalMensalBolsas * p.duracaoMeses);
    }, 0);

    const comprometido = totalEstimadoBolsas + custoTotalEncargos;
    const percentComprometido = orcamentoTotal > 0 ? (comprometido / orcamentoTotal) * 100 : 0;

    const totalPago = filtered.reduce((s, p) => s + p.totalPago, 0);
    const percentExecutado = orcamentoTotal > 0 ? (totalPago / orcamentoTotal) * 100 : 0;

    const saldoDisponivel = orcamentoTotal - comprometido;

    const passivoProgramado = filtered.reduce((s, p) => {
      return s + ((payments as any)?.pending?.[p.id] || 0);
    }, 0);

    return {
      orcamentoTotal,
      totalMensalBolsas,
      totalTaxaAdmin,
      totalImpostos,
      custoTotalEncargos,
      totalEstimadoBolsas,
      comprometido,
      percentComprometido,
      totalPago,
      percentExecutado,
      saldoDisponivel,
      passivoProgramado,
    };
  }, [filtered, payments]);

  const isLoading = loadingProjects;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <AdminBanner />

      <div className="flex-1 flex">
        <Sidebar />

        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-primary" />
                Gestão Financeira
              </h1>
              <p className="text-muted-foreground mt-1">
                Visão consolidada de orçamento, encargos e execução financeira
              </p>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-4">
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="w-[320px]">
                  <SelectValue placeholder="Filtrar por projeto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Projetos Temáticos</SelectItem>
                  {projects?.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedProjectId !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  1 projeto selecionado
                </Badge>
              )}
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6 space-y-3">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-8 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <>
                {/* Row 1: Orçamento & Encargos */}
                <div>
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Orçamento & Encargos
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <KPICard
                      icon={<Wallet className="h-5 w-5" />}
                      label="Orçamento Total"
                      value={formatCurrency(agg.orcamentoTotal)}
                      iconColor="text-primary"
                    />
                    <KPICard
                      icon={<Receipt className="h-5 w-5" />}
                      label="Taxa Administrativa"
                      value={formatCurrency(agg.totalTaxaAdmin)}
                      iconColor="text-warning"
                    />
                    <KPICard
                      icon={<Percent className="h-5 w-5" />}
                      label="Impostos"
                      value={formatCurrency(agg.totalImpostos)}
                      iconColor="text-warning"
                    />
                    <KPICard
                      icon={<DollarSign className="h-5 w-5" />}
                      label="Custo Total com Encargos"
                      value={formatCurrency(agg.custoTotalEncargos)}
                      subtitle={`${agg.orcamentoTotal > 0 ? ((agg.custoTotalEncargos / agg.orcamentoTotal) * 100).toFixed(1) : 0}% do orçamento`}
                      iconColor="text-destructive"
                    />
                  </div>
                </div>

                {/* Row 2: Comprometimento & Execução */}
                <div>
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Comprometimento & Execução
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <KPICard
                      icon={<TrendingUp className="h-5 w-5" />}
                      label="Comprometimento Financeiro"
                      value={formatCurrency(agg.comprometido)}
                      subtitle={`${agg.percentComprometido.toFixed(1)}% do orçamento`}
                      iconColor="text-primary"
                    >
                      <Progress value={Math.min(agg.percentComprometido, 100)} className="mt-2 h-2" />
                    </KPICard>

                    <KPICard
                      icon={<DollarSign className="h-5 w-5" />}
                      label="Execução Financeira"
                      value={formatCurrency(agg.totalPago)}
                      subtitle={`${agg.percentExecutado.toFixed(1)}% executado`}
                      iconColor="text-success"
                    >
                      <Progress value={Math.min(agg.percentExecutado, 100)} className="mt-2 h-2" />
                    </KPICard>

                    <KPICard
                      icon={<PiggyBank className="h-5 w-5" />}
                      label="Saldo Disponível"
                      value={formatCurrency(agg.saldoDisponivel)}
                      iconColor={agg.saldoDisponivel >= 0 ? 'text-success' : 'text-destructive'}
                      valueColor={agg.saldoDisponivel >= 0 ? 'text-success' : 'text-destructive'}
                    />

                    <KPICard
                      icon={<Calendar className="h-5 w-5" />}
                      label="Passivo Programado"
                      value={formatCurrency(agg.passivoProgramado)}
                      subtitle="Pagamentos pendentes/elegíveis"
                      iconColor="text-warning"
                    />
                  </div>
                </div>

                {/* Per-project breakdown */}
                {filtered.length > 1 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Detalhamento por Projeto</CardTitle>
                      <CardDescription>Comparativo financeiro entre projetos temáticos</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-lg border overflow-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="text-left p-3 font-medium">Projeto</th>
                              <th className="text-right p-3 font-medium">Orçamento</th>
                              <th className="text-right p-3 font-medium">Encargos</th>
                              <th className="text-right p-3 font-medium">Est. Bolsas</th>
                              <th className="text-right p-3 font-medium">Pago</th>
                              <th className="text-right p-3 font-medium">Saldo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filtered.map(p => {
                              const encargos = (p.valor_total_projeto * p.taxa_administrativa_percentual / 100) + (p.valor_total_projeto * p.impostos_percentual / 100);
                              const estBolsas = p.duracaoMeses ? p.totalMensalBolsas * p.duracaoMeses : 0;
                              const comprometido = estBolsas + encargos;
                              const saldo = p.valor_total_projeto - comprometido;
                              return (
                                <tr key={p.id} className="border-t">
                                  <td className="p-3 font-medium">{p.title}</td>
                                  <td className="p-3 text-right font-mono">{formatCurrency(p.valor_total_projeto)}</td>
                                  <td className="p-3 text-right font-mono">{formatCurrency(encargos)}</td>
                                  <td className="p-3 text-right font-mono">{formatCurrency(estBolsas)}</td>
                                  <td className="p-3 text-right font-mono">{formatCurrency(p.totalPago)}</td>
                                  <td className={`p-3 text-right font-mono font-semibold ${saldo >= 0 ? 'text-success' : 'text-destructive'}`}>
                                    {formatCurrency(saldo)}
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

interface KPICardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle?: string;
  iconColor?: string;
  valueColor?: string;
  children?: React.ReactNode;
}

function KPICard({ icon, label, value, subtitle, iconColor = 'text-primary', valueColor, children }: KPICardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg bg-muted/50 ${iconColor}`}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium">{label}</p>
            <p className={`text-xl font-bold mt-1 ${valueColor || 'text-foreground'}`}>{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
            {children}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
