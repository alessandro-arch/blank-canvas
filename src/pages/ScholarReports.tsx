import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PdfViewerDialog } from "@/components/ui/PdfViewerDialog";
import { FileText, Download, Eye, Edit, Info, ExternalLink, History, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { toast } from "sonner";

// Unified report row combining digital (monthly_reports) and legacy (reports)
interface UnifiedReportRow {
  id: string;
  source: "digital" | "legacy";
  reference_month: string; // "2026-01" format
  reference_label: string; // "Janeiro 2026"
  status: string;
  status_label: string;
  submitted_at: string | null;
  return_reason: string | null;
  project_title: string;
  project_code: string;
  thematic_project_title: string;
  versions: number;
  pdf_storage_path: string | null;
  pdf_bucket: string;
  file_name: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  submitted: { label: "Enviado", variant: "default", className: "bg-blue-600 hover:bg-blue-700 text-white" },
  under_review: { label: "Em Análise", variant: "outline" },
  approved: { label: "Aprovado", variant: "default", className: "bg-emerald-600 hover:bg-emerald-700 text-white" },
  returned: { label: "Devolvido", variant: "destructive" },
  cancelled: { label: "Cancelado", variant: "destructive" },
  rejected: { label: "Devolvido", variant: "destructive" },
  replaced_by_digital: { label: "Substituído", variant: "secondary" },
};

const MONTH_NAMES = [
  "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function parseReferenceMonth(ref: string): { label: string; sortKey: string } {
  // Handles "2026-01" or "01/2026" or "Janeiro/2026"
  const dashMatch = ref.match(/^(\d{4})-(\d{2})$/);
  if (dashMatch) {
    const [, y, m] = dashMatch;
    const monthNum = parseInt(m, 10);
    return { label: `${MONTH_NAMES[monthNum] || m} ${y}`, sortKey: ref };
  }
  const slashMatch = ref.match(/^(\d{2})\/(\d{4})$/);
  if (slashMatch) {
    const [, m, y] = slashMatch;
    const monthNum = parseInt(m, 10);
    return { label: `${MONTH_NAMES[monthNum] || m} ${y}`, sortKey: `${y}-${m}` };
  }
  return { label: ref, sortKey: ref };
}

export default function ScholarReports() {
  const { user } = useAuth();
  const [reports, setReports] = useState<UnifiedReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [pdfViewer, setPdfViewer] = useState<{ open: boolean; url: string | null; title: string }>({
    open: false, url: null, title: "",
  });

  useEffect(() => {
    if (!user) return;

    async function fetchAll() {
      setLoading(true);
      try {
        // 1. Fetch digital reports (monthly_reports)
        const { data: digitalReports, error: digitalError } = await supabase
          .from("monthly_reports")
          .select(`
            id, period_year, period_month, status, submitted_at,
            returned_at, return_reason, created_at, project_id,
            projects!monthly_reports_project_id_fkey (
              title, code,
              thematic_projects!projects_thematic_project_id_fkey ( title )
            )
          `)
          .eq("beneficiary_user_id", user!.id)
          .order("period_year", { ascending: false })
          .order("period_month", { ascending: false });

        if (digitalError) throw digitalError;

        // Fetch versions count for digital reports
        const digitalIds = (digitalReports || []).map(r => r.id);
        let versionsMap: Record<string, number> = {};
        let pdfMap: Record<string, string> = {};

        if (digitalIds.length > 0) {
          const [versionsRes, docsRes] = await Promise.all([
            supabase
              .from("monthly_report_versions")
              .select("report_id")
              .in("report_id", digitalIds),
            supabase
              .from("monthly_report_documents")
              .select("report_id, storage_path")
              .in("report_id", digitalIds)
              .eq("type", "official_pdf"),
          ]);

          if (versionsRes.data) {
            for (const v of versionsRes.data) {
              versionsMap[v.report_id] = (versionsMap[v.report_id] || 0) + 1;
            }
          }
          if (docsRes.data) {
            for (const doc of docsRes.data) {
              if (!pdfMap[doc.report_id]) pdfMap[doc.report_id] = doc.storage_path;
            }
          }
        }

        // 2. Fetch legacy reports (reports table)
        const { data: legacyReports, error: legacyError } = await supabase
          .from("reports")
          .select("id, reference_month, status, submitted_at, file_url, file_name, installment_number, feedback, monthly_report_id")
          .eq("user_id", user!.id)
          .order("submitted_at", { ascending: false });

        if (legacyError) throw legacyError;

        // Build unified list
        const unified: UnifiedReportRow[] = [];

        // Digital reports
        for (const r of (digitalReports || []) as any[]) {
          const refMonth = `${r.period_year}-${String(r.period_month).padStart(2, "0")}`;
          unified.push({
            id: r.id,
            source: "digital",
            reference_month: refMonth,
            reference_label: `${MONTH_NAMES[r.period_month]} ${r.period_year}`,
            status: r.status,
            status_label: STATUS_CONFIG[r.status]?.label || r.status,
            submitted_at: r.submitted_at,
            return_reason: r.return_reason,
            project_title: r.projects?.title || "—",
            project_code: r.projects?.code || "—",
            thematic_project_title: r.projects?.thematic_projects?.title || "—",
            versions: versionsMap[r.id] || 0,
            pdf_storage_path: pdfMap[r.id] || null,
            pdf_bucket: "relatorios",
            file_name: null,
          });
        }

        // Legacy reports (exclude those already replaced by digital)
        for (const r of (legacyReports || [])) {
          if (r.monthly_report_id) continue; // already linked to digital
          const parsed = parseReferenceMonth(r.reference_month);
          unified.push({
            id: r.id,
            source: "legacy",
            reference_month: parsed.sortKey,
            reference_label: parsed.label,
            status: r.status,
            status_label: STATUS_CONFIG[r.status]?.label || r.status,
            submitted_at: r.submitted_at,
            return_reason: r.feedback || null,
            project_title: "—",
            project_code: `Parcela ${r.installment_number}`,
            thematic_project_title: "—",
            versions: 1,
            pdf_storage_path: r.file_url || null,
            pdf_bucket: "reports",
            file_name: r.file_name || null,
          });
        }

        // Sort by reference month desc
        unified.sort((a, b) => b.reference_month.localeCompare(a.reference_month));

        setReports(unified);
      } catch (err) {
        console.error("[ScholarReports] Error:", err);
        toast.error("Erro ao carregar relatórios");
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, [user]);

  const getSignedUrl = async (bucket: string, path: string): Promise<string | null> => {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 900);
    if (error) { toast.error("Erro ao acessar arquivo"); return null; }
    return data?.signedUrl || null;
  };

  const handleDownloadPdf = async (report: UnifiedReportRow) => {
    if (!report.pdf_storage_path) { toast.error("PDF não disponível"); return; }
    setDownloadingId(report.id);
    try {
      const url = await getSignedUrl(report.pdf_bucket, report.pdf_storage_path);
      if (url) {
        const link = document.createElement("a");
        link.href = url;
        link.download = report.file_name || `relatorio-${report.reference_month}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch { toast.error("Erro ao baixar PDF"); }
    finally { setDownloadingId(null); }
  };

  const handleViewPdf = async (report: UnifiedReportRow) => {
    if (!report.pdf_storage_path) { toast.error("PDF não disponível"); return; }
    try {
      const url = await getSignedUrl(report.pdf_bucket, report.pdf_storage_path);
      if (url) {
        setPdfViewer({
          open: true,
          url,
          title: `Relatório ${report.reference_label}`,
        });
      }
    } catch { toast.error("Erro ao abrir PDF"); }
  };

  const renderStatusBadge = (report: UnifiedReportRow) => {
    const config = STATUS_CONFIG[report.status] || STATUS_CONFIG.draft;
    return (
      <div className="flex items-center gap-1.5">
        <Badge variant={config.variant} className={config.className}>
          {config.label}
        </Badge>
        {report.source === "legacy" && (
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground border-muted-foreground/30">
                PDF
              </Badge>
            </TooltipTrigger>
            <TooltipContent>Relatório enviado no formato antigo (PDF)</TooltipContent>
          </Tooltip>
        )}
      </div>
    );
  };

  const renderActions = (report: UnifiedReportRow) => {
    const actions: React.ReactNode[] = [];

    // Draft/returned digital → edit
    if (report.source === "digital" && (report.status === "draft" || report.status === "returned")) {
      actions.push(
        <Link key="edit" to="/bolsista/painel">
          <Button size="sm" variant="outline" className="gap-1.5">
            <Edit className="w-4 h-4" />
            <span className="hidden sm:inline">
              {report.status === "returned" ? "Corrigir" : "Editar"}
            </span>
          </Button>
        </Link>
      );
    }

    // View PDF (any report with a PDF)
    if (report.pdf_storage_path && report.status !== "draft") {
      actions.push(
        <Button
          key="view"
          size="sm"
          variant="ghost"
          className="gap-1.5 text-primary"
          onClick={() => handleViewPdf(report)}
        >
          <Eye className="w-4 h-4" />
          <span className="hidden sm:inline">Visualizar</span>
        </Button>
      );
    }

    // Download PDF
    if (report.pdf_storage_path && report.status !== "draft") {
      actions.push(
        <Button
          key="download"
          size="sm"
          variant="default"
          className="gap-1.5"
          disabled={downloadingId === report.id}
          onClick={() => handleDownloadPdf(report)}
        >
          {downloadingId === report.id ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">Baixar PDF</span>
        </Button>
      );
    }

    if (actions.length === 0) {
      actions.push(
        <span key="none" className="text-xs text-muted-foreground">—</span>
      );
    }

    return <div className="flex items-center gap-2">{actions}</div>;
  };

  const totalDigital = reports.filter(r => r.source === "digital").length;
  const totalLegacy = reports.filter(r => r.source === "legacy").length;

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Meus Relatórios</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Histórico completo de relatórios enviados — digitais e legados
              </p>
            </div>

            {/* Info banner */}
            <div className="flex items-start gap-3 p-4 rounded-lg bg-info/10 border border-info/20">
              <Info className="w-5 h-5 text-info flex-shrink-0 mt-0.5" />
              <div className="text-sm text-foreground space-y-1">
                <p>
                  Seus relatórios enviados ficam disponíveis para consulta e download do PDF oficial.
                </p>
                <p className="text-muted-foreground">
                  Para criar ou editar relatórios, acesse seu{" "}
                  <Link to="/bolsista/painel" className="text-primary font-medium hover:underline inline-flex items-center gap-1">
                    Painel <ExternalLink className="w-3 h-3" />
                  </Link>
                  {" "}e utilize o formulário de Relatório Mensal.
                </p>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Relatórios Mensais
                </CardTitle>
                <CardDescription>
                  {reports.length > 0
                    ? `${reports.length} relatório(s) — ${totalDigital} digital(is)${totalLegacy > 0 ? `, ${totalLegacy} legado(s)` : ""}`
                    : "Nenhum relatório encontrado"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-14 w-full" />
                    ))}
                  </div>
                ) : reports.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                      <FileText className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="font-medium text-foreground mb-1">Nenhum relatório encontrado</p>
                    <p className="text-sm text-muted-foreground text-center max-w-md">
                      Quando você enviar relatórios mensais pelo formulário digital, eles aparecerão aqui.
                    </p>
                    <Link to="/bolsista/painel" className="mt-4">
                      <Button variant="outline" className="gap-1.5">
                        <ExternalLink className="w-4 h-4" />
                        Ir para o Painel
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Mês Referência</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Data Envio</TableHead>
                          <TableHead className="hidden sm:table-cell text-center">Versões</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reports.map(report => (
                          <TableRow key={`${report.source}-${report.id}`}>
                            <TableCell className="font-medium whitespace-nowrap">
                              {report.reference_label}
                            </TableCell>
                            <TableCell>
                              {renderStatusBadge(report)}
                              {report.status === "returned" && report.return_reason && (
                                <p className="text-xs text-destructive mt-1 max-w-[200px] truncate" title={report.return_reason}>
                                  {report.return_reason}
                                </p>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                              {report.submitted_at
                                ? format(new Date(report.submitted_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                                : "—"}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-center">
                              {report.versions > 0 ? (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                                      <History className="w-3.5 h-3.5" />
                                      {report.versions}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {report.versions === 1
                                      ? "1 versão registrada"
                                      : `${report.versions} versões registradas`}
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {renderActions(report)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </main>
        </div>
      </div>

      {/* PDF Viewer Modal */}
      <PdfViewerDialog
        open={pdfViewer.open}
        onOpenChange={(open) => setPdfViewer(prev => ({ ...prev, open }))}
        title={pdfViewer.title}
        pdfUrl={pdfViewer.url}
      />
    </TooltipProvider>
  );
}
