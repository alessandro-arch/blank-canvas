import { UserPlus, FileUp, FileCheck, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

const actions = [
  {
    label: "Novo Bolsista",
    icon: UserPlus,
    variant: "default" as const,
  },
  {
    label: "Importar Dados",
    icon: FileUp,
    variant: "outline" as const,
  },
  {
    label: "Gerar Relatório",
    icon: FileCheck,
    variant: "outline" as const,
  },
  {
    label: "Enviar Notificação",
    icon: Send,
    variant: "outline" as const,
  },
];

export function QuickActions() {
  return (
    <div className="card-institutional">
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-foreground">Ações Rápidas</h3>
        <p className="text-sm text-muted-foreground">Operações mais utilizadas</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <Button 
            key={action.label} 
            variant={action.variant} 
            className="h-auto py-4 flex-col gap-2"
          >
            <action.icon className="w-5 h-5" />
            <span className="text-xs font-medium">{action.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
