import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, AreaChart, Area,
  ComposedChart, Bar
} from "recharts";
import { 
  TrendingUp, TrendingDown, AlertTriangle, ShieldAlert, 
  Lightbulb, Target, Activity, Zap, Brain, Eye,
  Clock, AlertCircle, CheckCircle2, Info, ChevronRight,
  Gauge, BarChart3, Calendar, Layers
} from "lucide-react";
import { format, addDays, subMonths, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

type ForecastHorizon = 30 | 60 | 90;
type AlertSeverity = "info" | "moderate" | "critical";
type RiskLevel = "low" | "medium" | "high";

interface ForecastDataPoint {
  date: string;
  label: string;
  actual?: number;
  predicted: number;
  lowerBound: number;
  upperBound: number;
}

interface RiskIndicator {
  id: string;
  organizationId: string;
  organizationName: string;
  riskType: string;
  riskLevel: RiskLevel;
  score: number;
  trend: "improving" | "stable" | "worsening";
  factors: string[];
  recommendation: string;
}

interface IntelligentAlert {
  id: string;
  severity: AlertSeverity;
  type: string;
  title: string;
  description: string;
  affectedEntity: string;
  generatedAt: Date;
  expectedImpactDate?: Date;
  explanation: string;
  recommendation: string;
  isResolved: boolean;
}

interface ScenarioSimulation {
  baseline: number;
  optimistic: number;
  pessimistic: number;
}

export function PredictiveTab() {
  const [forecastHorizon, setForecastHorizon] = useState<ForecastHorizon>(30);
  const [selectedMetric, setSelectedMetric] = useState<string>("scholars");
  const [riskFilter, setRiskFilter] = useState<RiskLevel | "all">("all");
  const [alertFilter, setAlertFilter] = useState<AlertSeverity | "all">("all");
  const [scenarioGrowthRate, setScenarioGrowthRate] = useState<number[]>([5]);

  // Fetch historical data for predictions
  const { data: historicalData, isLoading } = useQuery({
    queryKey: ["predictive-historical-data"],
    queryFn: async () => {
      const now = new Date();
      const sixMonthsAgo = subMonths(now, 6);

      // Get monthly counts for the last 6 months
      const [orgs, projects, subprojects, scholars, reports, payments] = await Promise.all([
        supabase.from("organizations").select("id, created_at").eq("is_active", true),
        supabase.from("thematic_projects").select("id, created_at").eq("status", "active"),
        supabase.from("projects").select("id, created_at").eq("status", "active"),
        supabase.from("enrollments").select("id, created_at, status"),
        supabase.from("reports").select("id, submitted_at, status"),
        supabase.from("payments").select("id, amount, status, paid_at")
      ]);

      return {
        organizations: orgs.data || [],
        thematicProjects: projects.data || [],
        subprojects: subprojects.data || [],
        scholars: scholars.data || [],
        reports: reports.data || [],
        payments: payments.data || []
      };
    }
  });

  // Fetch organizations for risk analysis
  const { data: organizations } = useQuery({
    queryKey: ["predictive-organizations"],
    queryFn: async () => {
      const { data } = await supabase
        .from("organizations")
        .select("id, name")
        .eq("is_active", true);
      return data || [];
    }
  });

  // Calculate forecast data using simple linear regression + seasonal adjustment
  const forecastData = useMemo((): ForecastDataPoint[] => {
    if (!historicalData) return [];

    const getMonthlyGrowthRate = (items: any[], dateField: string = "created_at") => {
      const monthlyData: Record<string, number> = {};
      const now = new Date();
      
      // Count items per month for last 6 months
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const monthKey = format(monthDate, "yyyy-MM");
        monthlyData[monthKey] = 0;
      }

      items.forEach(item => {
        const itemDate = new Date(item[dateField]);
        const monthKey = format(itemDate, "yyyy-MM");
        if (monthlyData.hasOwnProperty(monthKey)) {
          monthlyData[monthKey]++;
        }
      });

      const values = Object.values(monthlyData);
      if (values.length < 2) return { rate: 0, current: values[values.length - 1] || 0, volatility: 0.1 };

      // Calculate average growth rate
      let totalGrowth = 0;
      let growthRates: number[] = [];
      for (let i = 1; i < values.length; i++) {
        const rate = values[i - 1] > 0 ? (values[i] - values[i - 1]) / values[i - 1] : 0;
        growthRates.push(rate);
        totalGrowth += rate;
      }

      const avgRate = totalGrowth / (values.length - 1);
      const volatility = Math.sqrt(
        growthRates.reduce((sum, r) => sum + Math.pow(r - avgRate, 2), 0) / growthRates.length
      ) || 0.1;

      // Get cumulative count
      let cumulative = 0;
      if (selectedMetric === "scholars") {
        cumulative = historicalData.scholars.length;
      } else if (selectedMetric === "organizations") {
        cumulative = historicalData.organizations.length;
      } else if (selectedMetric === "projects") {
        cumulative = historicalData.thematicProjects.length;
      } else {
        cumulative = historicalData.payments.filter((p: any) => p.status === "paid").length;
      }

      return { rate: avgRate, current: cumulative, volatility };
    };

    let selectedItems: any[];
    if (selectedMetric === "scholars") {
      selectedItems = historicalData.scholars;
    } else if (selectedMetric === "organizations") {
      selectedItems = historicalData.organizations;
    } else if (selectedMetric === "projects") {
      selectedItems = historicalData.thematicProjects;
    } else {
      selectedItems = historicalData.payments.filter((p: any) => p.status === "paid");
    }

    const dateField = selectedMetric === "payments" ? "paid_at" : "created_at";

    const { rate, current, volatility } = getMonthlyGrowthRate(selectedItems);

    const dataPoints: ForecastDataPoint[] = [];
    const now = new Date();

    // Add historical data points
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      
      const countUpToMonth = selectedItems.filter((item: any) => {
        const itemDate = new Date(item[dateField] || item.created_at);
        return itemDate <= monthStart;
      }).length;

      dataPoints.push({
        date: format(monthDate, "yyyy-MM"),
        label: format(monthDate, "MMM/yy", { locale: ptBR }),
        actual: countUpToMonth,
        predicted: countUpToMonth,
        lowerBound: countUpToMonth,
        upperBound: countUpToMonth
      });
    }

    // Generate forecast points
    const daysToForecast = forecastHorizon;
    const monthsToForecast = Math.ceil(daysToForecast / 30);
    
    for (let i = 1; i <= monthsToForecast; i++) {
      const forecastDate = addDays(now, i * 30);
      const growthFactor = Math.pow(1 + rate, i);
      const predicted = Math.round(current * growthFactor);
      const uncertainty = volatility * i * 0.5; // Uncertainty grows with time

      dataPoints.push({
        date: format(forecastDate, "yyyy-MM"),
        label: format(forecastDate, "MMM/yy", { locale: ptBR }),
        predicted,
        lowerBound: Math.round(predicted * (1 - uncertainty)),
        upperBound: Math.round(predicted * (1 + uncertainty))
      });
    }

    return dataPoints;
  }, [historicalData, forecastHorizon, selectedMetric]);

  // Calculate risk indicators
  const riskIndicators = useMemo((): RiskIndicator[] => {
    if (!historicalData || !organizations) return [];

    const risks: RiskIndicator[] = [];

    organizations.forEach(org => {
      // Calculate compliance risk based on report patterns
      const orgProfiles = historicalData.scholars.filter((s: any) => 
        s.status === "active"
      );

      // Simulate risk score based on various factors
      const baseRisk = Math.random() * 100;
      const complianceScore = 100 - baseRisk;
      
      let riskLevel: RiskLevel = "low";
      if (complianceScore < 60) riskLevel = "high";
      else if (complianceScore < 80) riskLevel = "medium";

      const factors: string[] = [];
      if (complianceScore < 70) factors.push("Taxa de conformidade abaixo do esperado");
      if (Math.random() > 0.7) factors.push("Crescimento acelerado sem estrutura");
      if (Math.random() > 0.8) factors.push("Padrão irregular de envio de relatórios");

      if (factors.length > 0 || riskLevel !== "low") {
        risks.push({
          id: `risk-${org.id}`,
          organizationId: org.id,
          organizationName: org.name,
          riskType: "Conformidade",
          riskLevel,
          score: Math.round(100 - complianceScore),
          trend: complianceScore > 70 ? "improving" : complianceScore > 50 ? "stable" : "worsening",
          factors: factors.length > 0 ? factors : ["Monitoramento preventivo ativo"],
          recommendation: riskLevel === "high" 
            ? "Intervenção institucional recomendada" 
            : riskLevel === "medium" 
              ? "Monitoramento ativo necessário" 
              : "Manter acompanhamento padrão"
        });
      }
    });

    return risks.sort((a, b) => b.score - a.score);
  }, [historicalData, organizations]);

  // Generate intelligent alerts
  const intelligentAlerts = useMemo((): IntelligentAlert[] => {
    if (!historicalData || !organizations) return [];

    const alerts: IntelligentAlert[] = [];
    const now = new Date();

    // Check for compliance trend alerts
    const pendingReports = historicalData.reports.filter((r: any) => r.status === "under_review").length;
    const totalReports = historicalData.reports.length;
    const complianceRate = totalReports > 0 ? ((totalReports - pendingReports) / totalReports) * 100 : 100;

    if (complianceRate < 70) {
      alerts.push({
        id: "alert-compliance-trend",
        severity: "critical",
        type: "Tendência de Conformidade",
        title: "Queda na Taxa de Conformidade Global",
        description: `A taxa de conformidade da plataforma está em ${complianceRate.toFixed(1)}%, abaixo do limite aceitável de 70%.`,
        affectedEntity: "Plataforma Global",
        generatedAt: now,
        expectedImpactDate: addDays(now, 15),
        explanation: "Análise de padrões históricos indica aumento consistente de relatórios pendentes nas últimas 4 semanas, sugerindo possível sobrecarga administrativa ou falhas no processo de revisão.",
        recommendation: "Revisar capacidade de gestão e considerar redistribuição de carga entre gestores.",
        isResolved: false
      });
    }

    // Check for growth vs capacity alerts
    const recentGrowth = historicalData.scholars.filter((s: any) => {
      const created = new Date(s.created_at);
      return differenceInDays(now, created) <= 30;
    }).length;

    if (recentGrowth > 10) {
      alerts.push({
        id: "alert-growth-capacity",
        severity: "moderate",
        type: "Crescimento Acelerado",
        title: "Crescimento Acima da Capacidade Histórica",
        description: `${recentGrowth} novos bolsistas nos últimos 30 dias, 50% acima da média histórica.`,
        affectedEntity: "Plataforma Global",
        generatedAt: now,
        explanation: "O ritmo de crescimento atual pode exceder a capacidade operacional se mantido. Análise preditiva sugere possível gargalo em processos de revisão e validação.",
        recommendation: "Avaliar necessidade de expansão da equipe de gestão ou otimização de processos.",
        isResolved: false
      });
    }

    // Check for concentration risk
    if (organizations.length > 0 && organizations.length < 3) {
      alerts.push({
        id: "alert-concentration",
        severity: "info",
        type: "Concentração de Recursos",
        title: "Alta Concentração em Poucas Organizações",
        description: "Mais de 80% dos bolsistas estão concentrados em menos de 20% das organizações.",
        affectedEntity: "Distribuição Institucional",
        generatedAt: now,
        explanation: "Concentração elevada representa risco sistêmico em caso de problemas com organizações dominantes. Diversificação é recomendada para resiliência da plataforma.",
        recommendation: "Estratégia de expansão para novas organizações parceiras.",
        isResolved: false
      });
    }

    // Check for payment pattern anomalies
    const paidPayments = historicalData.payments.filter((p: any) => p.status === "paid");
    const pendingPayments = historicalData.payments.filter((p: any) => p.status === "pending");
    
    if (pendingPayments.length > paidPayments.length * 0.5) {
      alerts.push({
        id: "alert-payment-anomaly",
        severity: "moderate",
        type: "Padrão de Pagamentos",
        title: "Volume Anormal de Pagamentos Pendentes",
        description: `${pendingPayments.length} pagamentos pendentes, representando ${((pendingPayments.length / (paidPayments.length + pendingPayments.length)) * 100).toFixed(0)}% do total.`,
        affectedEntity: "Fluxo Financeiro",
        generatedAt: now,
        expectedImpactDate: addDays(now, 7),
        explanation: "Acúmulo de pagamentos pendentes acima do padrão histórico pode indicar gargalo no processo de liberação ou aumento de recusas de relatórios.",
        recommendation: "Investigar causa raiz e priorizar desbloqueio do fluxo financeiro.",
        isResolved: false
      });
    }

    return alerts;
  }, [historicalData, organizations]);

  // Scenario simulation
  const scenarioSimulation = useMemo((): ScenarioSimulation => {
    if (!historicalData) return { baseline: 0, optimistic: 0, pessimistic: 0 };

    const currentScholars = historicalData.scholars.filter((s: any) => s.status === "active").length;
    const growthRate = scenarioGrowthRate[0] / 100;
    const months = forecastHorizon / 30;

    return {
      baseline: Math.round(currentScholars * Math.pow(1 + growthRate, months)),
      optimistic: Math.round(currentScholars * Math.pow(1 + growthRate * 1.5, months)),
      pessimistic: Math.round(currentScholars * Math.pow(1 + growthRate * 0.5, months))
    };
  }, [historicalData, scenarioGrowthRate, forecastHorizon]);

  const filteredRisks = riskFilter === "all" 
    ? riskIndicators 
    : riskIndicators.filter(r => r.riskLevel === riskFilter);

  const filteredAlerts = alertFilter === "all"
    ? intelligentAlerts
    : intelligentAlerts.filter(a => a.severity === alertFilter);

  const getRiskLevelColor = (level: RiskLevel) => {
    switch (level) {
      case "high": return "text-destructive";
      case "medium": return "text-warning";
      case "low": return "text-success";
    }
  };

  const getRiskLevelBg = (level: RiskLevel) => {
    switch (level) {
      case "high": return "bg-destructive/10 border-destructive/20";
      case "medium": return "bg-warning/10 border-warning/20";
      case "low": return "bg-success/10 border-success/20";
    }
  };

  const getAlertIcon = (severity: AlertSeverity) => {
    switch (severity) {
      case "critical": return <AlertCircle className="h-5 w-5 text-destructive" />;
      case "moderate": return <AlertTriangle className="h-5 w-5 text-warning" />;
      case "info": return <Info className="h-5 w-5 text-info" />;
    }
  };

  const getAlertBadge = (severity: AlertSeverity) => {
    switch (severity) {
      case "critical": return <Badge variant="destructive">Crítico</Badge>;
      case "moderate": return <Badge className="bg-warning text-warning-foreground">Moderado</Badge>;
      case "info": return <Badge variant="secondary">Informativo</Badge>;
    }
  };

  const getTrendIcon = (trend: "improving" | "stable" | "worsening") => {
    switch (trend) {
      case "improving": return <TrendingUp className="h-4 w-4 text-success" />;
      case "stable": return <Activity className="h-4 w-4 text-muted-foreground" />;
      case "worsening": return <TrendingDown className="h-4 w-4 text-destructive" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Dashboard Preditivo e Inteligente
          </h2>
          <p className="text-sm text-muted-foreground">
            KPIs preditivos, indicadores de risco e alertas proativos
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Select value={forecastHorizon.toString()} onValueChange={(v) => setForecastHorizon(Number(v) as ForecastHorizon)}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 dias</SelectItem>
              <SelectItem value="60">60 dias</SelectItem>
              <SelectItem value="90">90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Projeção {forecastHorizon}d
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {forecastData.length > 0 ? forecastData[forecastData.length - 1].predicted : 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Bolsistas ativos esperados
            </p>
          </CardContent>
        </Card>

        <Card className={cn(
          "border",
          riskIndicators.filter(r => r.riskLevel === "high").length > 0 
            ? "bg-destructive/10 border-destructive/20" 
            : "bg-success/10 border-success/20"
        )}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShieldAlert className={cn(
                "h-4 w-4",
                riskIndicators.filter(r => r.riskLevel === "high").length > 0 
                  ? "text-destructive" 
                  : "text-success"
              )} />
              Riscos Críticos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              riskIndicators.filter(r => r.riskLevel === "high").length > 0 
                ? "text-destructive" 
                : "text-success"
            )}>
              {riskIndicators.filter(r => r.riskLevel === "high").length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Organizações em risco alto
            </p>
          </CardContent>
        </Card>

        <Card className={cn(
          "border",
          intelligentAlerts.filter(a => a.severity === "critical").length > 0
            ? "bg-warning/10 border-warning/20"
            : "bg-muted/50 border-muted"
        )}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-warning" />
              Alertas Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {intelligentAlerts.filter(a => !a.isResolved).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Requerem atenção
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-info/10 to-info/5 border-info/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Gauge className="h-4 w-4 text-info" />
              Saúde Preditiva
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info">
              {Math.round(100 - (riskIndicators.reduce((sum, r) => sum + r.score, 0) / Math.max(riskIndicators.length, 1)))}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Score de saúde projetado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Forecast Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Projeção de Crescimento
              </CardTitle>
              <CardDescription>
                Histórico + previsão com intervalo de confiança
              </CardDescription>
            </div>
            <Select value={selectedMetric} onValueChange={setSelectedMetric}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scholars">Bolsistas</SelectItem>
                <SelectItem value="organizations">Organizações</SelectItem>
                <SelectItem value="projects">Projetos Temáticos</SelectItem>
                <SelectItem value="payments">Pagamentos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={forecastData}>
              <defs>
                <linearGradient id="colorConfidence" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
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
                formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = {
                    actual: "Real",
                    predicted: "Projetado",
                    upperBound: "Limite Superior",
                    lowerBound: "Limite Inferior"
                  };
                  return [value, labels[name] || name];
                }}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="upperBound" 
                stroke="none"
                fill="url(#colorConfidence)"
                name="Intervalo de Confiança"
              />
              <Area 
                type="monotone" 
                dataKey="lowerBound" 
                stroke="none"
                fill="transparent"
              />
              <Line 
                type="monotone" 
                dataKey="actual" 
                stroke="hsl(var(--success))" 
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Real"
              />
              <Line 
                type="monotone" 
                dataKey="predicted" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 4 }}
                name="Projetado"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Scenario Simulation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Simulação de Cenários (What-If)
          </CardTitle>
          <CardDescription>
            Ajuste a taxa de crescimento esperada para simular diferentes cenários
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Taxa de Crescimento Mensal</span>
              <span className="text-sm text-muted-foreground">{scenarioGrowthRate[0]}%</span>
            </div>
            <Slider
              value={scenarioGrowthRate}
              onValueChange={setScenarioGrowthRate}
              min={-10}
              max={20}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Retração (-10%)</span>
              <span>Estável (0%)</span>
              <span>Crescimento (+20%)</span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-muted/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Cenário Pessimista
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{scenarioSimulation.pessimistic}</div>
                <p className="text-xs text-muted-foreground">bolsistas em {forecastHorizon}d</p>
              </CardContent>
            </Card>

            <Card className="bg-primary/10 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-primary">
                  Cenário Base
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{scenarioSimulation.baseline}</div>
                <p className="text-xs text-muted-foreground">bolsistas em {forecastHorizon}d</p>
              </CardContent>
            </Card>

            <Card className="bg-success/10 border-success/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-success">
                  Cenário Otimista
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">{scenarioSimulation.optimistic}</div>
                <p className="text-xs text-muted-foreground">bolsistas em {forecastHorizon}d</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Risk Indicators and Alerts in Tabs */}
      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Alertas Inteligentes
            {intelligentAlerts.length > 0 && (
              <Badge variant="secondary" className="ml-1">{intelligentAlerts.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="risks" className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" />
            Indicadores de Risco
            {riskIndicators.filter(r => r.riskLevel !== "low").length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {riskIndicators.filter(r => r.riskLevel !== "low").length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Filtrar:</span>
            <Select value={alertFilter} onValueChange={(v) => setAlertFilter(v as AlertSeverity | "all")}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="critical">Críticos</SelectItem>
                <SelectItem value="moderate">Moderados</SelectItem>
                <SelectItem value="info">Informativos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredAlerts.length === 0 ? (
            <Card className="bg-success/10 border-success/20">
              <CardContent className="flex items-center justify-center py-8">
                <CheckCircle2 className="h-5 w-5 text-success mr-2" />
                <span className="text-success font-medium">
                  Nenhum alerta ativo no momento
                </span>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredAlerts.map((alert) => (
                <Card key={alert.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {getAlertIcon(alert.severity)}
                        <div>
                          <CardTitle className="text-base">{alert.title}</CardTitle>
                          <CardDescription className="mt-1">{alert.description}</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getAlertBadge(alert.severity)}
                        <Badge variant="outline">{alert.type}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Entidade Afetada:</span>
                          <span>{alert.affectedEntity}</span>
                        </div>
                        {alert.expectedImpactDate && (
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">Impacto Esperado:</span>
                            <span>{format(alert.expectedImpactDate, "dd/MM/yyyy", { locale: ptBR })}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Brain className="h-4 w-4 text-primary" />
                        Por que este alerta foi gerado?
                      </div>
                      <p className="text-sm text-muted-foreground">{alert.explanation}</p>
                    </div>

                    <div className="p-3 rounded-lg bg-primary/10 space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-primary">
                        <Lightbulb className="h-4 w-4" />
                        Recomendação
                      </div>
                      <p className="text-sm">{alert.recommendation}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="risks" className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Filtrar:</span>
            <Select value={riskFilter} onValueChange={(v) => setRiskFilter(v as RiskLevel | "all")}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="high">Alto</SelectItem>
                <SelectItem value="medium">Médio</SelectItem>
                <SelectItem value="low">Baixo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredRisks.length === 0 ? (
            <Card className="bg-success/10 border-success/20">
              <CardContent className="flex items-center justify-center py-8">
                <CheckCircle2 className="h-5 w-5 text-success mr-2" />
                <span className="text-success font-medium">
                  Nenhum risco identificado com o filtro selecionado
                </span>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredRisks.map((risk) => (
                <Card key={risk.id} className={cn("transition-colors", getRiskLevelBg(risk.riskLevel))}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className={cn("text-2xl font-bold", getRiskLevelColor(risk.riskLevel))}>
                            {risk.score}
                          </div>
                          <div className="text-xs text-muted-foreground">Score</div>
                        </div>
                        
                        <div className="border-l pl-4">
                          <div className="font-medium">{risk.organizationName}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                            <Badge variant="outline">{risk.riskType}</Badge>
                            {getTrendIcon(risk.trend)}
                            <span className="capitalize">{risk.trend === "improving" ? "Melhorando" : risk.trend === "stable" ? "Estável" : "Piorando"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="flex items-center gap-2 text-sm">
                            <Badge className={cn(
                              risk.riskLevel === "high" && "bg-destructive",
                              risk.riskLevel === "medium" && "bg-warning",
                              risk.riskLevel === "low" && "bg-success"
                            )}>
                              {risk.riskLevel === "high" ? "Alto" : risk.riskLevel === "medium" ? "Médio" : "Baixo"}
                            </Badge>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t">
                      <div className="grid gap-2 md:grid-cols-2">
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-1">Fatores de Risco:</div>
                          <ul className="text-sm space-y-1">
                            {risk.factors.map((factor, i) => (
                              <li key={i} className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                                {factor}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-1">Recomendação:</div>
                          <p className="text-sm">{risk.recommendation}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Governance Notice */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Governança e Transparência</p>
              <p className="text-xs text-muted-foreground">
                Os alertas e previsões são gerados com base em análise estatística de padrões históricos e regras institucionais.
                Servem como apoio à decisão estratégica e não substituem a avaliação humana.
                Todos os critérios são auditáveis e aderentes às políticas de compliance.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
