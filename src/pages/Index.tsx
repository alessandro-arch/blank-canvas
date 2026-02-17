import { useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ScholarGreeting } from "@/components/scholar/ScholarGreeting";
import { ThematicProjectContext } from "@/components/scholar/ThematicProjectContext";
import { ScholarProfileCard } from "@/components/scholar/ScholarProfileCard";
import { ScholarSummaryCards } from "@/components/scholar/ScholarSummaryCards";
import { ScholarWorkflowBanner } from "@/components/scholar/ScholarWorkflowBanner";
import { DocumentsSection } from "@/components/scholar/DocumentsSection";
import { AwaitingAssignmentBanner } from "@/components/scholar/AwaitingAssignmentBanner";
import { BankDataPendingBanner } from "@/components/scholar/BankDataPendingBanner";
import { BankDataValidationBanner } from "@/components/scholar/BankDataValidationBanner";
import { useScholarPayments } from "@/hooks/useScholarPayments";
import { useBankDataStatus } from "@/hooks/useBankDataStatus";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const Index = () => {
  const navigate = useNavigate();
  const { data, loading: paymentsLoading, error, refresh } = useScholarPayments();
  const { status: bankStatus, loading: bankLoading, notesGestor } = useBankDataStatus();

  const loading = paymentsLoading || bankLoading;
  const hasActiveEnrollment = data?.enrollment !== null;
  
  // Calculate approved reports count
  const approvedReportsCount = data?.reports?.filter(r => r.status === "approved").length ?? 0;

  const handleNavigateToProfile = () => {
    navigate("/bolsista/perfil");
  };

  // Determine which bank status banner to show
  const showBankValidationBanner = bankStatus === "pending" || bankStatus === "under_review" || bankStatus === "returned" || bankStatus === "rejected";

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <Header />
        
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {/* Scholar Greeting */}
          <div className="animate-fade-in">
            <ScholarGreeting hasActiveEnrollment={hasActiveEnrollment} loading={loading} />
          </div>

          {/* Error State with Retry */}
          {error && (
            <div className="animate-fade-in mb-6">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <span className="flex-1">{error}. Por favor, tente novamente.</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 w-fit"
                    onClick={() => refresh()}
                  >
                    <RefreshCw className="w-4 h-4" />
                    Tentar novamente
                  </Button>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {loading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="h-24 rounded-lg" />
                ))}
              </div>
              <Skeleton className="h-40 rounded-lg" />
              <Skeleton className="h-32 rounded-lg" />
            </div>
          ) : !hasActiveEnrollment ? (
            <>
              {/* Thematic Project Context - Empty State */}
              <div className="animate-fade-in" style={{ animationDelay: "75ms" }}>
                <ThematicProjectContext 
                  project={null} 
                  enrollment={null} 
                  loading={false} 
                />
              </div>
              
              {/* Summary Cards - Empty State */}
              <div className="animate-fade-in" style={{ animationDelay: "100ms" }}>
                <ScholarSummaryCards 
                  enrollment={null}
                  stats={null}
                  approvedReportsCount={0}
                  loading={false}
                />
              </div>
              
              {/* Awaiting Assignment Banner */}
              <div className="animate-fade-in" style={{ animationDelay: "125ms" }}>
                <AwaitingAssignmentBanner />
              </div>
            </>
          ) : (
            <>
              {/* Thematic Project Context */}
              <div className="animate-fade-in" style={{ animationDelay: "75ms" }}>
                <ThematicProjectContext 
                  project={data?.enrollment?.project ?? null} 
                  enrollment={data?.enrollment ?? null} 
                  loading={false} 
                />
              </div>

              {/* Scholar Profile Card */}
              <div className="animate-fade-in" style={{ animationDelay: "100ms" }}>
                <ScholarProfileCard 
                  enrollment={data?.enrollment ?? null}
                  loading={false}
                />
              </div>

              {/* Bank Data Status Banners */}
              {bankStatus === "not_filled" && (
                <div className="animate-fade-in" style={{ animationDelay: "100ms" }}>
                  <BankDataPendingBanner onNavigateToProfile={handleNavigateToProfile} />
                </div>
              )}
              
              {showBankValidationBanner && (
                <div className="animate-fade-in" style={{ animationDelay: "100ms" }}>
                  <BankDataValidationBanner 
                    status={bankStatus as "pending" | "under_review" | "returned" | "rejected"} 
                    notesGestor={notesGestor}
                    onNavigateToProfile={handleNavigateToProfile}
                  />
                </div>
              )}

              {/* Summary Cards with Real Data */}
              <div className="animate-fade-in" style={{ animationDelay: "150ms" }}>
                <ScholarSummaryCards 
                  enrollment={data?.enrollment ?? null}
                  stats={data?.stats ?? null}
                  approvedReportsCount={approvedReportsCount}
                  loading={false}
                />
              </div>

              {/* Workflow Banner */}
              <div className="animate-fade-in" style={{ animationDelay: "175ms" }}>
                <ScholarWorkflowBanner />
              </div>

              {/* Documents Section */}
              <div className="animate-fade-in" style={{ animationDelay: "190ms" }}>
                <DocumentsSection />
              </div>
            </>
          )}
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default Index;
