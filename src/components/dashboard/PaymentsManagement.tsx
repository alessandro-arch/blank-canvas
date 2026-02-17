import { useState, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  DollarSign,
  CheckCircle,
  Clock,
  Lock,
  Filter,
  RefreshCw,
  Loader2,
  Search,
  Calendar,
  Download,
  Building2,
  FileUp,
  CreditCard,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAuditLog } from "@/hooks/useAuditLog";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PaymentReceiptUpload } from "./PaymentReceiptUpload";
import { ScholarPaymentRowComponent, type ScholarPaymentRow, type PaymentRecord } from "./ScholarPaymentRow";
import { cn } from "@/lib/utils";
import { PeriodFilter, type PeriodRange } from "./PeriodFilter";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function PaymentsManagement() {
  const { user } = useAuth();
  const { logAction } = useAuditLog();
  const [searchParams, setSearchParams] = useSearchParams();

  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("payStatus") || "all");
  const [searchTerm, setSearchTerm] = useState("");
  const [thematicFilter, setThematicFilter] = useState<string>("all");
  const [periodRange, setPeriodRange] = useState<PeriodRange | null>(null);

  // Payment confirmation dialog
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [selectedScholar, setSelectedScholar] = useState<ScholarPaymentRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  // Attach receipt dialog (for retroactive upload)
  const [attachDialogOpen, setAttachDialogOpen] = useState(false);
  const [attachPayment, setAttachPayment] = useState<PaymentRecord | null>(null);
  const [attachScholar, setAttachScholar] = useState<ScholarPaymentRow | null>(null);
  const [attachReceiptUrl, setAttachReceiptUrl] = useState<string | null>(null);
  const [attachSubmitting, setAttachSubmitting] = useState(false);

  // Helper to update query params
  const updateQueryParams = (updates: Record<string, string>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([k, v]) => {
      if (v && v !== "all" && v !== "") newParams.set(k, v);
      else newParams.delete(k);
    });
    if (!newParams.has("tab")) newParams.set("tab", "pagamentos");
    setSearchParams(newParams, { replace: true });
  };

  const handleStatusFilterChange = (val: string) => {
    setStatusFilter(val);
    updateQueryParams({ payStatus: val });
  };

  const handlePeriodChange = useCallback((range: PeriodRange) => {
    setPeriodRange(range);
  }, []);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['payments-management-v2'],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      // Fetch all needed data in parallel
      const [
        { data: thematicProjects, error: tpErr },
        { data: paymentsData, error: payErr },
        { data: enrollments, error: enrErr },
        { data: bankAccounts, error: bankErr },
      ] = await Promise.all([
        supabase.from("thematic_projects").select("*").order("created_at", { ascending: false }),
        supabase.from("payments").select(`
          *,
          enrollment:enrollments(
            id,
            user_id,
            project:projects(id, title, code, thematic_project_id)
          )
        `).order("reference_month", { ascending: false }),
        supabase.from("enrollments").select(`
          id, user_id, status,
          project:projects(id, title, code, thematic_project_id)
        `).eq("status", "active"),
        supabase.from("bank_accounts").select("user_id"),
      ]);

      if (tpErr) throw tpErr;
      if (payErr) throw payErr;
      if (enrErr) throw enrErr;

      // Get unique user IDs from enrollments
      const enrolledUserIds = [...new Set((enrollments || []).map(e => e.user_id))];

      // Fetch profiles
      const { data: profiles } = enrolledUserIds.length > 0
        ? await supabase
            .from("profiles")
            .select("user_id, full_name, email, is_active")
            .in("user_id", enrolledUserIds)
        : { data: [] };

      // Build bank data set
      const bankUserIds = new Set((bankAccounts || []).map(b => b.user_id));

      // Build thematic map
      const thematicMap = new Map((thematicProjects || []).map(tp => [tp.id, tp]));

      // Build payments map per user
      const paymentsByUser = new Map<string, PaymentRecord[]>();
      (paymentsData || []).forEach(p => {
        const enrollment = p.enrollment as {
          id: string;
          user_id: string;
          project: { id: string; title: string; code: string; thematic_project_id: string } | null;
        } | null;

        const record: PaymentRecord = {
          id: p.id,
          user_id: p.user_id,
          enrollment_id: p.enrollment_id,
          reference_month: p.reference_month,
          installment_number: p.installment_number,
          amount: Number(p.amount),
          status: p.status,
          paid_at: p.paid_at,
          report_id: p.report_id,
          receipt_url: p.receipt_url,
        };

        const list = paymentsByUser.get(p.user_id) || [];
        list.push(record);
        paymentsByUser.set(p.user_id, list);
      });

      // Get available months
      const allMonths = [...new Set((paymentsData || []).map(p => p.reference_month))].sort().reverse();

      // Build scholar rows from enrollments
      const scholarRows: ScholarPaymentRow[] = [];
      const seenUsers = new Set<string>();

      (enrollments || []).forEach(enrollment => {
        if (seenUsers.has(enrollment.user_id)) return;
        seenUsers.add(enrollment.user_id);

        const profile = (profiles || []).find(p => p.user_id === enrollment.user_id);
        const project = enrollment.project as { id: string; title: string; code: string; thematic_project_id: string } | null;
        const thematicProjectId = project?.thematic_project_id || "";
        const thematicProject = thematicMap.get(thematicProjectId);
        const userPayments = paymentsByUser.get(enrollment.user_id) || [];

        scholarRows.push({
          user_id: enrollment.user_id,
          full_name: profile?.full_name || "Nome não disponível",
          email: profile?.email || "",
          is_active: profile?.is_active ?? true,
          has_bank_data: bankUserIds.has(enrollment.user_id),
          project_title: project?.title || "Projeto não encontrado",
          project_code: project?.code || "",
          thematic_project_title: thematicProject?.title || "",
          enrollment_id: enrollment.id,
          current_payment: null,
          all_payments: userPayments.sort((a, b) => b.reference_month.localeCompare(a.reference_month)),
        });
      });

      return {
        scholars: scholarRows,
        thematicProjects: thematicProjects || [],
        availableMonths: allMonths,
      };
    },
  });

  // Helper: check if a payment's reference_month is within the selected period
  const isInPeriod = useCallback((refMonth: string, paidAt: string | null) => {
    if (!periodRange) return true;
    const { startMonth, endMonth } = periodRange;
    // Use paid_at month if available, otherwise reference_month
    let effectiveMonth = refMonth;
    if (paidAt) {
      try {
        const d = parseISO(paidAt);
        effectiveMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      } catch { /* fallback to refMonth */ }
    }
    return effectiveMonth >= startMonth && effectiveMonth <= endMonth;
  }, [periodRange]);

  // Apply filters
  const filteredScholars = useMemo(() => {
    if (!data) return [];
    const searchLower = searchTerm.toLowerCase();

    return data.scholars
      .map(s => {
        // Get all payments in the selected period
        const periodPayments = s.all_payments.filter(p => isInPeriod(p.reference_month, p.paid_at));
        // Use the most recent as "current"
        const currentPayment = periodPayments.length > 0 ? periodPayments[0] : null;
        return { ...s, current_payment: currentPayment, period_payments: periodPayments };
      })
      .filter(s => {
        if (searchTerm) {
          const matches =
            s.full_name.toLowerCase().includes(searchLower) ||
            s.email.toLowerCase().includes(searchLower) ||
            s.project_code.toLowerCase().includes(searchLower);
          if (!matches) return false;
        }

        if (statusFilter !== "all") {
          // Check if any payment in the period matches the status
          if (s.period_payments.length === 0) {
            if (statusFilter !== "pending") return false;
          } else {
            const hasStatus = s.period_payments.some(p => p.status === statusFilter);
            if (!hasStatus) return false;
          }
        }

        if (thematicFilter !== "all") {
          const thematic = data.thematicProjects.find(tp => tp.id === thematicFilter);
          if (!thematic || s.thematic_project_title !== thematic.title) return false;
        }

        return true;
      });
  }, [data, searchTerm, statusFilter, thematicFilter, isInPeriod]);

  // Stats for the selected period
  const monthStats = useMemo(() => {
    if (!data) return { pending: 0, eligible: 0, paid: 0, cancelled: 0, total: 0, totalAmount: 0 };
    
    // Collect all payments in the period across all scholars
    const allPeriodPayments = data.scholars.flatMap(s =>
      s.all_payments.filter(p => isInPeriod(p.reference_month, p.paid_at))
    );
    
    const total = allPeriodPayments.length;
    const pending = allPeriodPayments.filter(p => p.status === "pending").length;
    const eligible = allPeriodPayments.filter(p => p.status === "eligible").length;
    const paid = allPeriodPayments.filter(p => p.status === "paid").length;
    const cancelled = allPeriodPayments.filter(p => p.status === "cancelled").length;
    const totalAmount = allPeriodPayments
      .filter(p => p.status === "eligible")
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    return { pending, eligible, paid, cancelled, total, totalAmount };
  }, [data, isInPeriod]);

  // Actions
  const handleOpenConfirm = (payment: PaymentRecord, scholar: ScholarPaymentRow) => {
    setSelectedPayment(payment);
    setSelectedScholar(scholar);
    setReceiptUrl(null);
    setConfirmDialogOpen(true);
  };

  const handleOpenAttachReceipt = (payment: PaymentRecord, scholar: ScholarPaymentRow) => {
    setAttachPayment(payment);
    setAttachScholar(scholar);
    setAttachReceiptUrl(null);
    setAttachDialogOpen(true);
  };

  const handleSendReminder = (scholar: ScholarPaymentRow) => {
    toast.info(`Lembrete enviado para ${scholar.full_name}`);
  };

  const handleReceiptUploaded = (url: string) => {
    setReceiptUrl(url);
  };

  const handleAttachReceiptUploaded = (url: string) => {
    setAttachReceiptUrl(url);
  };

  const handleSaveAttachReceipt = async () => {
    if (!attachPayment || !attachReceiptUrl || !user) return;
    setAttachSubmitting(true);

    try {
      const { error } = await supabase
        .from("payments")
        .update({ receipt_url: attachReceiptUrl })
        .eq("id", attachPayment.id);

      if (error) throw error;

      await logAction({
        action: "attach_payment_receipt",
        entityType: "payment",
        entityId: attachPayment.id,
        details: {
          scholar_id: attachPayment.user_id,
          scholar_name: attachScholar?.full_name,
          reference_month: attachPayment.reference_month,
          amount: attachPayment.amount,
          retroactive: true,
        },
      });

      toast.success("Comprovante anexado com sucesso!");
      setAttachDialogOpen(false);
      refetch();
    } catch (error) {
      console.error("Error attaching receipt:", error);
      toast.error("Erro ao anexar comprovante");
    } finally {
      setAttachSubmitting(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!selectedPayment || !user) return;
    setSubmitting(true);

    try {
      const now = new Date().toISOString();
      const updateData: { status: "paid"; paid_at: string; receipt_url?: string } = {
        status: "paid" as const,
        paid_at: now,
      };

      if (receiptUrl) {
        updateData.receipt_url = receiptUrl;
      }

      const { error: paymentError } = await supabase
        .from("payments")
        .update(updateData)
        .eq("id", selectedPayment.id);

      if (paymentError) throw paymentError;

      await logAction({
        action: "mark_payment_paid",
        entityType: "payment",
        entityId: selectedPayment.id,
        details: {
          scholar_id: selectedPayment.user_id,
          scholar_name: selectedScholar?.full_name,
          reference_month: selectedPayment.reference_month,
          amount: selectedPayment.amount,
          paid_at: now,
          receipt_attached: !!receiptUrl,
        },
      });

      toast.success("Pagamento registrado com sucesso!");
      setConfirmDialogOpen(false);
      refetch();
    } catch (error) {
      console.error("Error marking payment as paid:", error);
      toast.error("Erro ao registrar pagamento");
    } finally {
      setSubmitting(false);
    }
  };

  // Format month label
  const formatMonthLabel = (m: string) => {
    try {
      const [y, mo] = m.split("-").map(Number);
      const d = new Date(y, mo - 1, 1);
      const label = format(d, "MMMM/yyyy", { locale: ptBR });
      return label.charAt(0).toUpperCase() + label.slice(1);
    } catch {
      return m;
    }
  };

  // CSV export
  const handleExportCSV = () => {
    if (filteredScholars.length === 0) {
      toast.error("Nenhum dado para exportar");
      return;
    }

    const statusLabels: Record<string, string> = {
      pending: "Pendente",
      eligible: "Liberado",
      paid: "Pago",
      cancelled: "Cancelado",
    };

    const headers = ["Bolsista", "Email", "Projeto", "Código", "Projeto Temático", "Mês Ref.", "Valor", "Status", "Pago em"];
    const rows = filteredScholars.map(s => [
      s.full_name,
      s.email,
      s.project_title,
      s.project_code,
      s.thematic_project_title,
      s.current_payment?.reference_month || (periodRange?.label || ""),
      s.current_payment?.amount?.toFixed(2).replace(".", ",") || "",
      statusLabels[s.current_payment?.status || "pending"] || "Pendente",
      s.current_payment?.paid_at ? format(parseISO(s.current_payment.paid_at), "dd/MM/yyyy") : "",
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pagamentos_${periodRange?.label || "periodo"}_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado com sucesso!");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Gestão de Pagamentos
            </CardTitle>
            <CardDescription>
              {monthStats.eligible > 0
                ? `${monthStats.eligible} pagamento(s) liberado(s) • ${formatCurrency(monthStats.totalAmount)}`
                : "Acompanhe pagamentos por bolsista"
              }
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={isLoading}>
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
              Atualizar
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* KPI Stats */}
        {!isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold text-foreground">{monthStats.total}</p>
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Users className="w-3 h-3" /> Total
              </p>
            </div>
            <div className="p-3 rounded-lg bg-warning/10 text-center">
              <p className="text-2xl font-bold text-warning">{monthStats.pending}</p>
              <p className="text-xs text-warning flex items-center justify-center gap-1">
                <Clock className="w-3 h-3" /> Pendentes
              </p>
            </div>
            <div className="p-3 rounded-lg bg-success/10 text-center">
              <p className="text-2xl font-bold text-success">{monthStats.eligible}</p>
              <p className="text-xs text-success flex items-center justify-center gap-1">
                <CheckCircle className="w-3 h-3" /> Liberados
              </p>
            </div>
            <div className="p-3 rounded-lg bg-primary/10 text-center">
              <p className="text-2xl font-bold text-primary">{monthStats.paid}</p>
              <p className="text-xs text-primary flex items-center justify-center gap-1">
                <CreditCard className="w-3 h-3" /> Pagos
              </p>
            </div>
            <div className="p-3 rounded-lg bg-destructive/10 text-center">
              <p className="text-2xl font-bold text-destructive">{monthStats.cancelled}</p>
              <p className="text-xs text-destructive flex items-center justify-center gap-1">
                <Lock className="w-3 h-3" /> Cancelados
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col gap-4">
          {/* Period filter row */}
          <PeriodFilter
            availableMonths={data?.availableMonths || []}
            value={periodRange}
            onChange={handlePeriodChange}
          />

          {/* Other filters row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email ou código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Status filter */}
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger>
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="eligible">Liberados</SelectItem>
              <SelectItem value="paid">Pagos</SelectItem>
              <SelectItem value="cancelled">Cancelados</SelectItem>
            </SelectContent>
          </Select>

          {/* Thematic project filter */}
          <Select value={thematicFilter} onValueChange={setThematicFilter}>
            <SelectTrigger>
              <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Projeto Temático" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os projetos</SelectItem>
              {(data?.thematicProjects || []).map(tp => (
                <SelectItem key={tp.id} value={tp.id}>{tp.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          </div>
        </div>

        {/* Scholar Table */}
        <div className="rounded-lg border overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-4 items-center">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          ) : filteredScholars.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">Nenhum bolsista encontrado para os filtros selecionados</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bolsista</TableHead>
                  <TableHead>Projeto</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status do mês</TableHead>
                  <TableHead>Pago em</TableHead>
                  <TableHead className="w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredScholars.map(scholar => (
                  <ScholarPaymentRowComponent
                    key={scholar.user_id}
                    scholar={scholar}
                    onMarkAsPaid={handleOpenConfirm}
                    onAttachReceipt={handleOpenAttachReceipt}
                    onSendReminder={handleSendReminder}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-success" />
              Confirmar Pagamento
            </DialogTitle>
            <DialogDescription>
              Confirme que o pagamento foi realizado
            </DialogDescription>
          </DialogHeader>

          {selectedPayment && selectedScholar && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Bolsista</span>
                  <span className="font-medium">{selectedScholar.full_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Projeto</span>
                  <span className="font-medium">{selectedScholar.project_code}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Referência</span>
                  <span className="font-medium">{formatMonthLabel(selectedPayment.reference_month)}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-sm font-medium">Valor</span>
                  <span className="text-lg font-bold text-success">
                    {formatCurrency(selectedPayment.amount)}
                  </span>
                </div>
              </div>

              {/* Receipt Upload */}
              <PaymentReceiptUpload
                paymentId={selectedPayment.id}
                userId={selectedPayment.user_id}
                referenceMonth={selectedPayment.reference_month}
                onUploadComplete={handleReceiptUploaded}
              />

              {receiptUrl && (
                <div className="flex items-center gap-2 p-2 bg-success/10 rounded-lg text-success text-sm">
                  <CheckCircle className="w-4 h-4" />
                  <span>Comprovante anexado com sucesso</span>
                </div>
              )}

              <p className="text-sm text-muted-foreground text-center">
                Esta ação irá registrar o pagamento como realizado.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleMarkAsPaid}
              disabled={submitting}
              className="gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Confirmar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attach Receipt Dialog (Retroactive) */}
      <Dialog open={attachDialogOpen} onOpenChange={setAttachDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileUp className="w-5 h-5 text-primary" />
              Anexar Comprovante
            </DialogTitle>
            <DialogDescription>
              Adicione o comprovante de pagamento retroativamente
            </DialogDescription>
          </DialogHeader>

          {attachPayment && attachScholar && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Bolsista</span>
                  <span className="font-medium">{attachScholar.full_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Projeto</span>
                  <span className="font-medium">{attachScholar.project_code}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Referência</span>
                  <span className="font-medium">{formatMonthLabel(attachPayment.reference_month)}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-sm font-medium">Valor</span>
                  <span className="text-lg font-bold text-primary">
                    {formatCurrency(attachPayment.amount)}
                  </span>
                </div>
              </div>

              <PaymentReceiptUpload
                paymentId={attachPayment.id}
                userId={attachPayment.user_id}
                referenceMonth={attachPayment.reference_month}
                onUploadComplete={handleAttachReceiptUploaded}
              />

              {attachReceiptUrl && (
                <div className="flex items-center gap-2 p-2 bg-success/10 rounded-lg text-success text-sm">
                  <CheckCircle className="w-4 h-4" />
                  <span>Comprovante anexado com sucesso</span>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setAttachDialogOpen(false)}
              disabled={attachSubmitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveAttachReceipt}
              disabled={attachSubmitting || !attachReceiptUrl}
              className="gap-2"
            >
              {attachSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Salvar Comprovante
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
