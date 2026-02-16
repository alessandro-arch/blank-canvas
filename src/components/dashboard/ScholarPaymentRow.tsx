import { useState } from "react";
import {
  ChevronDown,
  User,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  Lock,
  DollarSign,
  Paperclip,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface PaymentRecord {
  id: string;
  user_id: string;
  enrollment_id: string;
  reference_month: string;
  installment_number: number;
  amount: number;
  status: string;
  paid_at: string | null;
  report_id: string | null;
  receipt_url: string | null;
}

export interface ScholarPaymentRow {
  user_id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  has_bank_data: boolean;
  project_title: string;
  project_code: string;
  thematic_project_title: string;
  enrollment_id: string;
  current_payment: PaymentRecord | null;
  all_payments: PaymentRecord[];
}

interface ScholarPaymentRowProps {
  scholar: ScholarPaymentRow;
  onMarkAsPaid: (payment: PaymentRecord, scholar: ScholarPaymentRow) => void;
  onAttachReceipt: (payment: PaymentRecord, scholar: ScholarPaymentRow) => void;
  onSendReminder: (scholar: ScholarPaymentRow) => void;
}

const statusConfig: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  pending: { label: "Pendente", icon: Clock, className: "bg-warning/10 text-warning border-warning/20" },
  eligible: { label: "Liberado", icon: CheckCircle, className: "bg-success/10 text-success border-success/20" },
  paid: { label: "Pago", icon: CreditCard, className: "bg-primary/10 text-primary border-primary/20" },
  cancelled: { label: "Cancelado", icon: Lock, className: "bg-destructive/10 text-destructive border-destructive/20" },
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
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

export function ScholarPaymentRowComponent({
  scholar,
  onMarkAsPaid,
  onAttachReceipt,
  onSendReminder,
}: ScholarPaymentRowProps) {
  const [isOpen, setIsOpen] = useState(false);

  const payment = scholar.current_payment;
  const paymentStatus = payment?.status || "pending";
  const config = statusConfig[paymentStatus] || statusConfig.pending;
  const StatusIcon = config.icon;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      {/* Main Row */}
      <CollapsibleTrigger asChild>
        <TableRow className="cursor-pointer hover:bg-muted/50 transition-colors group">
          {/* Scholar */}
          <TableCell>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{scholar.full_name}</p>
                <p className="text-xs text-muted-foreground truncate">{scholar.email}</p>
              </div>
            </div>
          </TableCell>

          {/* Project */}
          <TableCell>
            <div>
              <Badge variant="outline" className="text-xs mb-0.5">{scholar.project_code}</Badge>
              <p className="text-xs text-muted-foreground truncate max-w-[200px]">{scholar.thematic_project_title}</p>
            </div>
          </TableCell>

          {/* Amount */}
          <TableCell>
            {payment ? (
              <span className="font-semibold text-sm">{formatCurrency(payment.amount)}</span>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </TableCell>

          {/* Status badge */}
          <TableCell>
            <span className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
              config.className
            )}>
              <StatusIcon className="w-3 h-3" />
              {config.label}
            </span>
          </TableCell>

          {/* Paid date */}
          <TableCell>
            {payment?.paid_at ? (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(parseISO(payment.paid_at), "dd/MM/yyyy")}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </TableCell>

          {/* Actions */}
          <TableCell>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-xs"
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
              >
                <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
                Histórico
              </Button>
            </div>
          </TableCell>
        </TableRow>
      </CollapsibleTrigger>

      {/* Expanded History Panel */}
      <CollapsibleContent asChild>
        <tr>
          <td colSpan={6} className="p-0">
            <div className="bg-muted/30 border-t border-b px-6 py-4 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h4 className="font-semibold text-sm">Pagamentos de {scholar.full_name}</h4>
                  <div className="flex gap-1.5">
                    {scholar.is_active ? (
                      <Badge className="bg-success/10 text-success border-success/20 text-[10px]">Ativo</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">Inativo</Badge>
                    )}
                    {!scholar.has_bank_data && (
                      <Badge variant="outline" className="text-warning border-warning/30 text-[10px]">
                        Sem dados bancários
                      </Badge>
                    )}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {scholar.all_payments.length} pagamento(s)
                </span>
              </div>

              {/* Inner payments table */}
              {scholar.all_payments.length === 0 ? (
                <div className="text-center py-8 border rounded-lg bg-background">
                  <DollarSign className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground mb-3">
                    Sem pagamento nesta competência
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => onSendReminder(scholar)}
                  >
                    <Send className="w-3.5 h-3.5" />
                    Enviar lembrete
                  </Button>
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden bg-background">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-xs">Competência</TableHead>
                        <TableHead className="text-xs">Parcela</TableHead>
                        <TableHead className="text-xs">Valor</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Pago em</TableHead>
                        <TableHead className="text-xs w-[200px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scholar.all_payments.map((p) => {
                        const pConfig = statusConfig[p.status] || statusConfig.pending;
                        const PIcon = pConfig.icon;
                        return (
                          <TableRow key={p.id}>
                            <TableCell className="text-sm font-medium">
                              {formatMonth(p.reference_month)}
                            </TableCell>
                            <TableCell className="text-sm">
                              {p.installment_number}
                            </TableCell>
                            <TableCell className="text-sm font-semibold">
                              {formatCurrency(p.amount)}
                            </TableCell>
                            <TableCell>
                              <span className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border",
                                pConfig.className
                              )}>
                                <PIcon className="w-3 h-3" />
                                {pConfig.label}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {p.paid_at
                                ? format(parseISO(p.paid_at), "dd/MM/yyyy")
                                : "—"
                              }
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 flex-wrap">
                                {p.status === "eligible" && (
                                  <Button
                                    size="sm"
                                    className="gap-1 text-xs h-7 px-2"
                                    onClick={() => onMarkAsPaid(p, scholar)}
                                  >
                                    <CheckCircle className="w-3 h-3" />
                                    Pagar
                                  </Button>
                                )}
                                {p.status === "paid" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1 text-xs h-7 px-2"
                                    onClick={() => onAttachReceipt(p, scholar)}
                                  >
                                    <Paperclip className="w-3 h-3" />
                                    Comprovante
                                  </Button>
                                )}
                                {p.status === "pending" && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Lock className="w-3 h-3" />
                                    Aguardando
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </td>
        </tr>
      </CollapsibleContent>
    </Collapsible>
  );
}
