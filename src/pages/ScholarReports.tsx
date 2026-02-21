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
import { FileText, Download, Eye, Edit, Send, Info, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ReportRow {
  id: string;
  period_year: number;
  period_month: number;
  status: string;
  submitted_at: string | null;
  approved_at: string | null;
  returned_at: string | null;
  return_reason: string | null;
  created_at: string;
  project_id: string;
  project_title: string;
  project_code: string;
  thematic_project_title: string;
  pdf_storage_path: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  submitted: { label: "Enviado", variant: "default", className: "bg-blue-600 hover:bg-blue-700 text-white" },
  under_review: { label: "Em Análise", variant: "outline" },
  approved: { label: "Aprovado", variant: "default", className: "bg-emerald-600 hover:bg-emerald-700 text-white" },
  returned: { label: "Devolvido", variant: "destructive" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

const MONTH_NAMES = [
  "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function ScholarReports() {
  const { user } = useAuth();
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    async function fetchReports() {
      setLoading(true);
      try {
        // Fetch monthly reports with project info
        const { data: monthlyReports, error } = await supabase
          .from("monthly_reports")
          .select(`
            id, period_year, period_month, status, submitted_at, approved_at,
            returned_at, return_reason, created_at, project_id,
            projects!monthly_reports_project_id_fkey (
              title, code,
              thematic_projects!projects_thematic_project_id_fkey ( title )
            )
          `)
          .eq("beneficiary_user_id", user!.id)
          .order("period_year", { ascending: false })
          .order("period_month", { ascending: false });

        if (error) throw error;

        // Fetch PDF documents for all reports
        const reportIds = (monthlyReports || []).map(r => r.id);
        let pdfMap: Record<string, string> = {};

        if (reportIds.length > 0) {
          const { data: docs } = await supabase
            .from("monthly_report_documents")
            .select("report_id, storage_path")
            .in("report_id", reportIds)
            .eq("type", "official_pdf");

          if (docs) {
            for (const doc of docs) {
              if (!pdfMap[doc.report_id]) {
                pdfMap[doc.report_id] = doc.storage_path;
              }
            }
          }
        }

        const rows: ReportRow[] = (monthlyReports || []).map((r: any) => ({
          id: r.id,
          period_year: r.period_year,
          period_month: r.period_month,
          status: r.status,
          submitted_at: r.submitted_at,
          approved_at: r.approved_at,
          returned_at: r.returned_at,
          return_reason: r.return_reason,
          created_at: r.created_at,
          project_id: r.project_id,
          project_title: r.projects?.title || "—",
          project_code: r.projects?.code || "—",
          thematic_project_title: r.projects?.thematic_projects?.title || "—",
          pdf_storage_path: pdfMap[r.id] || null,
        }));

        setReports(rows);
      } catch (err) {
        console.error("[ScholarReports] Error:", err);
        toast.error("Erro ao carregar relatórios");
      } finally {
        setLoading(false);
      }
    }

    fetchReports();
  }, [user]);

  const handleDownloadPdf = async (report: ReportRow) => {
    if (!report.pdf_storage_path) {
      toast.error("PDF não disponível para este relatório");
      return;
    }
    setDownloadingId(report.id);
    try {
      const { data, error } = await supabase.storage
        .from("relatorios")
        .createSignedUrl(report.pdf_storage_path, 900);

      if (error) throw error;
      if (data?.signedUrl) {
        const link = document.createElement("a");
        link.href = data.signedUrl;
        link.download = `relatorio-${report.period_year}-${String(report.period_month).padStart(2, "0")}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch {
      toast.error("Erro ao baixar PDF");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleViewPdf = async (report: ReportRow) => {
    if (!report.pdf_storage_path) {
      toast.error("PDF não disponível para este relatório");
      return;
    }
    try {
      const { data, error } = await supabase.storage
        .from("relatorios")
        .createSignedUrl(report.pdf_storage_path, 900);

      if (error) throw error;
      if (data?.signedUrl) {
        const opened = window.open(data.signedUrl, "_blank", "noopener,noreferrer");
        if (!opened) window.location.href = data.signedUrl;
      }
    } catch {
      toast.error("Erro ao abrir PDF");
    }
  };

  const renderStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const renderActions = (report: ReportRow) => {
    const actions: React.ReactNode[] = [];

    if (report.status === "draft" || report.status === "returned") {
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

    if (["submitted", "under_review", "approved"].includes(report.status)) {
      if (report.pdf_storage_path) {
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
    }

    if (report.status === "approved" && report.pdf_storage_path) {
      actions.push(
        <Button
          key="download"
          size="sm"
          variant="default"
          className="gap-1.5"
          disabled={downloadingId === report.id}
          onClick={() => handleDownloadPdf(report)}
        >
          <Download className="w-4 h-4" />
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

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Meus Relatórios</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Histórico completo de relatórios mensais enviados
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
                  ? `${reports.length} relatório(s) encontrado(s)`
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
                        <TableHead>Período</TableHead>
                        <TableHead className="hidden md:table-cell">Projeto Temático</TableHead>
                        <TableHead className="hidden lg:table-cell">Subprojeto</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden sm:table-cell">Envio</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.map(report => (
                        <TableRow key={report.id}>
                          <TableCell className="font-medium">
                            {MONTH_NAMES[report.period_month]} {report.period_year}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground">
                            {report.thematic_project_title}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-muted-foreground">
                            <span className="text-xs">{report.project_code}</span>
                            <br />
                            <span className="text-xs text-muted-foreground/70">{report.project_title}</span>
                          </TableCell>
                          <TableCell>
                            {renderStatusBadge(report.status)}
                            {report.status === "returned" && report.return_reason && (
                              <p className="text-xs text-destructive mt-1 max-w-[200px] truncate" title={report.return_reason}>
                                {report.return_reason}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                            {report.submitted_at
                              ? format(new Date(report.submitted_at), "dd/MM/yyyy", { locale: ptBR })
                              : "—"}
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
  );
}
