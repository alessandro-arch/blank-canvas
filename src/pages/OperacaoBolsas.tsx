import { useState, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AdminBanner } from "@/components/admin/AdminBanner";
import { AdminMasterModeProvider } from "@/contexts/AdminMasterModeContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  FileText, DollarSign, FolderOpen, XCircle, Users,
  Calendar, Search, Download, Filter, Landmark,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Reuse existing management components (they already have all the logic)
import { ReportsReviewManagement } from "@/components/dashboard/ReportsReviewManagement";
import { PaymentsManagement } from "@/components/dashboard/PaymentsManagement";
import { ProjectsManagement } from "@/components/projects/ProjectsManagement";
import { BankDataManagement } from "@/components/dashboard/BankDataManagement";
import { MonthlyReportsReviewManagement } from "@/components/dashboard/MonthlyReportsReviewManagement";

const OperacaoBolsas = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "relatorios";
  const [activeTab, setActiveTab] = useState(initialTab);
  const currentMonth = format(new Date(), "yyyy-MM");

  // Fetch counts for tab badges
  const { data: counts, isLoading: countsLoading } = useQuery({
    queryKey: ["operacao-counts", currentMonth],
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const [reportsRes, paymentsRes, projectsRes] = await Promise.all([
        supabase
          .from("reports")
          .select("*", { count: "exact", head: true })
          .eq("status", "under_review"),
        supabase
          .from("payments")
          .select("*", { count: "exact", head: true })
          .eq("reference_month", currentMonth)
          .in("status", ["pending", "eligible"]),
        supabase
          .from("thematic_projects")
          .select("*", { count: "exact", head: true })
          .eq("status", "active"),
      ]);

      return {
        pendingReports: reportsRes.count ?? 0,
        pendingPayments: paymentsRes.count ?? 0,
        activeProjects: projectsRes.count ?? 0,
      };
    },
  });

  // KPIs
  const { data: kpiData, isLoading: kpiLoading } = useQuery({
    queryKey: ["operacao-kpis", currentMonth],
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const [pendingReports, pendingPayments, rejectedReports, activeScholars] = await Promise.all([
        supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "under_review"),
        supabase.from("payments").select("*", { count: "exact", head: true }).eq("reference_month", currentMonth).in("status", ["pending", "eligible"]),
        supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "rejected"),
        supabase.from("enrollments").select("*", { count: "exact", head: true }).eq("status", "active"),
      ]);

      return {
        pendingReports: pendingReports.count ?? 0,
        pendingPayments: pendingPayments.count ?? 0,
        rejectedReports: rejectedReports.count ?? 0,
        activeScholars: activeScholars.count ?? 0,
      };
    },
  });

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const kpis = [
    { label: "Relatórios Pendentes", value: kpiData?.pendingReports ?? 0, icon: FileText, color: "warning" as const },
    { label: "Pagamentos Pendentes", value: kpiData?.pendingPayments ?? 0, icon: DollarSign, color: "info" as const },
    { label: "Relatórios Reprovados", value: kpiData?.rejectedReports ?? 0, icon: XCircle, color: "destructive" as const },
    { label: "Bolsistas Ativos", value: kpiData?.activeScholars ?? 0, icon: Users, color: "success" as const },
  ];

  const colorClasses = {
    warning: "bg-warning/10 text-warning",
    info: "bg-info/10 text-info",
    destructive: "bg-destructive/10 text-destructive",
    success: "bg-success/10 text-success",
  };

  return (
    <AdminMasterModeProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <AdminBanner />
          <Header />
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Header */}
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Operação de Bolsas</h1>
                <p className="text-muted-foreground">
                  Foco nas tarefas do dia a dia: analisar relatórios, aprovar e pagar bolsistas.
                </p>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map((kpi) => (
                  <div key={kpi.label} className="card-stat">
                    {kpiLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-8 w-16" />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3 mb-2">
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", colorClasses[kpi.color])}>
                            <kpi.icon className="w-4 h-4" />
                          </div>
                        </div>
                        <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                        <p className="text-xs font-medium text-muted-foreground mt-1">{kpi.label}</p>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
                <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
                  <TabsTrigger value="relatorios" className="gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">Relatórios</span>
                    {!countsLoading && counts && counts.pendingReports > 0 && (
                      <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">
                        {counts.pendingReports}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="relatorios-mensais" className="gap-2">
                    <Calendar className="h-4 w-4" />
                    <span className="hidden sm:inline">Rel. Mensais</span>
                  </TabsTrigger>
                  <TabsTrigger value="pagamentos" className="gap-2">
                    <DollarSign className="h-4 w-4" />
                    <span className="hidden sm:inline">Pagamentos</span>
                    {!countsLoading && counts && counts.pendingPayments > 0 && (
                      <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">
                        {counts.pendingPayments}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="projetos" className="gap-2">
                    <FolderOpen className="h-4 w-4" />
                    <span className="hidden sm:inline">Projetos</span>
                    {!countsLoading && counts && (
                      <Badge variant="outline" className="ml-1 text-xs px-1.5 py-0">
                        {counts.activeProjects}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="dados-bancarios" className="gap-2">
                    <Landmark className="h-4 w-4" />
                    <span className="hidden sm:inline">Dados Bancários</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="relatorios" className="mt-0">
                  <ReportsReviewManagement />
                </TabsContent>

                <TabsContent value="relatorios-mensais" className="mt-0">
                  <MonthlyReportsReviewManagement />
                </TabsContent>

                <TabsContent value="pagamentos" className="mt-0">
                  <PaymentsManagement />
                </TabsContent>

                <TabsContent value="projetos" className="mt-0">
                  <ProjectsManagement />
                </TabsContent>

                <TabsContent value="dados-bancarios" className="mt-0">
                  <BankDataManagement />
                </TabsContent>
              </Tabs>
            </div>
          </main>
          <Footer />
        </div>
      </div>
    </AdminMasterModeProvider>
  );
};

export default OperacaoBolsas;
