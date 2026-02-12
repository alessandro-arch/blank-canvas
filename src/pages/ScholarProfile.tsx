import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ScholarDataCards } from "@/components/scholar/ScholarDataCards";
import { ArrowLeft, User, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useScholarEnrollment } from "@/hooks/useScholarEnrollment";

const ScholarProfile = () => {
  const { hasActiveEnrollment, loading } = useScholarEnrollment();

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

          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Dados do Bolsista</h1>
                <p className="text-muted-foreground">Visualize informações pessoais, do projeto e bancárias</p>
              </div>
            </div>
            {!loading && (
              <div className="flex items-center gap-2">
                {hasActiveEnrollment ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-success/10 text-success">
                    <span className="w-2 h-2 rounded-full bg-current" />
                    Bolsa Ativa
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-warning/10 text-warning">
                    <Clock className="w-4 h-4" />
                    Aguardando Atribuição
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Scholar Data Cards */}
          <div className="animate-fade-in">
            <ScholarDataCards />
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default ScholarProfile;
