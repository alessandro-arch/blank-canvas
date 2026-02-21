import { useState } from "react";
import { 
  History, 
  FileSearch, 
  Download, 
  MoreHorizontal,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  CalendarClock,
  Lock,
  Loader2,
  Info,
  Eye,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ReportVersionsDialog, type ReportVersion } from "./ReportVersionsDialog";
import { openReportPdf, downloadReportPdf, downloadPaymentReceipt } from "@/hooks/useSignedUrl";
import { Link } from "react-router-dom";
import type { PaymentWithReport } from "@/hooks/useScholarPayments";
import { format, parseISO, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";

type ReportStatus = "pending" | "submitted" | "under_review" | "approved" | "rejected" | "deadline_expired" | "future";
type PaymentStatus = "blocked" | "eligible" | "processing" | "paid" | "future" | "pending" | "cancelled";
type MonthStatus = "past" | "current" | "future";

interface Installment {
  id: string;
  number: number;
  referenceMonth: string;
  referenceMonthRaw: string;
  value: number;
  reportStatus: ReportStatus;
  paymentStatus: PaymentStatus;
  paymentDate?: string;
  feedback?: string;
  isFirstInstallment?: boolean;
  versions?: ReportVersion[];
  monthStatus: MonthStatus;
  enrollmentId: string;
  hasReportUnderReview: boolean;
  reportFileUrl?: string;
  resubmissionDeadline?: string;
  isDeadlineExpired?: boolean;
  receiptUrl?: string;
}

const reportStatusConfig: Record<ReportStatus, { label: string; icon: typeof Clock; className: string }> = {
  pending: { label: "Pendente de Envio", icon: Clock, className: "bg-warning/10 text-warning" },
  submitted: { label: "Enviado", icon: CheckCircle, className: "bg-info/10 text-info" },
  under_review: { label: "Em Análise", icon: Search, className: "bg-primary/10 text-primary" },
  approved: { label: "Aprovado", icon: CheckCircle, className: "bg-success/10 text-success" },
  rejected: { label: "Devolvido", icon: XCircle, className: "bg-destructive/10 text-destructive" },
  deadline_expired: { label: "Prazo Expirado", icon: Lock, className: "bg-destructive/10 text-destructive" },
  future: { label: "Aguardando", icon: CalendarClock, className: "bg-muted text-muted-foreground" },
};

const paymentStatusConfig: Record<PaymentStatus, { label: string; className: string }> = {
  blocked: { label: "Bloqueado", className: "bg-destructive/10 text-destructive" },
  pending: { label: "Pendente", className: "bg-warning/10 text-warning" },
  eligible: { label: "Liberado", className: "bg-success/10 text-success" },
  processing: { label: "Processando", className: "bg-info/10 text-info" },
  paid: { label: "Pago", className: "bg-success/10 text-success" },
  future: { label: "Futuro", className: "bg-muted text-muted-foreground" },
  cancelled: { label: "Cancelado", className: "bg-destructive/10 text-destructive" },
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function StatusBadge({ status, config }: { status: string; config: { label: string; className: string } }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", config.className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {config.label}
    </span>
  );
}

function MonthIndicator({ monthStatus }: { monthStatus: MonthStatus }) {
  if (monthStatus === "current") {
    return (
      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-primary text-primary-foreground">
        MÊS ATUAL
      </span>
    );
  }
  if (monthStatus === "future") {
    return (
      <span className="px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
        FUTURO
      </span>
    );
  }
  return null;
}

interface InstallmentActionsProps {
  installment: Installment;
  onRefresh: () => void;
}

function InstallmentActions({ installment, onRefresh }: InstallmentActionsProps) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);

  const isFutureMonth = installment.monthStatus === "future";
  const canViewFeedback = (installment.reportStatus === "rejected" || installment.reportStatus === "deadline_expired") && installment.feedback;
  const canDownloadReceipt = installment.paymentStatus === "paid" && installment.receiptUrl;
  const hasVersions = installment.versions && installment.versions.length > 0;

  // Contextual message based on status
  const getContextualMessage = (): string | null => {
    if (installment.reportStatus === "approved") return null;
    if (installment.reportStatus === "under_review") return "Relatório em análise";
    if (installment.reportStatus === "pending") return "Envie via Relatório Mensal";
    if (installment.reportStatus === "rejected") return "Reenvie via Relatório Mensal";
    return null;
  };

  // Future months - no actions available
  if (isFutureMonth) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Lock className="w-4 h-4" />
        <span className="text-xs">Aguardando período</span>
      </div>
    );
  }

  const contextualMessage = getContextualMessage();

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {/* Contextual message + link to subproject */}
        {contextualMessage && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="/bolsista/painel">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="gap-1.5 text-xs border-primary/30 text-primary"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Acessar Subprojeto
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[250px]">
              <p>{contextualMessage}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* More Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded hover:bg-muted transition-colors">
              <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {hasVersions && (
              <DropdownMenuItem 
                className="gap-2"
                onSelect={() => setVersionsOpen(true)}
              >
                <History className="w-4 h-4" />
                Ver versões ({installment.versions?.length})
              </DropdownMenuItem>
            )}
            
            {installment.reportFileUrl && (
              <>
                <DropdownMenuItem 
                  className="gap-2"
                  onSelect={(e) => {
                    e.preventDefault();
                    openReportPdf(installment.reportFileUrl!);
                  }}
                >
                  <Eye className="w-4 h-4" />
                  Visualizar PDF
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="gap-2"
                  onSelect={(e) => {
                    e.preventDefault();
                    downloadReportPdf(installment.reportFileUrl!, `relatorio_${installment.referenceMonthRaw}.pdf`);
                  }}
                >
                  <Download className="w-4 h-4" />
                  Baixar relatório
                </DropdownMenuItem>
              </>
            )}
            
            {canViewFeedback && (
              <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
                <DialogTrigger asChild>
                  <DropdownMenuItem className="gap-2" onSelect={(e) => e.preventDefault()}>
                    <FileSearch className="w-4 h-4" />
                    Visualizar parecer
                  </DropdownMenuItem>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Parecer - {installment.referenceMonth}</DialogTitle>
                    <DialogDescription>
                      Feedback do gestor sobre o relatório enviado
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mt-4 p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
                    <div className="flex items-start gap-3">
                      <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-destructive mb-1">Relatório Devolvido</p>
                        <p className="text-sm text-foreground">{installment.feedback}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setFeedbackOpen(false)}>
                      Fechar
                    </Button>
                    <Link to="/bolsista/painel">
                      <Button className="gap-1.5">
                        <ExternalLink className="w-4 h-4" />
                        Acessar Subprojeto
                      </Button>
                    </Link>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {canDownloadReceipt && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="gap-2"
                  onSelect={(e) => {
                    e.preventDefault();
                    downloadPaymentReceipt(installment.receiptUrl!, `comprovante_${installment.referenceMonthRaw}.pdf`);
                  }}
                >
                  <Download className="w-4 h-4" />
                  Baixar comprovante
                </DropdownMenuItem>
              </>
            )}

            {!hasVersions && !canViewFeedback && !canDownloadReceipt && !installment.reportFileUrl && (
              <DropdownMenuItem disabled className="text-muted-foreground">
                Nenhuma ação disponível
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Versions Dialog */}
        {hasVersions && (
          <ReportVersionsDialog
            open={versionsOpen}
            onOpenChange={setVersionsOpen}
            referenceMonth={installment.referenceMonth}
            referenceMonthRaw={installment.referenceMonthRaw}
            versions={installment.versions || []}
          />
        )}
      </div>
    </TooltipProvider>
  );
}

