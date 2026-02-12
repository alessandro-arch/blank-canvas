import { Building2, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BankDataPendingBannerProps {
  onNavigateToProfile: () => void;
}

export function BankDataPendingBanner({ onNavigateToProfile }: BankDataPendingBannerProps) {
  return (
    <div className="card-institutional mb-6 bg-gradient-to-r from-warning/5 via-background to-muted/30 border-warning/30">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center flex-shrink-0">
          <Building2 className="w-6 h-6 text-warning" />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground">
              Dados Bancários Pendentes
            </h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning">
              Ação necessária
            </span>
          </div>
          
          <p className="text-muted-foreground mb-4">
            Para receber suas parcelas, é necessário cadastrar seus dados bancários. 
            Preencha as informações da sua conta para que possamos processar os pagamentos.
          </p>
          
          <div className="flex items-center gap-3">
            <Button onClick={onNavigateToProfile} className="gap-2">
              <Building2 className="w-4 h-4" />
              Cadastrar Dados Bancários
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-border/50">
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>
            Os pagamentos só serão liberados após a validação dos dados bancários pelo gestor responsável.
          </p>
        </div>
      </div>
    </div>
  );
}
