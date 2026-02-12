import { ShieldAlert, Clock, CheckCircle, AlertTriangle, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";

type ValidationStatus = "pending" | "validated" | "rejected" | "under_review" | "returned";

interface BankDataValidationBannerProps {
  status: ValidationStatus;
  notesGestor?: string | null;
  onNavigateToProfile?: () => void;
}

const statusConfig = {
  pending: {
    icon: Clock,
    title: "Dados Bancários em Validação",
    description: "Seus dados bancários foram enviados e estão aguardando validação pelo gestor responsável. Os campos estão bloqueados para edição durante este período.",
    className: "bg-gradient-to-r from-info/5 via-background to-muted/30 border-info/30",
    iconClassName: "bg-info/10 text-info",
    badgeClassName: "bg-info/10 text-info",
    badgeText: "Pendente",
  },
  under_review: {
    icon: Clock,
    title: "Dados Bancários em Análise",
    description: "Seus dados bancários estão sendo analisados pelo gestor responsável. Os campos estão bloqueados para edição durante este período.",
    className: "bg-gradient-to-r from-info/5 via-background to-muted/30 border-info/30",
    iconClassName: "bg-info/10 text-info",
    badgeClassName: "bg-info/10 text-info",
    badgeText: "Em Análise",
  },
  validated: {
    icon: CheckCircle,
    title: "Dados Bancários Validados",
    description: "Seus dados bancários foram verificados e aprovados. Você está apto a receber os pagamentos das suas parcelas.",
    className: "bg-gradient-to-r from-success/5 via-background to-muted/30 border-success/30",
    iconClassName: "bg-success/10 text-success",
    badgeClassName: "bg-success/10 text-success",
    badgeText: "Aprovado",
  },
  rejected: {
    icon: ShieldAlert,
    title: "Dados Bancários Rejeitados",
    description: "Seus dados bancários foram rejeitados. Por favor, corrija as informações e envie novamente.",
    className: "bg-gradient-to-r from-destructive/5 via-background to-muted/30 border-destructive/30",
    iconClassName: "bg-destructive/10 text-destructive",
    badgeClassName: "bg-destructive/10 text-destructive",
    badgeText: "Rejeitado",
  },
  returned: {
    icon: AlertTriangle,
    title: "Dados Bancários Precisam de Correção",
    description: "O gestor solicitou correções nos seus dados bancários. Revise as informações e faça os ajustes necessários.",
    className: "bg-gradient-to-r from-destructive/5 via-background to-muted/30 border-destructive/30",
    iconClassName: "bg-destructive/10 text-destructive",
    badgeClassName: "bg-destructive/10 text-destructive",
    badgeText: "Devolvido",
  },
};

export function BankDataValidationBanner({ status, notesGestor, onNavigateToProfile }: BankDataValidationBannerProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  // Don't show banner for validated state
  if (status === "validated") {
    return null;
  }

  const showCorrectButton = status === "returned" || status === "rejected";

  return (
    <div className={`card-institutional mb-6 ${config.className}`}>
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${config.iconClassName}`}>
          <Icon className="w-6 h-6" />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground">
              {config.title}
            </h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.badgeClassName}`}>
              {config.badgeText}
            </span>
          </div>
          
          <p className="text-muted-foreground">
            {config.description}
          </p>
          
          {/* Show manager notes when returned */}
          {(status === "returned" || status === "rejected") && notesGestor && (
            <div className="mt-3 p-3 rounded-lg bg-destructive/5 border border-destructive/10">
              <p className="text-xs font-medium text-destructive mb-1">Motivo da devolução:</p>
              <p className="text-sm text-foreground">{notesGestor}</p>
            </div>
          )}
          
          {/* Button to go to profile and correct data */}
          {showCorrectButton && onNavigateToProfile && (
            <div className="mt-4">
              <Button 
                size="sm" 
                variant="default"
                onClick={onNavigateToProfile}
                className="gap-2"
              >
                <Edit className="w-4 h-4" />
                Corrigir Dados Bancários
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
