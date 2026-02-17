import { FileText, Download, Eye, Loader2, CheckCircle, Clock, AlertCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useScholarPayments } from "@/hooks/useScholarPayments";
import { openReportPdf, downloadReportPdf } from "@/hooks/useSignedUrl";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle; className: string }> = {
  approved: { label: "Aprovado", icon: CheckCircle, className: "bg-success/10 text-success" },
  under_review: { label: "Em Análise", icon: Clock, className: "bg-warning/10 text-warning" },
  rejected: { label: "Devolvido", icon: XCircle, className: "bg-destructive/10 text-destructive" },
};

interface ReportsTabProps {
  searchQuery?: string;
}

export function ReportsTab({ searchQuery = "" }: ReportsTabProps) {
  const { data, loading } = useScholarPayments();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const reports = data?.reports ?? [];

  const filtered = reports.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.file_name.toLowerCase().includes(q) ||
      r.reference_month.toLowerCase().includes(q)
    );
  });

  if (filtered.length === 0) {
    return (
      <div className="card-institutional flex flex-col items-center justify-center py-12">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <FileText className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="font-medium text-foreground mb-1">
          {searchQuery ? "Nenhum resultado" : "Nenhum relatório enviado"}
        </p>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          {searchQuery
            ? `Nenhum relatório encontrado para "${searchQuery}".`
            : "Seus relatórios mensais aparecerão aqui após o envio."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filtered.map((report) => {
        const config = statusConfig[report.status] || statusConfig.under_review;
        const StatusIcon = config.icon;

        return (
          <div
            key={report.id}
            className="card-institutional flex flex-col sm:flex-row sm:items-center gap-4 p-4"
          >
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-muted-foreground" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <p className="font-medium text-foreground">{report.file_name}</p>
                <span className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                  config.className
                )}>
                  <StatusIcon className="w-3 h-3" />
                  {config.label}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>Ref: {report.reference_month}</span>
                <span>•</span>
                <span>Parcela {report.installment_number}</span>
                <span>•</span>
                <span>Enviado em {format(new Date(report.submitted_at), "dd/MM/yyyy", { locale: ptBR })}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-primary hover:text-primary"
                onClick={() => openReportPdf(report.file_url)}
              >
                <Eye className="w-4 h-4" />
                <span className="hidden sm:inline">Visualizar</span>
              </Button>
              <Button
                variant="default"
                size="sm"
                className="gap-1.5"
                onClick={() => downloadReportPdf(report.file_url, report.file_name)}
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Baixar</span>
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
