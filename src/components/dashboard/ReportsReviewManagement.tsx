import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  FileSearch,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  RefreshCw,
  Loader2,
  Search,
  Calendar,
  Building2,
  Send,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { format, parseISO, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ReportsThematicCard } from "./ReportsThematicCard";
import { ReplaceReportFileDialog } from "./ReplaceReportFileDialog";
import { cn } from "@/lib/utils";

interface ReportWithDetails {
  id: string;
  user_id: string;
  reference_month: string;
  installment_number: number;
  file_url: string;
  file_name: string;
  observations: string | null;
  status: string;
  feedback: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  resubmission_deadline: string | null;
  scholar_name: string;
  scholar_email: string;
  project_title: string;
  project_code: string;
  enrollment_id: string;
  payment_id: string | null;
  thematic_project_id: string;
  thematic_project_title: string;
}

interface ThematicReportsGroup {
  id: string;
  title: string;
  sponsor_name: string;
  status: string;
  reports: ReportWithDetails[];
}

export function ReportsReviewManagement() {
  const { user } = useAuth();
  const { logAction } = useAuditLog();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("status") || "all");
  const [monthFilter, setMonthFilter] = useState<string>(searchParams.get("mes") || "all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sponsorFilter, setSponsorFilter] = useState<string>("all");
  
  // Review dialog state
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportWithDetails | null>(null);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Replace file dialog state
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false);
  const [reportToReplace, setReportToReplace] = useState<ReportWithDetails | null>(null);

  // Helper to update query params
  const updateQueryParams = (updates: Record<string, string>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([k, v]) => {
      if (v && v !== "all") newParams.set(k, v);
      else newParams.delete(k);
    });
    // Keep tab param
    if (!newParams.has("tab")) newParams.set("tab", "relatorios");
    setSearchParams(newParams, { replace: true });
  };

  const handleStatusFilterChange = (val: string) => {
    setStatusFilter(val);
    updateQueryParams({ status: val, mes: monthFilter });
  };

  const handleMonthFilterChange = (val: string) => {
    setMonthFilter(val);
    updateQueryParams({ mes: val, status: statusFilter });
  };

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['reports-management'],
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

      // Fetch reports
      const { data: reportsData, error: reportsError } = await supabase
        .from("reports")
        .select("*")
        .order("submitted_at", { ascending: false });

      if (reportsError) throw reportsError;

      if (!reportsData || reportsData.length === 0) {
        return { thematicProjects: thematicProjects || [], reports: [] };
      }

      // Get unique user IDs
      const userIds = [...new Set(reportsData.map(r => r.user_id))];

      // Fetch profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);

      // Fetch enrollments with project info
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select(`
          id,
          user_id,
          project:projects(id, title, code, thematic_project_id)
        `)
        .in("user_id", userIds);

      // Fetch payments
      const { data: payments } = await supabase
        .from("payments")
        .select("id, user_id, reference_month, enrollment_id")
        .in("user_id", userIds);

      // Build thematic project map
      const thematicMap = new Map(
        (thematicProjects || []).map(tp => [tp.id, tp])
      );

      // Build enriched reports
      const enrichedReports: ReportWithDetails[] = reportsData.map(report => {
        const profile = profiles?.find(p => p.user_id === report.user_id);
        const enrollment = enrollments?.find(e => e.user_id === report.user_id);
        const payment = payments?.find(p => 
          p.user_id === report.user_id && 
          p.reference_month === report.reference_month
        );
        const project = enrollment?.project as { id: string; title: string; code: string; thematic_project_id: string } | null;
        const thematicProjectId = project?.thematic_project_id || '';
        const thematicProject = thematicMap.get(thematicProjectId);

        return {
          ...report,
          scholar_name: profile?.full_name || "Nome não disponível",
          scholar_email: profile?.email || "",
          project_title: project?.title || "Projeto não encontrado",
          project_code: project?.code || "",
          enrollment_id: enrollment?.id || "",
          payment_id: payment?.id || null,
          thematic_project_id: thematicProjectId,
          thematic_project_title: thematicProject?.title || "Projeto Temático não encontrado",
        };
      });

      return { thematicProjects: thematicProjects || [], reports: enrichedReports };
    },
  });

  // Get unique sponsors for filter
  const sponsors = useMemo(() => {
    return [...new Set(data?.thematicProjects?.map(p => p.sponsor_name) || [])];
  }, [data?.thematicProjects]);

  // Get unique months for filter
  const availableMonths = useMemo(() => {
    const months = [...new Set(data?.reports?.map(r => r.reference_month) || [])];
    return months.sort().reverse();
  }, [data?.reports]);

  // Group reports by thematic project and apply filters
  const filteredGroups = useMemo(() => {
    if (!data) return [];

    const searchLower = searchTerm.toLowerCase();

    // Filter reports
    let filteredReports = data.reports.filter(report => {
      const matchesSearch = 
        !searchTerm ||
        report.scholar_name.toLowerCase().includes(searchLower) ||
        report.project_code.toLowerCase().includes(searchLower);
      
      const matchesStatus = statusFilter === "all" || report.status === statusFilter;
      const matchesMonth = monthFilter === "all" || report.reference_month === monthFilter;
      
      return matchesSearch && matchesStatus && matchesMonth;
    });

    // Group by thematic project
    const groupedMap = new Map<string, ReportWithDetails[]>();
    filteredReports.forEach(report => {
      const key = report.thematic_project_id;
      if (!groupedMap.has(key)) {
        groupedMap.set(key, []);
      }
      groupedMap.get(key)!.push(report);
    });

    // Build groups with thematic project info
    const groups: ThematicReportsGroup[] = [];
    data.thematicProjects.forEach(tp => {
      const reports = groupedMap.get(tp.id) || [];
      
      // Filter by sponsor
      if (sponsorFilter !== 'all' && tp.sponsor_name !== sponsorFilter) {
        return;
      }
      
      // Only include thematic projects with reports
      if (reports.length > 0) {
        groups.push({
          id: tp.id,
          title: tp.title,
          sponsor_name: tp.sponsor_name,
          status: tp.status,
          reports,
        });
      }
    });

    return groups;
  }, [data, searchTerm, statusFilter, sponsorFilter, monthFilter]);

  const handleViewPdf = async (fileUrl: string) => {
    setPdfLoading(true);
    // Open window synchronously to avoid popup blocker
    const newWindow = window.open("about:blank", "_blank");
    try {
      const { data, error } = await supabase.storage
        .from("reports")
        .createSignedUrl(fileUrl, 900); // 15 minutes

      if (error) throw error;
      if (data?.signedUrl) {
        if (newWindow) {
          newWindow.location.href = data.signedUrl;
        } else {
          toast.error("Permita pop-ups no navegador para visualizar o arquivo");
        }
      } else {
        newWindow?.close();
      }
    } catch (error: any) {
      console.error("Error opening PDF:", error);
      const isNotFound = error?.statusCode === "404" || error?.message?.includes("not found");
      toast.error(isNotFound ? "Arquivo PDF não encontrado no storage" : "Erro ao abrir PDF");
      newWindow?.close();
    } finally {
      setPdfLoading(false);
    }
  };

  const handleOpenReview = (report: ReportWithDetails) => {
    setSelectedReport(report);
    setFeedback("");
    setReviewDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedReport || !user) return;
    setSubmitting(true);

    try {
      const now = new Date().toISOString();

      // Update report status
      const { error: reportError } = await supabase
        .from("reports")
        .update({
          status: "approved",
          reviewed_at: now,
          reviewed_by: user.id,
          feedback: feedback || null,
        })
        .eq("id", selectedReport.id);

      if (reportError) throw reportError;

      // Update payment status to eligible
      if (selectedReport.payment_id) {
        const { error: paymentError } = await supabase
          .from("payments")
          .update({
            status: "eligible",
            report_id: selectedReport.id,
          })
          .eq("id", selectedReport.payment_id);

        if (paymentError) {
          console.error("Error updating payment:", paymentError);
        }
      }

      // Log audit
      await logAction({
        action: "approve_report",
        entityType: "report",
        entityId: selectedReport.id,
        details: {
          scholar_id: selectedReport.user_id,
          scholar_name: selectedReport.scholar_name,
          reference_month: selectedReport.reference_month,
          feedback: feedback || null,
        },
      });

      toast.success("Relatório aprovado com sucesso!");
      setReviewDialogOpen(false);
      refetch();
    } catch (error) {
      console.error("Error approving report:", error);
      toast.error("Erro ao aprovar relatório");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedReport || !user) return;
    
    if (!feedback.trim()) {
      toast.error("O parecer é obrigatório para devolução");
      return;
    }

    setSubmitting(true);

    try {
      const now = new Date();
      const deadline = addDays(now, 5);

      // Update report status
      const { error: reportError } = await supabase
        .from("reports")
        .update({
          status: "rejected",
          reviewed_at: now.toISOString(),
          reviewed_by: user.id,
          feedback: feedback,
          resubmission_deadline: deadline.toISOString(),
        })
        .eq("id", selectedReport.id);

      if (reportError) throw reportError;

      // Log audit
      await logAction({
        action: "reject_report",
        entityType: "report",
        entityId: selectedReport.id,
        details: {
          scholar_id: selectedReport.user_id,
          scholar_name: selectedReport.scholar_name,
          reference_month: selectedReport.reference_month,
          feedback: feedback,
          resubmission_deadline: deadline.toISOString(),
        },
      });

      toast.success("Relatório devolvido para correção");
      setReviewDialogOpen(false);
      refetch();
    } catch (error) {
      console.error("Error rejecting report:", error);
      toast.error("Erro ao devolver relatório");
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate filtered stats (respecting month filter)
  const globalStats = useMemo(() => {
    const allReports = data?.reports || [];
    const monthReports = monthFilter === "all" ? allReports : allReports.filter(r => r.reference_month === monthFilter);
    return {
      underReview: monthReports.filter(r => r.status === 'under_review').length,
      approved: monthReports.filter(r => r.status === 'approved').length,
      rejected: monthReports.filter(r => r.status === 'rejected').length,
      total: monthReports.length,
    };
  }, [data?.reports, monthFilter]);

  const handleReplaceFile = (report: ReportWithDetails) => {
    setReportToReplace(report);
    setReplaceDialogOpen(true);
  };

  const handleExportCSV = () => {
    const allFilteredReports = filteredGroups.flatMap(g => g.reports);
    if (allFilteredReports.length === 0) {
      toast.error("Nenhum relatório para exportar");
      return;
    }

    const statusLabels: Record<string, string> = {
      under_review: "Em Análise",
      approved: "Aprovado",
      rejected: "Devolvido",
    };

    const headers = ["Bolsista", "Email", "Projeto", "Código", "Projeto Temático", "Mês Ref.", "Parcela", "Status", "Enviado em", "Avaliado em"];
    const rows = allFilteredReports.map(r => [
      r.scholar_name,
      r.scholar_email,
      r.project_title,
      r.project_code,
      r.thematic_project_title,
      r.reference_month,
      r.installment_number,
      statusLabels[r.status] || r.status,
      r.submitted_at ? format(parseISO(r.submitted_at), "dd/MM/yyyy") : "",
      r.reviewed_at ? format(parseISO(r.reviewed_at), "dd/MM/yyyy") : "",
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorios_${format(new Date(), "yyyy-MM-dd")}.csv`;
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
              <FileSearch className="h-5 w-5" />
              Avaliação de Relatórios
            </CardTitle>
            <CardDescription>
              {globalStats.underReview > 0 
                ? `${globalStats.underReview} relatório(s) aguardando análise`
                : "Acompanhe relatórios por projeto temático"
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
        {/* Filtered Stats */}
        {!isLoading && (
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="text-muted-foreground">
              {monthFilter !== "all" ? `Mês: ${monthFilter}` : "Todos os meses"} —
            </span>
            <span><strong className="text-warning">{globalStats.underReview}</strong> em análise</span>
            <span><strong className="text-success">{globalStats.approved}</strong> aprovados</span>
            <span><strong className="text-destructive">{globalStats.rejected}</strong> devolvidos</span>
            <span><strong>{globalStats.total}</strong> total</span>
          </div>
        )}

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

          <Select value={monthFilter} onValueChange={handleMonthFilterChange}>
            <SelectTrigger>
              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Mês/Ano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os meses</SelectItem>
              {availableMonths.map(month => {
                try {
                  const [y, m] = month.split("-").map(Number);
                  const d = new Date(y, m - 1, 1);
                  const label = format(d, "MMMM/yyyy", { locale: ptBR });
                  return <SelectItem key={month} value={month}>{label.charAt(0).toUpperCase() + label.slice(1)}</SelectItem>;
                } catch { return <SelectItem key={month} value={month}>{month}</SelectItem>; }
              })}
            </SelectContent>
          </Select>
          
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger>
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="under_review">Em Análise</SelectItem>
              <SelectItem value="approved">Aprovados</SelectItem>
              <SelectItem value="rejected">Devolvidos</SelectItem>
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
              <FileSearch className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum relatório encontrado</p>
            </div>
          ) : (
            filteredGroups.map(group => (
              <ReportsThematicCard
                key={group.id}
                group={group}
                onViewPdf={handleViewPdf}
                onReview={handleOpenReview}
                onReplaceFile={handleReplaceFile}
              />
            ))
          )}
        </div>
      </CardContent>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSearch className="w-5 h-5 text-primary" />
              Avaliar Relatório
            </DialogTitle>
            <DialogDescription>
              Analise o relatório e forneça seu parecer
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Bolsista</span>
                  <span className="font-medium">{selectedReport.scholar_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Projeto</span>
                  <span className="font-medium">{selectedReport.project_code}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Arquivo</span>
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 h-auto"
                    onClick={() => handleViewPdf(selectedReport.file_url)}
                  >
                    {selectedReport.file_name}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedback">Parecer / Observações</Label>
                <Textarea
                  id="feedback"
                  placeholder="Adicione seu parecer sobre o relatório..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  * Obrigatório para devolução
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => setReviewDialogOpen(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={submitting}
              className="gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              Devolver
            </Button>
            <Button
              onClick={handleApprove}
              disabled={submitting}
              className="gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Aprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Replace File Dialog */}
      {reportToReplace && (
        <ReplaceReportFileDialog
          open={replaceDialogOpen}
          onOpenChange={setReplaceDialogOpen}
          report={reportToReplace}
          onViewPdf={handleViewPdf}
          onSuccess={() => refetch()}
        />
      )}
    </Card>
  );
}