interface InstallmentsTableProps {
  payments: PaymentWithReport[];
  grantValue: number;
  startDate: string;
  loading?: boolean;
  onRefresh?: () => void;
  enrollmentId?: string;
}

function getMonthStatus(referenceMonth: string): MonthStatus {
  try {
    // Parse YYYY-MM format
    const [year, month] = referenceMonth.split("-").map(Number);
    const refDate = new Date(year, month - 1, 1);
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    if (refDate.getTime() === currentMonth.getTime()) {
      return "current";
    } else if (refDate > currentMonth) {
      return "future";
    }
    return "past";
  } catch {
    return "past";
  }
}

function formatReferenceMonth(refMonth: string): string {
  try {
    const [year, month] = refMonth.split("-").map(Number);
    const date = new Date(year, month - 1, 1);
    return format(date, "MMMM/yyyy", { locale: ptBR });
  } catch {
    return refMonth;
  }
}

function mapPaymentToInstallment(payment: PaymentWithReport, grantValue: number, enrollmentId: string): Installment {
  const monthStatus = getMonthStatus(payment.reference_month);
  
  // Check if resubmission deadline has expired
  let isDeadlineExpired = false;
  let resubmissionDeadline: string | undefined;
  
  if (payment.report?.resubmission_deadline) {
    resubmissionDeadline = payment.report.resubmission_deadline;
    const deadline = new Date(payment.report.resubmission_deadline);
    isDeadlineExpired = isBefore(deadline, new Date());
  }
  
  // Map report status
  let reportStatus: ReportStatus = "pending";
  let hasReportUnderReview = false;
  
  if (monthStatus === "future") {
    reportStatus = "future";
  } else if (payment.report) {
    const status = payment.report.status;
    if (status === "under_review") {
      reportStatus = "under_review";
      hasReportUnderReview = true;
    }
    else if (status === "approved") reportStatus = "approved";
    else if (status === "rejected") {
      reportStatus = isDeadlineExpired ? "deadline_expired" : "rejected";
    }
    else if (status === "submitted") reportStatus = "submitted";
    else reportStatus = "submitted"; // Any other status with a report means it was submitted
  } else {
    // No report object - check if payment has a report_id (report exists but wasn't joined)
    if (payment.report_id) {
      // There IS a report for this payment but it wasn't loaded - treat as submitted
      reportStatus = "submitted";
      console.warn(`[InstallmentsTable] Payment ${payment.id} has report_id ${payment.report_id} but report object is null`);
    }
  }

  // Map payment status
  let paymentStatus: PaymentStatus = payment.status as PaymentStatus;
  if (monthStatus === "future") {
    paymentStatus = "future";
  }

  // Map versions from payment data
  const versions: ReportVersion[] = (payment.reportVersions || []).map(v => ({
    id: v.id,
    version: v.version,
    submittedAt: v.submittedAt,
    status: v.status,
    feedback: v.feedback,
    fileUrl: v.fileUrl,
  }));

  return {
    id: payment.id,
    number: payment.installment_number,
    referenceMonth: formatReferenceMonth(payment.reference_month),
    referenceMonthRaw: payment.reference_month,
    value: Number(payment.amount),
    reportStatus,
    paymentStatus,
    paymentDate: payment.paid_at ? format(parseISO(payment.paid_at), "dd/MM/yyyy") : undefined,
    feedback: payment.report?.feedback || undefined,
    isFirstInstallment: payment.installment_number === 1,
    versions: versions.length > 0 ? versions : undefined,
    monthStatus,
    enrollmentId,
    hasReportUnderReview,
    reportFileUrl: payment.report?.file_url,
    resubmissionDeadline,
    isDeadlineExpired,
    receiptUrl: payment.receipt_url || undefined,
  };
}

