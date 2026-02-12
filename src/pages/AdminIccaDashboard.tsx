import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AdminBanner } from "@/components/admin/AdminBanner";
import { AdminMasterModeProvider } from "@/contexts/AdminMasterModeContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Building2, 
  LayoutDashboard, 
  FolderOpen, 
  GraduationCap, 
  DollarSign, 
  ShieldAlert,
  BarChart3,
  Brain
} from "lucide-react";

// Tab components
import { InstitutionalOverviewTab } from "@/components/admin-icca/InstitutionalOverviewTab";
import { OrganizationsTab } from "@/components/admin-icca/OrganizationsTab";
import { ThematicProjectsTab } from "@/components/admin-icca/ThematicProjectsTab";
import { ScholarsTab } from "@/components/admin-icca/ScholarsTab";
import { PaymentsGovernanceTab } from "@/components/admin-icca/PaymentsGovernanceTab";
import { AuditGovernanceTab } from "@/components/admin-icca/AuditGovernanceTab";
import { AnalyticsTab } from "@/components/admin-icca/AnalyticsTab";
import { PredictiveTab } from "@/components/admin-icca/PredictiveTab";

const AdminIccaDashboard = () => {
  return (
    <AdminMasterModeProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar />
        
        <div className="flex-1 flex flex-col">
          <AdminBanner />
          <Header />
          
          <main className="flex-1 p-6 overflow-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-foreground">
                Dashboard Estratégico
              </h1>
              <p className="text-muted-foreground">
                Visão multi-organização para governança institucional
              </p>
            </div>

            <Tabs defaultValue="institucional" className="space-y-6">
              <TabsList className="grid w-full grid-cols-8 h-auto p-1 bg-muted/50">
                <TabsTrigger 
                  value="institucional" 
                  className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="hidden lg:inline">Visão Institucional</span>
                  <span className="lg:hidden">Visão</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="analytics" 
                  className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden lg:inline">Analytics</span>
                  <span className="lg:hidden">Stats</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="predictive" 
                  className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Brain className="h-4 w-4" />
                  <span className="hidden lg:inline">Preditivo</span>
                  <span className="lg:hidden">AI</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="organizacoes" 
                  className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Building2 className="h-4 w-4" />
                  <span className="hidden lg:inline">Organizações</span>
                  <span className="lg:hidden">Orgs</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="projetos" 
                  className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <FolderOpen className="h-4 w-4" />
                  <span className="hidden lg:inline">Projetos</span>
                  <span className="lg:hidden">Proj</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="bolsistas" 
                  className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <GraduationCap className="h-4 w-4" />
                  <span className="hidden lg:inline">Bolsistas</span>
                  <span className="lg:hidden">Bolsas</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="pagamentos" 
                  className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <DollarSign className="h-4 w-4" />
                  <span className="hidden lg:inline">Pagamentos</span>
                  <span className="lg:hidden">Pagtos</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="auditoria" 
                  className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <ShieldAlert className="h-4 w-4" />
                  <span className="hidden lg:inline">Auditoria</span>
                  <span className="lg:hidden">Audit</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="institucional" className="space-y-6 animate-fade-in">
                <InstitutionalOverviewTab />
              </TabsContent>

              <TabsContent value="analytics" className="space-y-6 animate-fade-in">
                <AnalyticsTab />
              </TabsContent>

              <TabsContent value="predictive" className="space-y-6 animate-fade-in">
                <PredictiveTab />
              </TabsContent>

              <TabsContent value="organizacoes" className="space-y-6 animate-fade-in">
                <OrganizationsTab />
              </TabsContent>

              <TabsContent value="projetos" className="space-y-6 animate-fade-in">
                <ThematicProjectsTab />
              </TabsContent>

              <TabsContent value="bolsistas" className="space-y-6 animate-fade-in">
                <ScholarsTab />
              </TabsContent>

              <TabsContent value="pagamentos" className="space-y-6 animate-fade-in">
                <PaymentsGovernanceTab />
              </TabsContent>

              <TabsContent value="auditoria" className="space-y-6 animate-fade-in">
                <AuditGovernanceTab />
              </TabsContent>
            </Tabs>
          </main>
          <Footer />
        </div>
      </div>
    </AdminMasterModeProvider>
  );
};

export default AdminIccaDashboard;
