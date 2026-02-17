import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AdminBanner } from "@/components/admin/AdminBanner";
import { AdminMasterModeProvider } from "@/contexts/AdminMasterModeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, subMonths, differenceInMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  FileText, DollarSign, XCircle, Users, Calendar,
  AlertTriangle, ArrowRight, TrendingUp, BarChart3,
  Wallet, ArrowUpDown, Percent, PiggyBank,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

const ExecutiveDashboard = () => {
  const currentMonth = format(new Date(), "yyyy-MM");
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const monthOptions = useMemo(() => {
    const options = [];
    const today = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      options.push({
        value: format(date, "yyyy-MM"),
        label: format(date, "MMMM 'de' yyyy", { locale: ptBR }),
      });
    }
    return options;
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["executive-dashboard", selectedMonth],
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      // Pending reports (under_review)
      const { count: pendingReports } = await supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("status", "under_review");

      // Rejected reports
      const { count: rejectedReports } = await supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("status", "rejected");

      // Pending payments for the month
      const { count: pendingPayments } = await supabase
        .from("payments")
        .select("*", { count: "exact", head: true })
        .eq("reference_month", selectedMonth)
        .in("status", ["pending", "eligible"]);

      // Active scholars
      const { count: activeScholars } = await supabase
        .from("enrollments")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      // Alerts: late reports (submitted > 15 days ago, still under_review)
      const fifteenDaysAgo = subDays(new Date(), 15).toISOString();
      const { data: lateReports } = await supabase
        .from("reports")
        .select("id, submitted_at, reference_month")
        .eq("status", "under_review")
        .lt("submitted_at", fifteenDaysAgo);

      // Alerts: payments pending > 7 days
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();
      const { data: latePayments } = await supabase
        .from("payments")
        .select("id, created_at, reference_month")
        .eq("status", "eligible")
        .lt("created_at", sevenDaysAgo);

      // Paid payments total for the month
      const { data: paidPayments } = await supabase
        .from("payments")
        .select("amount")
        .eq("reference_month", selectedMonth)
        .eq("status", "paid");

      const totalPaid = paidPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      // Fetch payment data for chart (last 6 months)
      const chartMonths: { month: string; label: string; paid: number; pending: number }[] = [];
      const [year, mon] = selectedMonth.split("-").map(Number);
      const selectedDate = new Date(year, mon - 1, 1);
      
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(selectedDate, i);
        const monthKey = format(d, "yyyy-MM");
        const label = format(d, "MMM/yy", { locale: ptBR });
        chartMonths.push({ month: monthKey, label, paid: 0, pending: 0 });
      }

      const monthKeys = chartMonths.map(m => m.month);
      const { data: chartPayments } = await supabase
        .from("payments")
        .select("reference_month, amount, status")
        .in("reference_month", monthKeys);

      if (chartPayments) {
        for (const p of chartPayments) {
          const entry = chartMonths.find(m => m.month === p.reference_month);
          if (entry) {
            if (p.status === "paid") {
              entry.paid += Number(p.amount);
            } else {
              entry.pending += Number(p.amount);
            }
          }
        }
      }

      return {
        pendingReports: pendingReports ?? 0,
        rejectedReports: rejectedReports ?? 0,
        pendingPayments: pendingPayments ?? 0,
        activeScholars: activeScholars ?? 0,
        lateReports: lateReports?.length ?? 0,
        latePayments: latePayments?.length ?? 0,
        totalPaid,
        chartData: chartMonths,
      };
    },
  });

  // Scholarship financial indicators query
  const { data: bolsasData, isLoading: bolsasLoading } = useQuery({
    queryKey: ["executive-bolsas-financials"],
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      // 1. Fetch all active thematic projects with dates
      const { data: thematicProjects } = await supabase
        .from("thematic_projects")
        .select("id, start_date, end_date, status");

      // 2. Fetch all active subprojects
      const { data: projects } = await supabase
        .from("projects")
        .select("id, thematic_project_id, valor_mensal, status")
        .eq("status", "active");

      // 3. Calculate estimated: sum of (monthly_total * project_duration) per thematic project
      let valorEstimado = 0;
      if (thematicProjects && projects) {
        for (const tp of thematicProjects) {
          if (!tp.start_date || !tp.end_date) continue;
          const months = Math.max(1, differenceInMonths(new Date(tp.end_date), new Date(tp.start_date)) + 1);
          const monthlyTotal = projects
            .filter(p => p.thematic_project_id === tp.id)
            .reduce((sum, p) => sum + (p.valor_mensal || 0), 0);
          valorEstimado += monthlyTotal * months;
        }
      }

      // 4. Calculate attributed: sum of all paid payments
      const { data: paidPayments } = await supabase
        .from("payments")
        .select("amount")
        .eq("status", "paid");

      const valorAtribuido = paidPayments?.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;

      return { valorEstimado, valorAtribuido };
    },
  });

  const kpis = [
    {
      label: "Relatórios Pendentes",
      value: data?.pendingReports ?? 0,
      icon: FileText,
      color: "warning" as const,
    },
    {
      label: "Pagamentos Pendentes",
      value: data?.pendingPayments ?? 0,
      icon: DollarSign,
      color: "info" as const,
    },
    {
      label: "Relatórios Reprovados",
      value: data?.rejectedReports ?? 0,
      icon: XCircle,
      color: "destructive" as const,
    },
    {
      label: "Bolsistas Ativos",
      value: data?.activeScholars ?? 0,
      icon: Users,
      color: "success" as const,
    },
  ];

  const colorClasses = {
    warning: "bg-warning/10 text-warning border-l-warning",
    info: "bg-info/10 text-info border-l-info",
    destructive: "bg-destructive/10 text-destructive border-l-destructive",
    success: "bg-success/10 text-success border-l-success",
  };

  const alerts = useMemo(() => {
    if (!data) return [];
    const items: { message: string; severity: "warning" | "error"; link: string; tab: string }[] = [];
    if (data.lateReports > 0) {
      items.push({
        message: `${data.lateReports} relatório(s) atrasado(s) há mais de 15 dias`,
        severity: "error",
        link: "/admin/operacao?tab=relatorios&status=under_review",
        tab: "Relatórios",
      });
    }
    if (data.latePayments > 0) {
      items.push({
        message: `${data.latePayments} pagamento(s) pendente(s) há mais de 7 dias`,
        severity: "warning",
        link: "/admin/operacao?tab=pagamentos&status=eligible",
        tab: "Pagamentos",
      });
    }
    if (data.rejectedReports > 0) {
      items.push({
        message: `${data.rejectedReports} relatório(s) reprovado(s) aguardando reenvio`,
        severity: "warning",
        link: "/admin/operacao?tab=relatorios&status=rejected",
        tab: "Relatórios",
      });
    }
    return items;
  }, [data]);

  return (
    <AdminMasterModeProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <AdminBanner />
          <Header />
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-6xl mx-auto space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Dashboard Executivo</h1>
                  <p className="text-muted-foreground">Visão executiva mensal do sistema de bolsas</p>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-[220px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {monthOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map((kpi) => (
                  <Card key={kpi.label} className={cn("border-l-4", `border-l-${kpi.color}`)}>
                    <CardContent className="p-5">
                      {isLoading ? (
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-8 w-16" />
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3 mb-3">
                            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", colorClasses[kpi.color].split(" ").slice(0, 2).join(" "))}>
                              <kpi.icon className="w-4 h-4" />
                            </div>
                          </div>
                          <p className="text-3xl font-bold text-foreground">{kpi.value}</p>
                          <p className="text-sm font-medium text-muted-foreground mt-1">{kpi.label}</p>
                        </>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Gestão de Bolsas */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Wallet className="h-5 w-5 text-primary" />
                    Gestão de Bolsas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {bolsasLoading ? (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full" />
                      ))}
                    </div>
                  ) : (() => {
                    const est = bolsasData?.valorEstimado ?? 0;
                    const atr = bolsasData?.valorAtribuido ?? 0;
                    const dif = est - atr;
                    const pct = est > 0 ? (atr / est) * 100 : 0;

                    const items = [
                      { label: "Valor Estimado", value: formatCurrency(est), icon: TrendingUp, colorClass: "text-primary bg-primary/10" },
                      { label: "Total Pago", value: formatCurrency(atr), icon: PiggyBank, colorClass: "text-success bg-success/10" },
                      { label: "Diferença", value: `${dif >= 0 ? "+" : ""}${formatCurrency(dif)}`, icon: ArrowUpDown, colorClass: dif >= 0 ? "text-success bg-success/10" : "text-destructive bg-destructive/10" },
                      { label: "% Executado", value: `${pct.toFixed(1)}%`, icon: Percent, colorClass: pct <= 100 ? "text-primary bg-primary/10" : "text-destructive bg-destructive/10" },
                    ];

                    return (
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {items.map((item) => (
                          <div key={item.label} className="border rounded-lg p-4 space-y-2">
                            <div className="flex items-center gap-2">
                              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", item.colorClass)}>
                                <item.icon className="w-4 h-4" />
                              </div>
                              <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
                            </div>
                            <p className="text-xl font-bold text-foreground">{item.value}</p>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Chart placeholder + Alerts side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart placeholder */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <BarChart3 className="h-4 w-4" />
                      Pagamentos Realizados
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <Skeleton className="h-48 w-full" />
                    ) : data?.chartData && data.chartData.some(d => d.paid > 0 || d.pending > 0) ? (
                      <div className="space-y-2">
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={data.chartData} barGap={2}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis dataKey="label" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} className="text-muted-foreground" />
                            <Tooltip
                              formatter={(value: number) => formatCurrency(value)}
                              labelFormatter={(label) => `Mês: ${label}`}
                              contentStyle={{ borderRadius: 8, fontSize: 13 }}
                            />
                            <Bar dataKey="paid" name="Pago" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="pending" name="Pendente" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                        <p className="text-xs text-muted-foreground text-center">
                          Total pago no período selecionado: <span className="font-semibold">{formatCurrency(data.totalPaid)}</span>
                        </p>
                      </div>
                    ) : (
                      <div className="h-48 flex flex-col items-center justify-center border border-dashed border-border rounded-lg bg-muted/30">
                        <TrendingUp className="h-8 w-8 text-muted-foreground/50 mb-2" />
                        <p className="text-sm text-muted-foreground">Nenhum pagamento registrado</p>
                        {!isLoading && data && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Total pago no período: <span className="font-semibold">{formatCurrency(data.totalPaid)}</span>
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Smart Alerts */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      Alertas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {isLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-14 w-full" />
                      ))
                    ) : alerts.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">
                        <p className="text-sm">Nenhum alerta no momento 🎉</p>
                      </div>
                    ) : (
                      alerts.map((alert, i) => (
                        <Link
                          key={i}
                          to={alert.link}
                          className={cn(
                            "block p-3 rounded-lg border transition-colors hover:bg-muted/50",
                            alert.severity === "error" ? "border-destructive/30 bg-destructive/5" : "border-warning/30 bg-warning/5"
                          )}
                        >
                          <div className="flex items-start gap-2">
                            <AlertTriangle className={cn(
                              "h-4 w-4 mt-0.5 flex-shrink-0",
                              alert.severity === "error" ? "text-destructive" : "text-warning"
                            )} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground">{alert.message}</p>
                              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                <span>Ir para {alert.tab}</span>
                                <ArrowRight className="h-3 w-3" />
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      </div>
    </AdminMasterModeProvider>
  );
};

export default ExecutiveDashboard;