export function InstallmentsTable({ 
  payments = [], 
  grantValue = 0, 
  startDate = "",
  loading = false,
  onRefresh,
  enrollmentId = "",
}: InstallmentsTableProps) {
  // Safe defaults - ensure payments is always an array
  const safePayments = payments ?? [];
  const safeGrantValue = grantValue ?? 0;
  
  const installments = safePayments.map(p => mapPaymentToInstallment(p, safeGrantValue, enrollmentId));
  
  const paidCount = installments.filter(i => i.paymentStatus === "paid").length;
  const blockedCount = installments.filter(i => i.paymentStatus === "pending" || i.paymentStatus === "blocked").length;
  const pendingReportCount = installments.filter(i => i.reportStatus === "pending" || i.reportStatus === "rejected").length;

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  if (loading) {
    return (
      <div className="card-institutional overflow-hidden p-0">
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-muted-foreground">Carregando parcelas...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card-institutional overflow-hidden p-0">
      {/* Info Banner */}
      <div className="p-4 bg-primary/5 border-b border-primary/20">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Info className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground text-sm">
              📋 Como funciona
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              O envio de relatórios é feito na seção <strong>"Relatório Mensal"</strong> do seu subprojeto.
            </p>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
              <li><strong>Relatório aprovado</strong> → Pagamento liberado ✅</li>
              <li><strong>Relatório pendente</strong> → Pagamento aguardando ⏳</li>
              <li><strong>Relatório devolvido</strong> → Pagamento bloqueado 🚫</li>
            </ul>
            <Link to="/bolsista/painel" className="inline-flex items-center gap-1.5 text-sm text-primary font-medium mt-2 hover:underline">
              <ExternalLink className="w-3.5 h-3.5" />
              Acessar Subprojeto para enviar relatório
            </Link>
          </div>
        </div>
      </div>

      <div className="p-5 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Histórico de Parcelas</h3>
            <p className="text-sm text-muted-foreground">
              Acompanhe o status dos seus relatórios e pagamentos por período.
            </p>
          </div>
          
          {/* Summary badges */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-sm">
              <span className="w-2 h-2 rounded-full bg-success" />
              <span className="text-muted-foreground">{paidCount} pagas</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <span className="w-2 h-2 rounded-full bg-destructive" />
              <span className="text-muted-foreground">{blockedCount} bloqueadas</span>
            </div>
            {pendingReportCount > 0 && (
              <div className="flex items-center gap-1.5 text-sm">
                <span className="w-2 h-2 rounded-full bg-warning" />
                <span className="text-warning font-medium">{pendingReportCount} relatório(s) pendente(s)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="table-institutional">
          <thead>
            <tr>
              <th>Parcela</th>
              <th>Mês de Referência</th>
              <th>Valor</th>
              <th>Status do Relatório</th>
              <th>Status do Pagamento</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {installments.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <Clock className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Nenhuma parcela registrada</p>
                      <p className="text-sm text-muted-foreground">
                        As parcelas serão exibidas após o vínculo com o termo de concessão.
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              installments.map((installment) => (
              <tr 
                key={installment.id}
                className={cn(
                  installment.monthStatus === "current" && "bg-primary/5",
                  installment.monthStatus === "future" && "opacity-60"
                )}
              >
                <td>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium",
                      installment.monthStatus === "current" 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted"
                    )}>
                      {installment.number}
                    </span>
                    {installment.isFirstInstallment && (
                      <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                        Auto
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-foreground capitalize">{installment.referenceMonth}</span>
                    <MonthIndicator monthStatus={installment.monthStatus} />
                  </div>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    {installment.reportStatus === "approved" || installment.paymentStatus === "paid" ? (
                      <span className="font-medium text-success">{formatCurrency(installment.value)}</span>
                    ) : (
                      <span className="font-medium text-muted-foreground flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5" />
                        {formatCurrency(installment.value)}
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <div className="flex flex-col gap-1">
                    <StatusBadge 
                      status={installment.reportStatus} 
                      config={reportStatusConfig[installment.reportStatus]} 
                    />
                    {installment.reportStatus === "rejected" && installment.resubmissionDeadline && !installment.isDeadlineExpired && (
                      <span className="text-xs text-warning flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Prazo: {format(parseISO(installment.resubmissionDeadline), "dd/MM/yyyy")}
                      </span>
                    )}
                    {installment.reportStatus === "deadline_expired" && (
                      <span className="text-xs text-destructive">
                        Prazo expirado - contate o gestor
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <div className="flex flex-col gap-1">
                    <StatusBadge 
                      status={installment.paymentStatus} 
                      config={paymentStatusConfig[installment.paymentStatus] || paymentStatusConfig.pending} 
                    />
                    {installment.paymentDate && (
                      <span className="text-xs text-muted-foreground">{installment.paymentDate}</span>
                    )}
                  </div>
                </td>
                <td>
                  <InstallmentActions installment={installment} onRefresh={handleRefresh} />
                </td>
              </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer info */}
      <div className="p-4 bg-muted/30 border-t border-border">
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          <Info className="w-3.5 h-3.5" />
          Os relatórios devem ser enviados via formulário digital na seção "Relatório Mensal" do seu subprojeto.
        </p>
      </div>
    </div>
  );
}
