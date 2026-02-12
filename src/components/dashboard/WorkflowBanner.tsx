import { FileText, Clock, CheckCircle, DollarSign, ArrowRight, Send, Search } from "lucide-react";

const steps = [
  {
    icon: Send,
    title: "Envio do Relatório",
    description: "Bolsista envia até o dia 25",
    status: "Pendente → Enviado",
  },
  {
    icon: Search,
    title: "Análise",
    description: "Gestor analisa o relatório",
    status: "Em Análise",
  },
  {
    icon: CheckCircle,
    title: "Aprovação",
    description: "Aprovado ou devolvido com parecer",
    status: "Aprovado / Devolvido",
  },
  {
    icon: DollarSign,
    title: "Pagamento",
    description: "Liberação e processamento",
    status: "Apto → Pago",
  },
];

export function WorkflowBanner() {
  return (
    <div className="card-institutional mb-6 bg-gradient-to-r from-primary/5 via-card to-info/5">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-primary" />
        <h4 className="text-sm font-semibold text-foreground">Como funciona o ciclo de pagamento?</h4>
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-2">
        {steps.map((step, index) => (
          <div key={step.title} className="flex items-center gap-3 md:gap-2 flex-1">
            {/* Step */}
            <div className="flex items-center gap-3 flex-1">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <step.icon className="w-5 h-5 text-primary" />
                </div>
                <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                  {index + 1}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{step.title}</p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                  {step.status}
                </span>
              </div>
            </div>

            {/* Arrow */}
            {index < steps.length - 1 && (
              <ArrowRight className="hidden md:block w-5 h-5 text-muted-foreground/50 flex-shrink-0 mx-2" />
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground">
          <strong>Prazo:</strong> Envio até o dia 25 do mês • Pagamento até o 5º dia útil do mês seguinte • 
          <strong> Exceção:</strong> Primeira parcela é liberada automaticamente • 
          <strong> Devolução:</strong> Permite reenvio com histórico de versões
        </p>
      </div>
    </div>
  );
}
