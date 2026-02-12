import { useAuth } from "@/contexts/AuthContext";
import { Calendar, BookOpen, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ScholarGreetingProps {
  hasActiveEnrollment: boolean;
  loading: boolean;
}

export function ScholarGreeting({ hasActiveEnrollment, loading }: ScholarGreetingProps) {
  const { user } = useAuth();
  
  // Get user's name from metadata or email
  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Bolsista";
  const firstName = userName.split(" ")[0];
  
  // Format current date
  const currentDate = format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
  const capitalizedDate = currentDate.charAt(0).toUpperCase() + currentDate.slice(1);
  
  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  return (
    <div className="card-institutional mb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Calendar className="w-4 h-4" />
            <span>{capitalizedDate}</span>
          </div>
          
          <h1 className="text-2xl font-bold text-foreground mb-1">
            Meu Painel
          </h1>
          
          <p className="text-lg text-foreground">
            {getGreeting()}, <span className="font-semibold text-primary">{firstName}</span>!
          </p>
          
          <p className="text-muted-foreground mt-2 max-w-xl">
            {hasActiveEnrollment 
              ? "Este é o seu painel de acompanhamento da bolsa, relatórios e pagamentos. Mantenha seus relatórios em dia para garantir a continuidade dos pagamentos."
              : "Bem-vindo ao portal de bolsistas. Seu cadastro está completo e aguardando atribuição de bolsa pelo gestor."
            }
          </p>
        </div>
        
        {!loading && (
          <div className="flex-shrink-0">
            <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${
              hasActiveEnrollment 
                ? "bg-primary/5 border-primary/10" 
                : "bg-warning/5 border-warning/20"
            }`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                hasActiveEnrollment 
                  ? "bg-primary/10" 
                  : "bg-warning/10"
              }`}>
                {hasActiveEnrollment ? (
                  <BookOpen className="w-5 h-5 text-primary" />
                ) : (
                  <Clock className="w-5 h-5 text-warning" />
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status da Bolsa</p>
                {hasActiveEnrollment ? (
                  <p className="text-sm font-semibold text-success flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-success" />
                    Ativa
                  </p>
                ) : (
                  <p className="text-sm font-semibold text-warning flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-warning" />
                    Aguardando Atribuição
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
