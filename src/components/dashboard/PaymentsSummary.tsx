import { ArrowUpRight, ArrowDownRight, Clock } from "lucide-react";

interface PaymentItem {
  id: string;
  description: string;
  value: number;
  date: string;
  type: "paid" | "pending" | "scheduled";
}

const payments: PaymentItem[] = [
  {
    id: "1",
    description: "Folha de Dezembro/2025",
    value: 45600,
    date: "05/01/2026",
    type: "paid",
  },
  {
    id: "2",
    description: "Folha de Janeiro/2026",
    value: 47200,
    date: "05/02/2026",
    type: "pending",
  },
  {
    id: "3",
    description: "Folha de Fevereiro/2026",
    value: 48100,
    date: "05/03/2026",
    type: "scheduled",
  },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

const typeConfig = {
  paid: {
    icon: ArrowUpRight,
    label: "Pago",
    className: "text-success bg-success/10",
  },
  pending: {
    icon: Clock,
    label: "Pendente",
    className: "text-warning bg-warning/10",
  },
  scheduled: {
    icon: ArrowDownRight,
    label: "Agendado",
    className: "text-info bg-info/10",
  },
};

export function PaymentsSummary() {
  return (
    <div className="card-institutional">
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-foreground">Próximos Pagamentos</h3>
        <p className="text-sm text-muted-foreground">Resumo das próximas folhas de pagamento</p>
      </div>

      <div className="space-y-4">
        {payments.map((payment) => {
          const config = typeConfig[payment.type];
          const Icon = config.icon;
          
          return (
            <div key={payment.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.className}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{payment.description}</p>
                  <p className="text-xs text-muted-foreground">{payment.date}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-foreground">{formatCurrency(payment.value)}</p>
                <p className="text-xs text-muted-foreground">{config.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
