import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  FolderOpen, 
  Layers, 
  GraduationCap, 
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Clock,
  XCircle
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";

interface InstitutionalKPIs {
  activeOrganizations: number;
  activeThematicProjects: number;
  activeSubprojects: number;
  activeScholars: number;
  criticalPendencies: number;
}

interface OrganizationHealth {
  name: string;
  regular: number;
  pendencies: number;
  blocked: number;
}

interface PlatformHealth {
  name: string;
  value: number;
  color: string;
}

interface InstitutionalAlert {
  id: string;
  organizationName: string;
  type: string;
  impact: "high" | "medium" | "low";
  message: string;
}

export function InstitutionalOverviewTab() {
  // Fetch institutional KPIs
  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ["admin-icca-kpis"],
    queryFn: async (): Promise<InstitutionalKPIs> => {
      const [orgsResult, projectsResult, subprojectsResult, scholarsResult, pendenciesResult] = await Promise.all([
        supabase.from("organizations").select("id", { count: "exact" }).eq("is_active", true),
        supabase.from("thematic_projects").select("id", { count: "exact" }).eq("status", "active"),
        supabase.from("projects").select("id", { count: "exact" }).eq("status", "active"),
        supabase.from("enrollments").select("id", { count: "exact" }).eq("status", "active"),
        // Critical pendencies: reports pending review + bank accounts pending validation
        Promise.all([
          supabase.from("reports").select("id", { count: "exact" }).eq("status", "under_review"),
          supabase.from("bank_accounts").select("id", { count: "exact" }).eq("validation_status", "pending")
        ])
      ]);

      const [reportsCount, bankCount] = pendenciesResult;

      return {
        activeOrganizations: orgsResult.count || 0,
        activeThematicProjects: projectsResult.count || 0,
        activeSubprojects: subprojectsResult.count || 0,
        activeScholars: scholarsResult.count || 0,
        criticalPendencies: (reportsCount.count || 0) + (bankCount.count || 0)
      };
    }
  });

  // Fetch organization health data for chart
  const { data: orgHealthData } = useQuery({
    queryKey: ["admin-icca-org-health"],
    queryFn: async (): Promise<OrganizationHealth[]> => {
      const { data: orgs } = await supabase
        .from("organizations")
        .select("id, name")
        .eq("is_active", true)
        .limit(10);

      if (!orgs) return [];

      const healthData: OrganizationHealth[] = [];

      for (const org of orgs) {
        // Count profiles with pending bank data or incomplete registration
        const { count: pendingBank } = await supabase
          .from("profiles")
          .select("id", { count: "exact" })
          .eq("organization_id", org.id)
          .eq("onboarding_status", "DADOS_BANCARIOS_PENDENTES");

        const { count: incomplete } = await supabase
          .from("profiles")
          .select("id", { count: "exact" })
          .eq("organization_id", org.id)
          .eq("onboarding_status", "AGUARDANDO_ATRIBUICAO");

        const { count: active } = await supabase
          .from("profiles")
          .select("id", { count: "exact" })
          .eq("organization_id", org.id)
          .eq("onboarding_status", "COMPLETO");

        healthData.push({
          name: org.name.length > 15 ? org.name.substring(0, 15) + "..." : org.name,
          regular: active || 0,
          pendencies: (pendingBank || 0) + (incomplete || 0),
          blocked: 0 // Would need a blocked status to track this
        });
      }

      return healthData;
    }
  });

  // Platform health donut data
  const { data: platformHealth } = useQuery({
    queryKey: ["admin-icca-platform-health"],
    queryFn: async (): Promise<PlatformHealth[]> => {
      const [complete, incomplete, bankPending, reportsPending] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact" }).eq("onboarding_status", "COMPLETO"),
        supabase.from("profiles").select("id", { count: "exact" }).eq("onboarding_status", "AGUARDANDO_ATRIBUICAO"),
        supabase.from("profiles").select("id", { count: "exact" }).eq("onboarding_status", "DADOS_BANCARIOS_PENDENTES"),
        supabase.from("reports").select("id", { count: "exact" }).eq("status", "under_review")
      ]);

      return [
        { name: "Regular", value: complete.count || 0, color: "hsl(var(--success))" },
        { name: "Cadastro Incompleto", value: incomplete.count || 0, color: "hsl(var(--warning))" },
        { name: "Dados Bancários Pendentes", value: bankPending.count || 0, color: "hsl(var(--info))" },
        { name: "Relatórios Pendentes", value: reportsPending.count || 0, color: "hsl(var(--destructive))" }
      ].filter(item => item.value > 0);
    }
  });

  // Institutional alerts
  const { data: alerts } = useQuery({
    queryKey: ["admin-icca-alerts"],
    queryFn: async (): Promise<InstitutionalAlert[]> => {
      const alertsList: InstitutionalAlert[] = [];

      // Get organizations with pending bank validations
      const { data: bankAlerts } = await supabase
        .from("bank_accounts")
        .select(`
          id,
          user_id,
          profiles!inner(organization_id, organizations(name))
        `)
        .eq("validation_status", "pending")
        .limit(5);

      if (bankAlerts) {
        const orgCounts: Record<string, { name: string; count: number }> = {};
        bankAlerts.forEach((alert: any) => {
          const orgName = alert.profiles?.organizations?.name || "Sem organização";
          if (!orgCounts[orgName]) {
            orgCounts[orgName] = { name: orgName, count: 0 };
          }
          orgCounts[orgName].count++;
        });

        Object.entries(orgCounts).forEach(([_, data], index) => {
          alertsList.push({
            id: `bank-${index}`,
            organizationName: data.name,
            type: "Dados Bancários",
            impact: data.count > 5 ? "high" : data.count > 2 ? "medium" : "low",
            message: `${data.count} bolsista(s) com dados bancários pendentes`
          });
        });
      }

      // Get organizations with pending reports
      const { data: reportAlerts } = await supabase
        .from("reports")
        .select(`
          id,
          user_id,
          profiles!inner(organization_id, organizations(name))
        `)
        .eq("status", "under_review")
        .limit(5);

      if (reportAlerts) {
        const orgCounts: Record<string, { name: string; count: number }> = {};
        reportAlerts.forEach((alert: any) => {
          const orgName = alert.profiles?.organizations?.name || "Sem organização";
          if (!orgCounts[orgName]) {
            orgCounts[orgName] = { name: orgName, count: 0 };
          }
          orgCounts[orgName].count++;
        });

        Object.entries(orgCounts).forEach(([_, data], index) => {
          alertsList.push({
            id: `report-${index}`,
            organizationName: data.name,
            type: "Relatórios",
            impact: data.count > 10 ? "high" : data.count > 5 ? "medium" : "low",
            message: `${data.count} relatório(s) aguardando revisão`
          });
        });
      }

      return alertsList.slice(0, 10);
    }
  });

  const getImpactBadge = (impact: "high" | "medium" | "low") => {
    switch (impact) {
      case "high":
        return <Badge variant="destructive">Alto</Badge>;
      case "medium":
        return <Badge className="bg-warning text-warning-foreground">Médio</Badge>;
      case "low":
        return <Badge variant="secondary">Baixo</Badge>;
    }
  };

  if (kpisLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Organizações Ativas", value: kpis?.activeOrganizations || 0, icon: Building2, color: "primary" },
          { label: "Projetos Temáticos", value: kpis?.activeThematicProjects || 0, icon: FolderOpen, color: "info" },
          { label: "Subprojetos em Execução", value: kpis?.activeSubprojects || 0, icon: Layers, color: "success" },
          { label: "Bolsistas Ativos", value: kpis?.activeScholars || 0, icon: GraduationCap, color: "warning" },
          { label: "Pendências Críticas", value: kpis?.criticalPendencies || 0, icon: AlertTriangle, color: "destructive" },
        ].map((kpi) => (
          <Card key={kpi.label} className={`border-l-3 border-l-${kpi.color} bg-${kpi.color}/5`}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xl font-bold text-${kpi.color} leading-none`}>{kpi.value}</p>
                  <p className="text-[11px] font-medium text-muted-foreground mt-1">{kpi.label}</p>
                </div>
                <div className={`w-7 h-7 rounded flex items-center justify-center shrink-0 bg-${kpi.color}/10 text-${kpi.color}`}>
                  <kpi.icon className="w-3.5 h-3.5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bar Chart - Organizations x Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Organizações por Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {orgHealthData && orgHealthData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={orgHealthData} layout="vertical">
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="regular" name="Regular" stackId="a" fill="hsl(var(--success))" />
                  <Bar dataKey="pendencies" name="Com Pendências" stackId="a" fill="hsl(var(--warning))" />
                  <Bar dataKey="blocked" name="Bloqueado" stackId="a" fill="hsl(var(--destructive))" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>

        {/* Donut Chart - Platform Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Saúde Global da Plataforma
            </CardTitle>
          </CardHeader>
          <CardContent>
            {platformHealth && platformHealth.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={250}>
                  <PieChart>
                    <Pie
                      data={platformHealth}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {platformHealth.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {platformHealth.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }} 
                      />
                      <span className="text-sm text-muted-foreground flex-1">
                        {item.name}
                      </span>
                      <span className="text-sm font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Institutional Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Alertas Institucionais
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts && alerts.length > 0 ? (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div 
                  key={alert.id} 
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">{alert.organizationName}</span>
                      <span className="text-sm text-muted-foreground">{alert.message}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{alert.type}</Badge>
                    {getImpactBadge(alert.impact)}
                    <Button variant="ghost" size="sm">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <CheckCircle className="h-5 w-5 mr-2 text-success" />
              Nenhum alerta crítico no momento
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
