import { useState } from "react";
import {
  User,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  Lock,
  DollarSign,
  Paperclip,
  ChevronDown,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ScholarPaymentRow, PaymentRecord } from "./ScholarPaymentRow";

const statusConfig: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  pending: { label: "Pendente", icon: Clock, className: "bg-warning/10 text-warning border-warning/20" },
  eligible: { label: "Liberado", icon: CheckCircle, className: "bg-success/10 text-success border-success/20" },
  paid: { label: "Pago", icon: CreditCard, className: "bg-primary/10 text-primary border-primary/20" },
  cancelled: { label: "Cancelado", icon: Lock, className: "bg-destructive/10 text-destructive border-destructive/20" },
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatMonth(refMonth: string): string {
  try {
    const [year, month] = refMonth.split("-").map(Number);
    const d = new Date(year, month - 1, 1);
    return format(d, "MMM/yyyy", { locale: ptBR });
  } catch {
    return refMonth;
  }
}

interface PaymentMobileCardProps {
  scholar: ScholarPaymentRow;
  onMarkAsPaid: (payment: PaymentRecord, scholar: ScholarPaymentRow) => void;
  onAttachReceipt: (payment: PaymentRecord, scholar: ScholarPaymentRow) => void;
  onSendReminder: (scholar: ScholarPaymentRow) => void;
}

export function PaymentMobileCard({ scholar, onMarkAsPaid, onAttachReceipt, onSendReminder }: PaymentMobileCardProps) {
  const [detailOpen, setDetailOpen] = useState(false);

  const payment = scholar.current_payment;
  const paymentStatus = payment?.status || "pending";
  const config = statusConfig[paymentStatus] || statusConfig.pending;
  const StatusIcon = config.icon;

  return (
    <>
      <div className="p-4 border rounded-lg bg-card space-y-3">
        {/* Scholar info + status */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{scholar.full_name}</p>
              <p className="text-xs text-muted-foreground truncate">{scholar.project_code}</p>
            </div>
          </div>
          <span className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border whitespace-nowrap",
            config.className,
          )}>
            <StatusIcon className="w-3 h-3" />
            {config.label}
          </span>
        </div>

        {/* Amount + paid date */}
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">
            {payment ? formatCurrency(payment.amount) : "—"}
          </span>
          {payment?.paid_at ? (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(parseISO(payment.paid_at), "dd/MM/yyyy")}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Não pago</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setDetailOpen(true)}>
            <Eye className="w-3.5 h-3.5 mr-1" />
            Ver detalhes
          </Button>
          {payment?.status === "eligible" && (
            <Button size="sm" className="flex-1 text-xs" onClick={() => onMarkAsPaid(payment, scholar)}>
              <CheckCircle className="w-3.5 h-3.5 mr-1" />
              Pagar
            </Button>
          )}
          {payment?.status === "paid" && (
            <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => onAttachReceipt(payment, scholar)}>
              <Paperclip className="w-3.5 h-3.5 mr-1" />
              Comprovante
            </Button>
          )}
        </div>
      </div>

      {/* Detail modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">{scholar.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Email</p>
                <p className="truncate">{scholar.email}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Projeto</p>
                <p className="truncate">{scholar.project_code}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Projeto Temático</p>
                <p className="truncate">{scholar.thematic_project_title}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Dados bancários</p>
                <p>{scholar.has_bank_data ? "Sim" : "Não"}</p>
              </div>
            </div>

            {/* Payment history */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                Histórico ({scholar.all_payments.length})
              </p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {scholar.all_payments.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Sem pagamentos</p>
                ) : (
                  scholar.all_payments.map((p) => {
                    const pConfig = statusConfig[p.status] || statusConfig.pending;
                    const PIcon = pConfig.icon;
                    return (
                      <div key={p.id} className="flex items-center justify-between p-2 rounded border bg-muted/30 text-sm">
                        <div>
                          <p className="font-medium text-xs">{formatMonth(p.reference_month)}</p>
                          <p className="font-semibold">{formatCurrency(p.amount)}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border",
                            pConfig.className,
                          )}>
                            <PIcon className="w-2.5 h-2.5" />
                            {pConfig.label}
                          </span>
                          {p.paid_at && (
                            <span className="text-[10px] text-muted-foreground">
                              {format(parseISO(p.paid_at), "dd/MM/yy")}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
