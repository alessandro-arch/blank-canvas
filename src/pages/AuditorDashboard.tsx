import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  FileText, DollarSign, Users, Calendar,
  BarChart3, Eye, FolderOpen, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

const AuditorDashboard = () => {
  const { currentOrganization, loading: orgLoading } = useOrganizationContext();
  const orgId = currentOrganization?.id;

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

  if (import.meta.env.DEV) {
    console.log("[AuditorDashboard] orgId:", orgId, "orgLoading:", orgLoading);
  }

  const { data, isLoading } = useQuery({
    queryKey: ["auditor-dashboard", selectedMonth, orgId],
    staleTime: 2 * 60 * 1000,
    enabled: !!orgId,
    queryFn: async () => {
      if (!orgId) throw new Error("No organization");

      // 1. Thematic projects for this org
      const { data: thematicProjects } = await supabase
        .from("thematic_projects")
        .select("id")
        .eq("organization_id", orgId);

      const tpIds = thematicProjects?.map((tp) => tp.id) ?? [];
      if (tpIds.length === 0) {
        return { activeScholars: 0, approvedReports: 0, totalReports: 0, totalPaid: 0, activeProjects: 0, chartData: [] };
      }

      // 2. Projects for those thematic projects
      const { data: projects } = await supabase
        .from("projects")
        .select("id")
        .in("thematic_project_id", tpIds);

      const projectIds = projects?.map((p) => p.id) ?? [];

      // 3. Active projects count
      const { count: activeProjects } = await supabase
        .from("projects")
        .select("*", { count: "exact", head: true })
        .in("thematic_project_id", tpIds)
        .eq("status", "active");

      if (projectIds.length === 0) {
        return { activeScholars: 0, approvedReports: 0, totalReports: 0, totalPaid: 0, activeProjects: activeProjects ?? 0, chartData: [] };
      }

      // 4. Active enrollments
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("id")
        .in("project_id", projectIds)
        .eq("status", "active");

      const enrollmentIds = enrollments?.map((e) => e.id) ?? [];
      const activeScholars = enrollments?.length ?? 0;

      // 5. Reports for the month (using reports table which dashboard originally used)
      const { count: approvedReports } = await supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("reference_month", selectedMonth)
        .eq("status", "approved")
        .in("user_id", enrollments?.map((e) => e.id) ?? ["__none__"]);

      // Use monthly_reports which has organization_id directly
      const { count: totalMonthlyReports } = await supabase
        .from("monthly_reports")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .in("project_id", projectIds);

      const [year, mon] = selectedMonth.split("-").map(Number);
      const { count: approvedMonthlyReports } = await supabase
        .from("monthly_reports")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("period_year", year)
        .eq("period_month", mon)
        .eq("status", "approved");

      const { count: totalMonthlyReportsMonth } = await supabase
        .from("monthly_reports")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("period_year", year)
        .eq("period_month", mon);

      // 6. Paid payments for the month
      let totalPaid = 0;
      if (enrollmentIds.length > 0) {
        const { data: paidPayments } = await supabase
          .from("payments")
          .select("amount")
          .eq("reference_month", selectedMonth)
          .eq("status", "paid")
          .in("enrollment_id", enrollmentIds);

        totalPaid = paidPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      }

      // 7. Chart data - last 6 months
      const selectedDate = new Date(year, mon - 1, 1);
      const chartMonths: { month: string; label: string; paid: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(selectedDate, i);
        chartMonths.push({ month: format(d, "yyyy-MM"), label: format(d, "MMM/yy", { locale: ptBR }), paid: 0 });
      }

      if (enrollmentIds.length > 0) {
        const monthKeys = chartMonths.map((m) => m.month);
        const { data: chartPayments } = await supabase
          .from("payments")
          .select("reference_month, amount")
          .in("reference_month", monthKeys)
          .eq("status", "paid")
          .in("enrollment_id", enrollmentIds);

        if (chartPayments) {
          for (const p of chartPayments) {
            const entry = chartMonths.find((m) => m.month === p.reference_month);
            if (entry) entry.paid += Number(p.amount);
          }
        }
      }

      return {
        activeScholars,
        approvedReports: approvedMonthlyReports ?? 0,
        totalReports: totalMonthlyReportsMonth ?? 0,
        totalPaid,
        activeProjects: activeProjects ?? 0,
        chartData: chartMonths,
      };
    },
  });

  const kpis = [
    { label: "Bolsistas Ativos", value: data?.activeScholars ?? 0, icon: Users, color: "primary" as const },
    { label: "Projetos Ativos", value: data?.activeProjects ?? 0, icon: FolderOpen, color: "info" as const },
    { label: "Relatórios (Mês)", value: `${data?.approvedReports ?? 0}/${data?.totalReports ?? 0}`, icon: FileText, color: "success" as const },
    { label: "Total Pago (Mês)", value: formatCurrency(data?.totalPaid ?? 0), icon: DollarSign, color: "warning" as const },
  ];

  const colorClasses: Record<string, string> = {
    primary: "bg-primary/10 text-primary border-l-primary",
    info: "bg-info/10 text-info border-l-info",
    success: "bg-success/10 text-success border-l-success",
    warning: "bg-warning/10 text-warning border-l-warning",
  };

  // No org loaded state
  if (!orgLoading && !orgId) {
    return (
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header />
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-md mx-auto mt-20 text-center space-y-4">
              <AlertTriangle className="h-12 w-12 text-warning mx-auto" />
              <h2 className="text-xl font-semibold">Organização não encontrada</h2>
              <p className="text-muted-foreground">
                Não foi possível carregar sua organização. Contate o administrador.
              </p>
            </div>
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Eye className="h-5 w-5 text-primary" />
                  <Badge variant="outline" className="text-xs">Somente Leitura</Badge>
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Painel do Auditor</h1>
                <p className="text-muted-foreground">
                  Visão de auditoria — {currentOrganization?.name}
                </p>
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {kpis.map((kpi) => (
                <Card key={kpi.label} className={cn("border-l-3", `border-l-${kpi.color}`)}>
                  <CardContent className="p-3">
                    {isLoading || orgLoading ? (
                      <div className="space-y-1">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-5 w-10" />
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xl font-bold text-foreground leading-none">
                            {typeof kpi.value === "number" ? kpi.value : kpi.value}
                          </p>
                          <p className="text-[11px] font-medium text-muted-foreground mt-1">{kpi.label}</p>
                        </div>
                        <div className={cn("w-7 h-7 rounded flex items-center justify-center shrink-0", colorClasses[kpi.color].split(" ").slice(0, 2).join(" "))}>
                          <kpi.icon className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Execução Financeira — Últimos 6 meses
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading || orgLoading ? (
                  <Skeleton className="h-52 w-full" />
                ) : data?.chartData && data.chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v)} className="text-muted-foreground" />
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value), "Pago"]}
                        contentStyle={{ borderRadius: 8, fontSize: 13 }}
                      />
                      <Bar dataKey="paid" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-sm text-center py-8">
                    Nenhum dado disponível para o período selecionado.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default AuditorDashboard;
