import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Building2, 
  ChevronDown, 
  DollarSign,
  CheckCircle,
  FileUp,
  Paperclip,
  Clock,
  CreditCard,
  Lock,
  User,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PaymentWithDetails {
  id: string;
  user_id: string;
  enrollment_id: string;
  reference_month: string;
  installment_number: number;
  amount: number;
  status: string;
  paid_at: string | null;
  report_id: string | null;
  scholar_name: string;
  scholar_email: string;
  project_title: string;
  project_code: string;
  thematic_project_id: string;
  thematic_project_title: string;
}

interface ThematicPaymentsGroup {
  id: string;
  title: string;
  sponsor_name: string;
  status: string;
  payments: PaymentWithDetails[];
}

interface PaymentsThematicCardProps {
  group: ThematicPaymentsGroup;
  onMarkAsPaid: (payment: PaymentWithDetails) => void;
  onAttachReceipt?: (payment: PaymentWithDetails) => void;
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

function formatReferenceMonth(refMonth: string): string {
  try {
    const [year, month] = refMonth.split("-").map(Number);
    const date = new Date(year, month - 1, 1);
    return format(date, "MMM/yyyy", { locale: ptBR });
  } catch {
    return refMonth;
  }
}

export function PaymentsThematicCard({ group, onMarkAsPaid, onAttachReceipt }: PaymentsThematicCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Calculate KPIs
  const totalPayments = group.payments.length;
  const eligiblePayments = group.payments.filter(p => p.status === 'eligible');
  const paidPayments = group.payments.filter(p => p.status === 'paid');
  const pendingPayments = group.payments.filter(p => p.status === 'pending');
  
  const totalEligibleAmount = eligiblePayments.reduce((sum, p) => sum + p.amount, 0);
  const totalPaidAmount = paidPayments.reduce((sum, p) => sum + p.amount, 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-success text-success-foreground">Ativo</Badge>;
      case 'archived':
        return <Badge variant="outline">Arquivado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card className="overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
                <DollarSign className="h-6 w-6 text-success" />
              </div>
              
              {/* Main Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {getStatusBadge(group.status)}
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">
                    Projeto Temático
                  </span>
                </div>
                <h3 className="font-semibold text-foreground text-lg leading-tight line-clamp-2">
                  {group.title}
                </h3>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-4 w-4" />
                    <span>{group.sponsor_name}</span>
                  </div>
                </div>
              </div>

              {/* KPIs */}
              <div className="hidden lg:flex items-center gap-6">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-success">
                    <CheckCircle className="h-4 w-4" />
                  </div>
                  <p className="text-xl font-semibold text-success">{eligiblePayments.length}</p>
                  <p className="text-xs text-muted-foreground">Liberados</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-primary">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <p className="text-xl font-semibold text-primary">{paidPayments.length}</p>
                  <p className="text-xs text-muted-foreground">Pagos</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-warning">
                    <Clock className="h-4 w-4" />
                  </div>
                  <p className="text-xl font-semibold text-warning">{pendingPayments.length}</p>
                  <p className="text-xs text-muted-foreground">Pendentes</p>
                </div>
                <div className="text-center border-l pl-6">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <p className="text-lg font-semibold text-success">{formatCurrency(totalEligibleAmount)}</p>
                  <p className="text-xs text-muted-foreground">A Pagar</p>
                </div>
              </div>

              {/* Expand Button */}
              <Button variant="ghost" size="icon" className="ml-2">
                <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </Button>
            </div>

            {/* Mobile KPIs */}
            <div className="lg:hidden grid grid-cols-4 gap-2 mt-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-lg font-semibold text-success">{eligiblePayments.length}</p>
                <p className="text-xs text-muted-foreground">Liberados</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-primary">{paidPayments.length}</p>
                <p className="text-xs text-muted-foreground">Pagos</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-warning">{pendingPayments.length}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold">{formatCurrency(totalEligibleAmount)}</p>
                <p className="text-xs text-muted-foreground">A Pagar</p>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Summary Stats Bar */}
            <div className="flex flex-wrap gap-4 p-4 bg-muted/30 rounded-lg text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Total Liberado:</span>
                <span className="font-semibold text-success">{formatCurrency(totalEligibleAmount)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Total Pago:</span>
                <span className="font-semibold text-primary">{formatCurrency(totalPaidAmount)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Total de Pagamentos:</span>
                <Badge variant="secondary">{totalPayments}</Badge>
              </div>
            </div>

            {/* Payments Table */}
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bolsista</TableHead>
                    <TableHead>Projeto</TableHead>
                    <TableHead>Referência</TableHead>
                    <TableHead>Parcela</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[140px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.payments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhum pagamento encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    group.payments.map((payment) => {
                      const config = statusConfig[payment.status] || statusConfig.pending;
                      const StatusIcon = config.icon;

                      return (
                        <TableRow key={payment.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                <User className="w-4 h-4 text-muted-foreground" />
                              </div>
                              <span className="font-medium">{payment.scholar_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {payment.project_code}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatReferenceMonth(payment.reference_month)}</TableCell>
                          <TableCell>{payment.installment_number}</TableCell>
                          <TableCell className="font-semibold">{formatCurrency(payment.amount)}</TableCell>
                          <TableCell>
                            <span className={cn(
                              "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border",
                              config.className
                            )}>
                              <StatusIcon className="w-3 h-3" />
                              {config.label}
                            </span>
                          </TableCell>
                          <TableCell>
                            {payment.status === "eligible" && (
                              <Button
                                size="sm"
                                onClick={() => onMarkAsPaid(payment)}
                                className="gap-1.5"
                              >
                                <CheckCircle className="w-4 h-4" />
                                Pagar
                              </Button>
                            )}
                            {payment.status === "paid" && (
                              <div className="flex items-center gap-2">
                                {payment.paid_at && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {format(parseISO(payment.paid_at), "dd/MM/yyyy")}
                                  </span>
                                )}
                                {onAttachReceipt && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onAttachReceipt(payment)}
                                    className="gap-1 h-7 px-2"
                                    title="Anexar comprovante"
                                  >
                                    <Paperclip className="w-3 h-3" />
                                    <span className="hidden sm:inline text-xs">Comprovante</span>
                                  </Button>
                                )}
                              </div>
                            )}
                            {payment.status === "pending" && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                Aguardando
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
