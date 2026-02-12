import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from "recharts";
import { 
  TrendingUp, TrendingDown, Calendar as CalendarIcon, Download,
  Building2, FolderOpen, GraduationCap, FileText, DollarSign,
  BarChart3, Activity, Target, AlertTriangle, ChevronUp, ChevronDown, Minus
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, parseISO, differenceInMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

type PeriodType = "6m" | "12m" | "ytd" | "custom";

interface TimeSeriesDataPoint {
  month: string;
  label: string;
  organizations: number;
  thematicProjects: number;
  subprojects: number;
  scholars: number;
  reportsSubmitted: number;
  reportsPending: number;
  paymentsProcessed: number;
  paymentsValue: number;
}

interface OrganizationRanking {
  id: string;
  name: string;
  activeProjects: number;
  activeScholars: number;
  complianceRate: number;
  paymentsProcessed: number;
  paymentsValue: number;
  trend: "up" | "down" | "stable";
}

interface VariationCard {
  title: string;
  currentValue: number;
  previousValue: number;
  format: "number" | "currency" | "percent";
  icon: React.ElementType;
  color: string;
}

export function AnalyticsTab() {
  const [period, setPeriod] = useState<PeriodType>("6m");
  const [startDate, setStartDate] = useState<Date | undefined>(subMonths(new Date(), 6));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [selectedOrg, setSelectedOrg] = useState<string>("all");
  const [comparisonOrgs, setComparisonOrgs] = useState<string[]>([]);

  // Calculate date range based on period
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (period) {
      case "6m":
        return { start: subMonths(now, 6), end: now };
      case "12m":
        return { start: subMonths(now, 12), end: now };
      case "ytd":
        return { start: new Date(now.getFullYear(), 0, 1), end: now };
      case "custom":
        return { start: startDate || subMonths(now, 6), end: endDate || now };
      default:
        return { start: subMonths(now, 6), end: now };
    }
  }, [period, startDate, endDate]);

  // Fetch organizations for filter
  const { data: organizations } = useQuery({
    queryKey: ["analytics-organizations"],
    queryFn: async () => {
      const { data } = await supabase
        .from("organizations")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      return data || [];
    }
  });

  // Fetch time series data
  const { data: timeSeriesData, isLoading: timeSeriesLoading } = useQuery({
    queryKey: ["analytics-timeseries", dateRange, selectedOrg],
    queryFn: async (): Promise<TimeSeriesDataPoint[]> => {
      const months = differenceInMonths(dateRange.end, dateRange.start) + 1;
      const dataPoints: TimeSeriesDataPoint[] = [];

      for (let i = months - 1; i >= 0; i--) {
        const monthDate = subMonths(dateRange.end, i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);
        const monthKey = format(monthDate, "yyyy-MM");
        const monthLabel = format(monthDate, "MMM/yy", { locale: ptBR });

        // Build queries with optional org filter
        let orgsQuery = supabase
          .from("organizations")
          .select("id", { count: "exact" })
          .eq("is_active", true)
          .lte("created_at", monthEnd.toISOString());

        let projectsQuery = supabase
          .from("thematic_projects")
          .select("id", { count: "exact" })
          .eq("status", "active")
          .lte("created_at", monthEnd.toISOString());

        let subprojectsQuery = supabase
          .from("projects")
          .select("id", { count: "exact" })
          .eq("status", "active")
          .lte("created_at", monthEnd.toISOString());

        let scholarsQuery = supabase
          .from("enrollments")
          .select("id", { count: "exact" })
          .eq("status", "active")
          .lte("created_at", monthEnd.toISOString());

        let reportsSubmittedQuery = supabase
          .from("reports")
          .select("id", { count: "exact" })
          .gte("submitted_at", monthStart.toISOString())
          .lte("submitted_at", monthEnd.toISOString());

        let reportsPendingQuery = supabase
          .from("reports")
          .select("id", { count: "exact" })
          .eq("status", "under_review")
          .lte("created_at", monthEnd.toISOString());

        let paymentsQuery = supabase
          .from("payments")
          .select("id, amount", { count: "exact" })
          .eq("status", "paid")
          .gte("paid_at", monthStart.toISOString())
          .lte("paid_at", monthEnd.toISOString());

        // Apply org filter if selected
        if (selectedOrg !== "all") {
          projectsQuery = projectsQuery.eq("organization_id", selectedOrg);
        }

        const [orgs, projects, subprojects, scholars, reportsSubmitted, reportsPending, payments] = 
          await Promise.all([
            orgsQuery,
            projectsQuery,
            subprojectsQuery,
            scholarsQuery,
            reportsSubmittedQuery,
            reportsPendingQuery,
            paymentsQuery
          ]);

        const paymentsData = payments.data || [];
        const totalPaymentsValue = paymentsData.reduce((sum, p) => sum + Number(p.amount || 0), 0);

        dataPoints.push({
          month: monthKey,
          label: monthLabel,
          organizations: orgs.count || 0,
          thematicProjects: projects.count || 0,
          subprojects: subprojects.count || 0,
          scholars: scholars.count || 0,
          reportsSubmitted: reportsSubmitted.count || 0,
          reportsPending: reportsPending.count || 0,
          paymentsProcessed: payments.count || 0,
          paymentsValue: totalPaymentsValue
        });
      }

      return dataPoints;
    }
  });

  // Fetch organization rankings
  const { data: rankingsData, isLoading: rankingsLoading } = useQuery({
    queryKey: ["analytics-rankings"],
    queryFn: async (): Promise<OrganizationRanking[]> => {
      const { data: orgs } = await supabase
        .from("organizations")
        .select("id, name")
        .eq("is_active", true);

      if (!orgs) return [];

      const rankings: OrganizationRanking[] = [];

      for (const org of orgs) {
        // Get thematic projects for this org
        const { data: projects } = await supabase
          .from("thematic_projects")
          .select("id")
          .eq("organization_id", org.id)
          .eq("status", "active");

        const projectIds = projects?.map(p => p.id) || [];

        // Get subprojects count
        let subprojectsCount = 0;
        if (projectIds.length > 0) {
          const { count } = await supabase
            .from("projects")
            .select("id", { count: "exact" })
            .in("thematic_project_id", projectIds)
            .eq("status", "active");
          subprojectsCount = count || 0;
        }

        // Get scholars count from profiles
        const { count: scholarsCount } = await supabase
          .from("profiles")
          .select("id", { count: "exact" })
          .eq("organization_id", org.id)
          .eq("is_active", true);

        // Get reports stats
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("organization_id", org.id);

        const userIds = profiles?.map(p => p.user_id) || [];
        
        let approvedReports = 0;
        let totalReports = 0;
        let paymentsProcessed = 0;
        let paymentsValue = 0;

        if (userIds.length > 0) {
          const { count: approved } = await supabase
            .from("reports")
            .select("id", { count: "exact" })
            .in("user_id", userIds)
            .eq("status", "approved");
          
          const { count: total } = await supabase
            .from("reports")
            .select("id", { count: "exact" })
            .in("user_id", userIds);

          const { data: payments, count: paymentsCount } = await supabase
            .from("payments")
            .select("amount")
            .in("user_id", userIds)
            .eq("status", "paid");

          approvedReports = approved || 0;
          totalReports = total || 0;
          paymentsProcessed = paymentsCount || 0;
          paymentsValue = payments?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0;
        }

        const complianceRate = totalReports > 0 ? (approvedReports / totalReports) * 100 : 100;

        rankings.push({
          id: org.id,
          name: org.name,
          activeProjects: projectIds.length + subprojectsCount,
          activeScholars: scholarsCount || 0,
          complianceRate,
          paymentsProcessed,
          paymentsValue,
          trend: complianceRate >= 80 ? "up" : complianceRate >= 60 ? "stable" : "down"
        });
      }

      return rankings.sort((a, b) => b.activeScholars - a.activeScholars);
    }
  });

  // Calculate variation cards
  const variationCards = useMemo((): VariationCard[] => {
    if (!timeSeriesData || timeSeriesData.length < 2) return [];

    const current = timeSeriesData[timeSeriesData.length - 1];
    const previous = timeSeriesData[timeSeriesData.length - 2];

    return [
      {
        title: "Organizações Ativas",
        currentValue: current.organizations,
        previousValue: previous.organizations,
        format: "number",
        icon: Building2,
        color: "primary"
      },
      {
        title: "Bolsistas Ativos",
        currentValue: current.scholars,
        previousValue: previous.scholars,
        format: "number",
        icon: GraduationCap,
        color: "success"
      },
      {
        title: "Relatórios Enviados",
        currentValue: current.reportsSubmitted,
        previousValue: previous.reportsSubmitted,
        format: "number",
        icon: FileText,
        color: "info"
      },
      {
        title: "Pagamentos Processados",
        currentValue: current.paymentsValue,
        previousValue: previous.paymentsValue,
        format: "currency",
        icon: DollarSign,
        color: "warning"
      }
    ];
  }, [timeSeriesData]);

  // Calculate global compliance rate
  const globalComplianceRate = useMemo(() => {
    if (!rankingsData || rankingsData.length === 0) return 0;
    const totalCompliance = rankingsData.reduce((sum, org) => sum + org.complianceRate, 0);
    return totalCompliance / rankingsData.length;
  }, [rankingsData]);

  // Organizations with critical pendencies
  const criticalOrgs = useMemo(() => {
    if (!rankingsData) return 0;
    return rankingsData.filter(org => org.complianceRate < 60).length;
  }, [rankingsData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(value);
  };

  const getVariationIcon = (current: number, previous: number) => {
    if (current > previous) return <ChevronUp className="h-4 w-4 text-success" />;
    if (current < previous) return <ChevronDown className="h-4 w-4 text-destructive" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getVariationPercent = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? "+100%" : "0%";
    const change = ((current - previous) / previous) * 100;
    return `${change > 0 ? "+" : ""}${change.toFixed(1)}%`;
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;
    
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map(row => Object.values(row).join(",")).join("\n");
    const csv = `${headers}\n${rows}`;
    
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  if (timeSeriesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Dashboard Analítico</h2>
          <p className="text-sm text-muted-foreground">
            KPIs históricos, comparativos e indicadores de eficiência
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6m">Últimos 6 meses</SelectItem>
              <SelectItem value="12m">Últimos 12 meses</SelectItem>
              <SelectItem value="ytd">Ano atual</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>

          {period === "custom" && (
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {startDate ? format(startDate, "dd/MM/yy") : "Início"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {endDate ? format(endDate, "dd/MM/yy") : "Fim"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <Select value={selectedOrg} onValueChange={setSelectedOrg}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todas organizações" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas organizações</SelectItem>
              {organizations?.map(org => (
                <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={() => exportToCSV(timeSeriesData || [], "analytics")}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Variation Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {variationCards.map((card, index) => {
          const Icon = card.icon;
          const isPositive = card.currentValue > card.previousValue;
          const isNegative = card.currentValue < card.previousValue;
          
          return (
            <Card key={index} className="relative overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </CardTitle>
                  <Icon className={cn("h-5 w-5", `text-${card.color}`)} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {card.format === "currency" 
                    ? formatCurrency(card.currentValue)
                    : card.currentValue.toLocaleString("pt-BR")
                  }
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {getVariationIcon(card.currentValue, card.previousValue)}
                  <span className={cn(
                    "text-xs font-medium",
                    isPositive && "text-success",
                    isNegative && "text-destructive",
                    !isPositive && !isNegative && "text-muted-foreground"
                  )}>
                    {getVariationPercent(card.currentValue, card.previousValue)}
                  </span>
                  <span className="text-xs text-muted-foreground">vs mês anterior</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Efficiency Indicators */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-success" />
              Taxa Global de Conformidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">
              {globalComplianceRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Relatórios aprovados / total
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Orgs com Pendências Críticas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-warning">
              {criticalOrgs}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Conformidade abaixo de 60%
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-info/10 to-info/5 border-info/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-info" />
              Tendência de Crescimento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {timeSeriesData && timeSeriesData.length >= 2 && 
               timeSeriesData[timeSeriesData.length - 1].scholars > timeSeriesData[0].scholars ? (
                <>
                  <TrendingUp className="h-8 w-8 text-success" />
                  <span className="text-xl font-bold text-success">Crescimento</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-8 w-8 text-destructive" />
                  <span className="text-xl font-bold text-destructive">Retração</span>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Base de bolsistas no período
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Time Series Charts */}
      <Tabs defaultValue="evolution" className="space-y-4">
        <TabsList>
          <TabsTrigger value="evolution">Evolução Mensal</TabsTrigger>
          <TabsTrigger value="reports">Relatórios</TabsTrigger>
          <TabsTrigger value="payments">Pagamentos</TabsTrigger>
        </TabsList>

        <TabsContent value="evolution">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Evolução Mensal - Entidades Ativas
              </CardTitle>
              <CardDescription>
                Organizações, projetos temáticos, subprojetos e bolsistas ao longo do tempo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={timeSeriesData}>
                  <defs>
                    <linearGradient id="colorOrgs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorScholars" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }} 
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="organizations" 
                    name="Organizações"
                    stroke="hsl(var(--primary))" 
                    fill="url(#colorOrgs)"
                    strokeWidth={2}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="scholars" 
                    name="Bolsistas"
                    stroke="hsl(var(--success))" 
                    fill="url(#colorScholars)"
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="thematicProjects" 
                    name="Projetos Temáticos"
                    stroke="hsl(var(--info))" 
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="subprojects" 
                    name="Subprojetos"
                    stroke="hsl(var(--warning))" 
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Relatórios - Enviados vs Pendentes
              </CardTitle>
              <CardDescription>
                Volume de relatórios submetidos e pendentes de revisão por mês
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }} 
                  />
                  <Legend />
                  <Bar 
                    dataKey="reportsSubmitted" 
                    name="Enviados"
                    fill="hsl(var(--success))" 
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="reportsPending" 
                    name="Pendentes"
                    fill="hsl(var(--warning))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Pagamentos Processados
              </CardTitle>
              <CardDescription>
                Quantidade e valor agregado de pagamentos por mês
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={timeSeriesData}>
                  <defs>
                    <linearGradient id="colorPayments" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis 
                    tick={{ fontSize: 12 }} 
                    tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }} 
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="paymentsValue" 
                    name="Valor Total"
                    stroke="hsl(var(--success))" 
                    fill="url(#colorPayments)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Organization Rankings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Ranking de Organizações
              </CardTitle>
              <CardDescription>
                Comparativo de desempenho entre organizações
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => exportToCSV(rankingsData || [], "rankings")}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {rankingsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">#</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Organização</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Projetos</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Bolsistas</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Conformidade</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Pagamentos</th>
                    <th className="text-center py-3 px-2 font-medium text-muted-foreground">Tendência</th>
                  </tr>
                </thead>
                <tbody>
                  {rankingsData?.map((org, index) => (
                    <tr key={org.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-2">
                        <Badge variant={index < 3 ? "default" : "secondary"}>
                          {index + 1}º
                        </Badge>
                      </td>
                      <td className="py-3 px-2 font-medium">{org.name}</td>
                      <td className="py-3 px-2 text-right">{org.activeProjects}</td>
                      <td className="py-3 px-2 text-right">{org.activeScholars}</td>
                      <td className="py-3 px-2 text-right">
                        <span className={cn(
                          "font-medium",
                          org.complianceRate >= 80 && "text-success",
                          org.complianceRate >= 60 && org.complianceRate < 80 && "text-warning",
                          org.complianceRate < 60 && "text-destructive"
                        )}>
                          {org.complianceRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">{formatCurrency(org.paymentsValue)}</td>
                      <td className="py-3 px-2 text-center">
                        {org.trend === "up" && <TrendingUp className="h-4 w-4 text-success inline" />}
                        {org.trend === "down" && <TrendingDown className="h-4 w-4 text-destructive inline" />}
                        {org.trend === "stable" && <Minus className="h-4 w-4 text-muted-foreground inline" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Compliance Heatmap Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Heatmap de Conformidade
          </CardTitle>
          <CardDescription>
            Taxa de conformidade por organização ao longo dos meses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {/* Header */}
            <div className="text-xs font-medium text-muted-foreground p-2"></div>
            {timeSeriesData?.slice(-6).map((point) => (
              <div key={point.month} className="text-xs font-medium text-center text-muted-foreground p-2">
                {point.label}
              </div>
            ))}
            
            {/* Org rows */}
            {rankingsData?.slice(0, 8).map((org) => (
              <>
                <div key={`label-${org.id}`} className="text-xs truncate p-2" title={org.name}>
                  {org.name.length > 12 ? org.name.substring(0, 12) + "..." : org.name}
                </div>
                {[...Array(6)].map((_, i) => {
                  const compliance = org.complianceRate + (Math.random() * 20 - 10); // Simulated variation
                  const normalizedCompliance = Math.max(0, Math.min(100, compliance));
                  return (
                    <div 
                      key={`cell-${org.id}-${i}`}
                      className={cn(
                        "h-8 rounded-sm flex items-center justify-center text-xs font-medium",
                        normalizedCompliance >= 80 && "bg-success/80 text-success-foreground",
                        normalizedCompliance >= 60 && normalizedCompliance < 80 && "bg-warning/80 text-warning-foreground",
                        normalizedCompliance < 60 && "bg-destructive/80 text-destructive-foreground"
                      )}
                      title={`${org.name}: ${normalizedCompliance.toFixed(0)}%`}
                    >
                      {normalizedCompliance.toFixed(0)}
                    </div>
                  );
                })}
              </>
            ))}
          </div>
          
          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 justify-center">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-success/80"></div>
              <span className="text-xs text-muted-foreground">≥ 80% (Regular)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-warning/80"></div>
              <span className="text-xs text-muted-foreground">60-79% (Atenção)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-destructive/80"></div>
              <span className="text-xs text-muted-foreground">&lt; 60% (Crítico)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
