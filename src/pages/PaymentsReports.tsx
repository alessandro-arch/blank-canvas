import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ScholarStats } from "@/components/scholar/ScholarStats";
import { ScholarProfileCard } from "@/components/scholar/ScholarProfileCard";
import { InstallmentsTable } from "@/components/scholar/InstallmentsTable";
import { MonthlyReportSection } from "@/components/scholar/monthly-report/MonthlyReportSection";
import { ArrowLeft, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useScholarPayments } from "@/hooks/useScholarPayments";


const PaymentsReports = () => {
  const { data, loading, error, refresh } = useScholarPayments();

  const hasEnrollment = !!data?.enrollment;
  const enrollment = data?.enrollment;

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <Header />
        
        <main className="flex-1 p-6 overflow-auto">
          {/* Back button */}
          <div className="flex items-center gap-4 mb-6">
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
            </Link>
          </div>

          {/* Scholar Profile Header */}
          <ScholarProfileCard 
            enrollment={data?.enrollment ?? null}
            loading={loading}
          />

          {/* Page Title */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-foreground">Pagamentos e Relatórios</h2>
            <p className="text-muted-foreground">Acompanhe suas parcelas e envie seus relatórios mensais</p>
          </div>

          {/* Error State */}
          {error && (
            <div className="card-institutional bg-destructive/5 border-destructive/20 mb-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-destructive" />
                <p className="text-destructive">{error}</p>
              </div>
            </div>
          )}

          {/* No enrollment state */}
          {!loading && !hasEnrollment && (
            <div className="card-institutional">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mb-4">
                  <Clock className="w-8 h-8 text-warning" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Aguardando Atribuição de Bolsa
                </h3>
                <p className="text-muted-foreground max-w-md">
                  Os pagamentos e relatórios serão exibidos após o gestor atribuir um subprojeto à sua conta.
                </p>
              </div>
            </div>
          )}

          {/* Stats Cards - only show if has enrollment */}
          {(loading || hasEnrollment) && (
            <div className="animate-fade-in">
              <ScholarStats 
                totalForecast={data?.stats.totalForecast || 0}
                totalReceived={data?.stats.totalReceived || 0}
                totalInstallments={data?.stats.totalInstallments || 0}
                paidInstallments={data?.stats.paidInstallments || 0}
                reportsSent={data?.stats.reportsSent || 0}
                pendingReports={data?.stats.pendingReports || 0}
                grantValue={enrollment ? Number(enrollment.grant_value) : 0}
                loading={loading}
              />
            </div>
          )}

          {/* Monthly Report Form */}
          {(loading || hasEnrollment) && (
            <div className="animate-fade-in mb-6" style={{ animationDelay: "50ms" }}>
              <MonthlyReportSection projectId={enrollment?.project_id || null} />
            </div>
          )}

          {/* Installments Table - only show if has enrollment */}
          {(loading || hasEnrollment) && (
            <div className="animate-fade-in" style={{ animationDelay: "150ms" }}>
              <InstallmentsTable 
                payments={data?.payments || []}
                grantValue={enrollment ? Number(enrollment.grant_value) : 0}
                startDate={enrollment?.start_date || ""}
                loading={loading}
                onRefresh={refresh}
                enrollmentId={enrollment?.id || ""}
              />
            </div>
          )}
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default PaymentsReports;
