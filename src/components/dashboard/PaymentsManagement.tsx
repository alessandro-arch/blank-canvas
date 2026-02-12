import { useState, useEffect, useMemo } from "react";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAuditLog } from "@/hooks/useAuditLog";
import { toast } from "sonner";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PaymentsThematicCard } from "./PaymentsThematicCard";
import { PaymentReceiptUpload } from "./PaymentReceiptUpload";
import { cn } from "@/lib/utils";

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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function PaymentsManagement() {
  const { user } = useAuth();
  const { logAction } = useAuditLog();
  const currentMonth = format(new Date(), 'yyyy-MM');
  
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sponsorFilter, setSponsorFilter] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  
  // Payment confirmation dialog
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentWithDetails | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  // Attach receipt dialog (for retroactive upload)
  const [attachDialogOpen, setAttachDialogOpen] = useState(false);
  const [attachPayment, setAttachPayment] = useState<PaymentWithDetails | null>(null);
  const [attachReceiptUrl, setAttachReceiptUrl] = useState<string | null>(null);
  const [attachSubmitting, setAttachSubmitting] = useState(false);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['payments-management', selectedMonth],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      // Fetch thematic projects
      const { data: thematicProjects, error: thematicError } = await supabase
        .from('thematic_projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (thematicError) throw thematicError;

      // Fetch payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select(`
          *,
          enrollment:enrollments(
            id,
            user_id,
            project:projects(id, title, code, thematic_project_id)
          )
        `)
        .eq('reference_month', selectedMonth)
        .order("reference_month", { ascending: false });

      if (paymentsError) throw paymentsError;

      if (!paymentsData || paymentsData.length === 0) {
        return { thematicProjects: thematicProjects || [], payments: [] };
      }

      // Get unique user IDs
      const userIds = [...new Set(paymentsData.map(p => p.user_id))];

      // Fetch profiles for all users
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);

      // Build thematic project map
      const thematicMap = new Map(
        (thematicProjects || []).map(tp => [tp.id, tp])
      );

      // Build enriched payments
      const enrichedPayments: PaymentWithDetails[] = paymentsData.map(payment => {
        const profile = profiles?.find(p => p.user_id === payment.user_id);
        const enrollment = payment.enrollment as { 
          id: string; 
          user_id: string;
          project: { id: string; title: string; code: string; thematic_project_id: string } | null;
        } | null;
        
        const thematicProjectId = enrollment?.project?.thematic_project_id || '';
        const thematicProject = thematicMap.get(thematicProjectId);

        return {
          id: payment.id,
          user_id: payment.user_id,
          enrollment_id: payment.enrollment_id,
          reference_month: payment.reference_month,
          installment_number: payment.installment_number,
          amount: Number(payment.amount),
          status: payment.status,
          paid_at: payment.paid_at,
          report_id: payment.report_id,
          scholar_name: profile?.full_name || "Nome não disponível",
          scholar_email: profile?.email || "",
          project_title: enrollment?.project?.title || "Projeto não encontrado",
          project_code: enrollment?.project?.code || "",
          thematic_project_id: thematicProjectId,
          thematic_project_title: thematicProject?.title || "Projeto Temático não encontrado",
        };
      });

      return { thematicProjects: thematicProjects || [], payments: enrichedPayments };
    },
  });

  // Get unique sponsors for filter
  const sponsors = useMemo(() => {
    return [...new Set(data?.thematicProjects?.map(p => p.sponsor_name) || [])];
  }, [data?.thematicProjects]);

  // Group payments by thematic project and apply filters
  const filteredGroups = useMemo(() => {
    if (!data) return [];

    const searchLower = searchTerm.toLowerCase();

    // Filter payments
    let filteredPayments = data.payments.filter(payment => {
      const matchesSearch = 
        !searchTerm ||
        payment.scholar_name.toLowerCase().includes(searchLower) ||
        payment.project_code.toLowerCase().includes(searchLower);
      
      const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });

    // Group by thematic project
    const groupedMap = new Map<string, PaymentWithDetails[]>();
    filteredPayments.forEach(payment => {
      const key = payment.thematic_project_id;
      if (!groupedMap.has(key)) {
        groupedMap.set(key, []);
      }
      groupedMap.get(key)!.push(payment);
    });

    // Build groups with thematic project info
    const groups: ThematicPaymentsGroup[] = [];
    data.thematicProjects.forEach(tp => {
      const payments = groupedMap.get(tp.id) || [];
      
      // Filter by sponsor
      if (sponsorFilter !== 'all' && tp.sponsor_name !== sponsorFilter) {
        return;
      }
      
      // Only include thematic projects with payments or that match search
      if (payments.length > 0 || tp.title.toLowerCase().includes(searchLower)) {
        groups.push({
          id: tp.id,
          title: tp.title,
          sponsor_name: tp.sponsor_name,
          status: tp.status,
          payments,
        });
      }
    });

    return groups.filter(g => g.payments.length > 0);
  }, [data, searchTerm, statusFilter, sponsorFilter]);

  const handleOpenConfirm = (payment: PaymentWithDetails) => {
    setSelectedPayment(payment);
    setReceiptUrl(null);
    setConfirmDialogOpen(true);
  };

  const handleOpenAttachReceipt = (payment: PaymentWithDetails) => {
    setAttachPayment(payment);
    setAttachReceiptUrl(null);
    setAttachDialogOpen(true);
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
          scholar_name: attachPayment.scholar_name,
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

      // Update payment status with receipt URL if provided
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

      // Log audit
      await logAction({
        action: "mark_payment_paid",
        entityType: "payment",
        entityId: selectedPayment.id,
        details: {
          scholar_id: selectedPayment.user_id,
          scholar_name: selectedPayment.scholar_name,
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

  // Generate month options (current and 11 previous months)
  const monthOptions = useMemo(() => {
    const options = [];
    const today = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      options.push({
        value: format(date, 'yyyy-MM'),
        label: format(date, "MMMM 'de' yyyy", { locale: ptBR })
      });
    }
    return options;
  }, []);

  // Calculate global stats
  const globalStats = useMemo(() => {
    const allPayments = data?.payments || [];
    const eligible = allPayments.filter(p => p.status === 'eligible');
    return {
      totalEligible: eligible.length,
      totalEligibleAmount: eligible.reduce((sum, p) => sum + p.amount, 0),
    };
  }, [data?.payments]);

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
              {globalStats.totalEligible > 0 
                ? `${globalStats.totalEligible} pagamento(s) liberado(s) • ${formatCurrency(globalStats.totalEligibleAmount)}`
                : "Acompanhe pagamentos por projeto temático"
              }
            </CardDescription>
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por bolsista ou código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
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

          <Select value={sponsorFilter} onValueChange={setSponsorFilter}>
            <SelectTrigger>
              <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Financiador" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os financiadores</SelectItem>
              {sponsors.map(sponsor => (
                <SelectItem key={sponsor} value={sponsor}>{sponsor}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger>
              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Thematic Project Cards */}
        <div className="space-y-4">
          {isLoading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    <Skeleton className="w-12 h-12 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-6 w-full max-w-lg" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <div className="flex gap-6">
                      <Skeleton className="w-16 h-16" />
                      <Skeleton className="w-16 h-16" />
                      <Skeleton className="w-16 h-16" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : filteredGroups.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border rounded-lg">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum pagamento encontrado</p>
            </div>
          ) : (
            filteredGroups.map(group => (
              <PaymentsThematicCard
                key={group.id}
                group={group}
                onMarkAsPaid={handleOpenConfirm}
                onAttachReceipt={handleOpenAttachReceipt}
              />
            ))
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

          {selectedPayment && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Bolsista</span>
                  <span className="font-medium">{selectedPayment.scholar_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Projeto</span>
                  <span className="font-medium">{selectedPayment.project_code}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Referência</span>
                  <span className="font-medium">
                    {format(parseISO(`${selectedPayment.reference_month}-01`), "MMMM/yyyy", { locale: ptBR })}
                  </span>
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

          {attachPayment && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Bolsista</span>
                  <span className="font-medium">{attachPayment.scholar_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Projeto</span>
                  <span className="font-medium">{attachPayment.project_code}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Referência</span>
                  <span className="font-medium">
                    {format(parseISO(`${attachPayment.reference_month}-01`), "MMMM/yyyy", { locale: ptBR })}
                  </span>
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
