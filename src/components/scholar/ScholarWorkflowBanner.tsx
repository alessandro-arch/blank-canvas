import { FileUp, Search, CheckCircle, Banknote, ArrowRight, Info } from "lucide-react";

const workflowSteps = [
  {
    icon: FileUp,
    label: "Enviar Relatório",
    description: "Até o dia 25",
    status: "default" as const,
  },
  {
    icon: Search,
    label: "Em Análise",
    description: "Avaliação do gestor",
    status: "default" as const,
  },
  {
    icon: CheckCircle,
    label: "Aprovado",
    description: "Relatório aceito",
    status: "default" as const,
  },
  {
    icon: Banknote,
    label: "Pagamento Liberado",
    description: "Depósito em conta",
    status: "success" as const,
  },
];

export function ScholarWorkflowBanner() {
  return (
    <div className="card-institutional mb-6 bg-gradient-to-r from-primary/5 via-background to-success/5 border-primary/20">
      {/* Header */}
      <div className="flex items-start gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Info className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Como funciona o pagamento?</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            O pagamento mensal só é liberado após o envio e aprovação do seu relatório de atividades.
          </p>
        </div>
      </div>

      {/* Workflow Steps */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-0">
        {workflowSteps.map((step, index) => (
          <div key={index} className="flex items-center gap-3 sm:gap-0 flex-1">
            {/* Step */}
            <div className="flex items-center gap-3 flex-1">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  step.status === "success" 
                    ? "bg-success/10 text-success" 
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <step.icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-medium ${
                  step.status === "success" ? "text-success" : "text-foreground"
                }`}>
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </div>

            {/* Arrow (not on last item) */}
            {index < workflowSteps.length - 1 && (
              <div className="hidden sm:flex items-center justify-center w-8 flex-shrink-0">
                <ArrowRight className="w-4 h-4 text-muted-foreground/50" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Tip */}
      <div className="mt-5 pt-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-warning" />
          <strong className="text-foreground font-medium">Dica:</strong> 
          Envie seu relatório até o dia 25 de cada mês para evitar atrasos no pagamento no mês posterior.
        </p>
      </div>
    </div>
  );
}
