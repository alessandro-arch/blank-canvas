import { useState, useMemo, Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Calendar,
  Building2,
  RefreshCw,
  Download,
  Users,
  AlertTriangle,
  ChevronDown,
  Eye,
  Loader2,
  FileSearch,
  Filter,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { MonthlyReportStatusBadge } from "@/components/scholar/monthly-report/MonthlyReportStatusBadge";
import { MonthlyReportAIPanel } from "@/components/dashboard/MonthlyReportAIPanel";
import type { MonthlyReportStatus } from "@/hooks/useMonthlyReport";


interface MonthlyReportRow {
  id: string;
  beneficiary_user_id: string;
  project_id: string;
  organization_id: string;
  period_year: number;
  period_month: number;
  status: string;
  submitted_at: string | null;
  approved_at: string | null;
  returned_at: string | null;
  return_reason: string | null;
  created_at: string;
}

interface ScholarInfo {
  user_id: string;
  full_name: string;
  email: string;
  project_code: string;
  project_title: string;
  thematic_project_id: string;
  thematic_project_title: string;
  reports: MonthlyReportRow[];
}

export function MonthlyReportsReviewManagement() {
  const { user } = useAuth();

  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [thematicFilter, setThematicFilter] = useState("all");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  // Review dialog
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<MonthlyReportRow | null>(null);
  const [selectedScholar, setSelectedScholar] = useState<ScholarInfo | null>(null);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Expanded rows
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  // PDF loading
  const [pdfLoading, setPdfLoading] = useState(false);

  // Fields dialog
  const [fieldsDialogOpen, setFieldsDialogOpen] = useState(false);
  const [fieldsPayload, setFieldsPayload] = useState<Record<string, unknown> | null>(null);
  const [fieldsScholarName, setFieldsScholarName] = useState("");

  const toggleExpand = (userId: string) => {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  // Main query
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["monthly-reports-review", selectedYear, selectedMonth],
    staleTime: 3 * 60 * 1000,
    queryFn: async () => {
      const [
        { data: reports, error: repErr },
        { data: thematicProjects, error: tpErr },
      ] = await Promise.all([
        supabase
          .from("monthly_reports")
          .select("*")
          .eq("period_year", selectedYear)
          .eq("period_month", selectedMonth)
          .order("created_at", { ascending: false }),
        supabase
          .from("thematic_projects")
          .select("id, title, status")
          .order("title"),
      ]);

      if (repErr) throw repErr;
      if (tpErr) throw tpErr;

      if (!reports || reports.length === 0) {
        return { scholars: [] as ScholarInfo[], thematicProjects: thematicProjects || [] };
      }

      // Get unique user and project ids
      const userIds = [...new Set(reports.map(r => r.beneficiary_user_id))];
      const projectIds = [...new Set(reports.map(r => r.project_id))];

      const [
        { data: profiles },
        { data: projects },
      ] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds),
        supabase.from("projects").select("id, code, title, thematic_project_id").in("id", projectIds),
      ]);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      const projectMap = new Map((projects || []).map(p => [p.id, p]));
      const tpMap = new Map((thematicProjects || []).map(tp => [tp.id, tp]));

      // Group by user
      const scholarMap = new Map<string, ScholarInfo>();
      for (const report of reports) {
        const profile = profileMap.get(report.beneficiary_user_id);
        const project = projectMap.get(report.project_id);
        const tp = project ? tpMap.get(project.thematic_project_id) : null;

        if (!scholarMap.has(report.beneficiary_user_id)) {
          scholarMap.set(report.beneficiary_user_id, {
            user_id: report.beneficiary_user_id,
            full_name: profile?.full_name || "Sem nome",
            email: profile?.email || "",
            project_code: project?.code || "",
            project_title: project?.title || "",
            thematic_project_id: project?.thematic_project_id || "",
            thematic_project_title: tp?.title || "",
            reports: [],
          });
        }
        scholarMap.get(report.beneficiary_user_id)!.reports.push(report as MonthlyReportRow);
      }

      return {
        scholars: Array.from(scholarMap.values()),
        thematicProjects: thematicProjects || [],
      };
    },
  });

  // Filter scholars
  const filteredScholars = useMemo(() => {
    if (!data) return [];
    const searchLower = searchTerm.toLowerCase();

    return data.scholars.filter(s => {
      if (searchTerm) {
        const matches =
          s.full_name.toLowerCase().includes(searchLower) ||
          s.email.toLowerCase().includes(searchLower) ||
          s.project_code.toLowerCase().includes(searchLower);
        if (!matches) return false;
      }

      if (statusFilter !== "all") {
        const report = s.reports[0];
        if (!report || report.status !== statusFilter) return false;
      }

      if (thematicFilter !== "all" && s.thematic_project_id !== thematicFilter) return false;

      return true;
    });
  }, [data, searchTerm, statusFilter, thematicFilter]);

  // Stats
  const stats = useMemo(() => {
    if (!data) return { total: 0, draft: 0, submitted: 0, approved: 0, returned: 0 };
    const all = data.scholars.flatMap(s => s.reports);
    return {
      total: all.length,
      draft: all.filter(r => r.status === "draft").length,
      submitted: all.filter(r => r.status === "submitted").length,
      approved: all.filter(r => r.status === "approved").length,
      returned: all.filter(r => r.status === "returned").length,
    };
  }, [data]);

  // Actions
  const handleApprove = async () => {
    if (!selectedReport || !user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("approve_monthly_report", {
        p_report_id: selectedReport.id,
        p_feedback: feedback || null,
      });
      if (error) throw error;
      toast.success("Relatório mensal aprovado com sucesso!");
      setReviewDialogOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Erro ao aprovar relatório");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturn = async () => {
    if (!selectedReport || !user) return;
    if (!feedback.trim()) {
      toast.error("O motivo da devolução é obrigatório");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("return_monthly_report", {
        p_report_id: selectedReport.id,
        p_reason: feedback,
      });
      if (error) throw error;
      toast.success("Relatório devolvido para correção");
      setReviewDialogOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Erro ao devolver relatório");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenReview = (report: MonthlyReportRow, scholar: ScholarInfo) => {
    setSelectedReport(report);
    setSelectedScholar(scholar);
    setFeedback("");
    setReviewDialogOpen(true);
  };

  const handleViewPdf = async (reportId: string) => {
    setPdfLoading(true);
    // Open window synchronously to avoid popup blockers
    const newTab = window.open("about:blank", "_blank", "noopener,noreferrer");
    try {
      const { data, error } = await supabase.functions.invoke("secure-report-pdf", {
        body: { report_id: reportId, action: "view" },
      });

      if (error) throw error;

      let url: string | null = null;
      if (data?.signedUrl) {
        url = data.signedUrl;
      } else if (data instanceof Blob) {
        url = URL.createObjectURL(data);
      }

      if (url && newTab) {
        newTab.location.href = url;
      } else if (url) {
        // Fallback if popup was blocked
        window.open(url, "_blank");
      } else {
        newTab?.close();
        toast.error("PDF não encontrado para este relatório");
      }
    } catch {
      newTab?.close();
      toast.error("Erro ao abrir PDF");
    } finally {
      setPdfLoading(false);
    }
  };

  // View report fields
  const handleViewFields = async (reportId: string, scholarName?: string) => {
    try {
      const { data: fields } = await supabase
        .from("monthly_report_fields")
        .select("payload")
        .eq("report_id", reportId)
        .single();

      if (!fields?.payload) {
        toast.info("Nenhum campo preenchido");
        return;
      }

      setFieldsPayload(fields.payload as Record<string, unknown>);
      setFieldsScholarName(scholarName || "Bolsista");
      setFieldsDialogOpen(true);
    } catch {
      toast.error("Erro ao carregar campos do relatório");
    }
  };

  const formatMonthLabel = (year: number, month: number) => {
    const d = new Date(year, month - 1, 1);
    const label = format(d, "MMMM/yyyy", { locale: ptBR });
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  // Month options
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: format(new Date(2024, i, 1), "MMMM", { locale: ptBR }).replace(/^./, c => c.toUpperCase()),
  }));

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "draft": return <FileText className="w-4 h-4 text-muted-foreground" />;
      case "submitted": return <Clock className="w-4 h-4 text-blue-500" />;
      case "approved": return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case "returned": return <Undo2 className="w-4 h-4 text-destructive" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  // CSV export
  const handleExportCSV = () => {
    if (filteredScholars.length === 0) {
      toast.error("Nenhum dado para exportar");
      return;
    }
    const statusLabels: Record<string, string> = {
      draft: "Rascunho", submitted: "Enviado", under_review: "Em Análise",
      approved: "Aprovado", returned: "Devolvido", cancelled: "Cancelado",
    };
    const headers = ["Bolsista", "Email", "Código", "Projeto Temático", "Status", "Enviado em"];
    const rows = filteredScholars.map(s => {
      const r = s.reports[0];
      return [
        s.full_name, s.email, s.project_code, s.thematic_project_title,
        statusLabels[r?.status || "draft"] || r?.status || "Sem relatório",
        r?.submitted_at ? format(new Date(r.submitted_at), "dd/MM/yyyy HH:mm") : "",
      ];
    });
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorios_mensais_${selectedYear}-${String(selectedMonth).padStart(2, "0")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado!");
  };

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Relatórios Mensais Estruturados
            </CardTitle>
            <CardDescription>
              {stats.submitted > 0
                ? `${stats.submitted} relatório(s) aguardando análise`
                : "Acompanhe os relatórios mensais dos bolsistas"}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={isLoading}>
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
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
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Users className="w-3 h-3" /> Total
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold text-muted-foreground">{stats.draft}</p>
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <FileText className="w-3 h-3" /> Rascunho
              </p>
            </div>
            <div className="p-3 rounded-lg bg-blue-500/10 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.submitted}</p>
              <p className="text-xs text-blue-600 flex items-center justify-center gap-1">
                <Clock className="w-3 h-3" /> Enviados
              </p>
            </div>
            <div className="p-3 rounded-lg bg-emerald-500/10 text-center">
              <p className="text-2xl font-bold text-emerald-600">{stats.approved}</p>
              <p className="text-xs text-emerald-600 flex items-center justify-center gap-1">
                <CheckCircle className="w-3 h-3" /> Aprovados
              </p>
            </div>
            <div className="p-3 rounded-lg bg-destructive/10 text-center">
              <p className="text-2xl font-bold text-destructive">{stats.returned}</p>
              <p className="text-xs text-destructive flex items-center justify-center gap-1">
                <Undo2 className="w-3 h-3" /> Devolvidos
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Year */}
          <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
            <SelectTrigger>
              <Calendar className="h-4 w-4 mr-2 text-primary" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Month */}
          <Select value={String(selectedMonth)} onValueChange={v => setSelectedMonth(Number(v))}>
            <SelectTrigger className="border-primary/30 bg-primary/5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(m => (
                <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email ou código..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Status */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="draft">Rascunho</SelectItem>
              <SelectItem value="submitted">Enviado</SelectItem>
              <SelectItem value="approved">Aprovado</SelectItem>
              <SelectItem value="returned">Devolvido</SelectItem>
            </SelectContent>
          </Select>

          {/* Thematic */}
          <Select value={thematicFilter} onValueChange={setThematicFilter}>
            <SelectTrigger>
              <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Projeto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {(data?.thematicProjects || []).map(tp => (
                <SelectItem key={tp.id} value={tp.id}>{tp.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
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
                </div>
              ))}
            </div>
          ) : filteredScholars.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileSearch className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">
                {data?.scholars.length === 0
                  ? `Nenhum relatório mensal para ${formatMonthLabel(selectedYear, selectedMonth)}`
                  : "Nenhum bolsista encontrado para os filtros selecionados"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Bolsista</TableHead>
                  <TableHead>Projeto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Enviado em</TableHead>
                  <TableHead className="w-[180px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredScholars.map(scholar => {
                  const report = scholar.reports[0];
                  const isExpanded = expandedUsers.has(scholar.user_id);
                  const canReview = report && ["submitted", "under_review"].includes(report.status);
                  const hasPdf = report && ["submitted", "approved", "under_review"].includes(report.status);

                  return (
                    <Fragment key={scholar.user_id}>
                      <TableRow
                        className={cn("cursor-pointer", isExpanded && "bg-muted/30")}
                        onClick={() => toggleExpand(scholar.user_id)}
                      >
                        <TableCell>
                          <ChevronDown className={cn(
                            "h-4 w-4 transition-transform text-muted-foreground",
                            isExpanded && "rotate-180"
                          )} />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{scholar.full_name}</p>
                            <p className="text-xs text-muted-foreground">{scholar.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{scholar.project_code}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {scholar.thematic_project_title}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {report ? (
                            <MonthlyReportStatusBadge status={report.status as MonthlyReportStatus} />
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">Sem relatório</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {report?.submitted_at
                              ? format(new Date(report.submitted_at), "dd/MM/yyyy HH:mm")
                              : "-"}
                          </span>
                        </TableCell>
                        <TableCell onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            {hasPdf && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleViewPdf(report.id)}
                                disabled={pdfLoading}
                                title="Ver PDF"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            {report && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleViewFields(report.id, scholar.full_name)}
                                title="Ver campos"
                              >
                                <FileSearch className="h-4 w-4" />
                              </Button>
                            )}
                            {canReview && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8"
                                onClick={() => handleOpenReview(report, scholar)}
                              >
                                Avaliar
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Expanded row with report details */}
                      {isExpanded && report && (
                        <TableRow className="bg-muted/20 hover:bg-muted/20">
                          <TableCell colSpan={6} className="p-0">
                            <div className="p-4 space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                  <p className="text-xs font-medium text-muted-foreground">Período</p>
                                  <p className="text-sm">{formatMonthLabel(report.period_year, report.period_month)}</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs font-medium text-muted-foreground">Criado em</p>
                                  <p className="text-sm">{format(new Date(report.created_at), "dd/MM/yyyy HH:mm")}</p>
                                </div>
                                {report.submitted_at && (
                                  <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground">Enviado em</p>
                                    <p className="text-sm">{format(new Date(report.submitted_at), "dd/MM/yyyy HH:mm")}</p>
                                  </div>
                                )}
                                {report.approved_at && (
                                  <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground">Aprovado em</p>
                                    <p className="text-sm">{format(new Date(report.approved_at), "dd/MM/yyyy HH:mm")}</p>
                                  </div>
                                )}
                                {report.returned_at && (
                                  <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground">Devolvido em</p>
                                    <p className="text-sm">{format(new Date(report.returned_at), "dd/MM/yyyy HH:mm")}</p>
                                  </div>
                                )}
                              </div>

                              {report.return_reason && (
                                <div className="p-3 bg-destructive/10 rounded-lg">
                                  <p className="text-xs font-medium text-destructive mb-1">Motivo da devolução</p>
                                  <p className="text-sm text-foreground">{report.return_reason}</p>
                                </div>
                              )}

                              <div className="flex gap-2 pt-2">
                                {hasPdf && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleViewPdf(report.id)}
                                    disabled={pdfLoading}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    Ver PDF
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewFields(report.id, scholar.full_name)}
                                >
                                  <FileSearch className="h-4 w-4 mr-2" />
                                  Ver Campos
                                </Button>
                                {canReview && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleOpenReview(report, scholar)}
                                  >
                                    Avaliar Relatório
                                  </Button>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-3 shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <FileSearch className="w-5 h-5 text-primary" />
              Avaliar Relatório Mensal
            </DialogTitle>
            <DialogDescription>Analise o relatório e forneça seu parecer</DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
            {selectedReport && selectedScholar && (
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Bolsista</span>
                    <span className="font-medium text-sm">{selectedScholar.full_name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Projeto</span>
                    <span className="font-medium text-sm">{selectedScholar.project_code}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Período</span>
                    <span className="font-medium text-sm">
                      {formatMonthLabel(selectedReport.period_year, selectedReport.period_month)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <MonthlyReportStatusBadge status={selectedReport.status as MonthlyReportStatus} />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleViewFields(selectedReport.id, selectedScholar?.full_name)}
                  >
                    <FileSearch className="h-4 w-4 mr-2" />
                    Ver Campos
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleViewPdf(selectedReport.id)}
                    disabled={pdfLoading}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver PDF
                  </Button>
                </div>

                {/* AI Panel */}
                <MonthlyReportAIPanel
                  reportId={selectedReport.id}
                  projectId={selectedReport.project_id}
                  onInsertToFeedback={(text) => setFeedback(prev => prev ? prev + "\n\n" + text : text)}
                />

                <div className="space-y-2">
                  <Label htmlFor="mr-feedback">Parecer / Observações</Label>
                  <Textarea
                    id="mr-feedback"
                    placeholder="Adicione seu parecer sobre o relatório..."
                    value={feedback}
                    onChange={e => setFeedback(e.target.value)}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">* Obrigatório para devolução</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="px-6 pb-6 pt-3 border-t shrink-0 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleReturn} disabled={submitting} className="gap-2">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Undo2 className="w-4 h-4" />}
              Devolver
            </Button>
            <Button onClick={handleApprove} disabled={submitting} className="gap-2">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Aprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>

    {/* Fields Dialog */}
    <Dialog open={fieldsDialogOpen} onOpenChange={setFieldsDialogOpen}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSearch className="h-5 w-5" />
            Campos do Relatório
          </DialogTitle>
          <DialogDescription>
            Conteúdo preenchido por {fieldsScholarName}
          </DialogDescription>
        </DialogHeader>

        {fieldsPayload && (
          <div className="space-y-4 mt-2">
            {[
              { key: "atividades_realizadas", label: "Atividades Realizadas", icon: "📋" },
              { key: "resultados_alcancados", label: "Resultados Alcançados", icon: "📊" },
              { key: "dificuldades_encontradas", label: "Dificuldades Encontradas", icon: "⚠️" },
              { key: "proximos_passos", label: "Próximos Passos", icon: "🔜" },
              { key: "horas_dedicadas", label: "Horas Dedicadas", icon: "⏱️" },
              { key: "observacoes", label: "Observações", icon: "📝" },
            ].map(({ key, label, icon }) => {
              const value = fieldsPayload[key];
              if (!value && key !== "atividades_realizadas" && key !== "resultados_alcancados") return null;
              return (
                <div key={key} className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">{icon} {label}</p>
                  <div className="rounded-md border bg-muted/30 p-3">
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {String(value || "Não informado")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setFieldsDialogOpen(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
