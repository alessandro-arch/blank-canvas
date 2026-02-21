import { useState, Fragment } from "react";
import {
  ChevronDown,
  User,
  Calendar,
  Eye,
  FileSearch,
  FileUp,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  AlertTriangle,
  Send,
  Download,
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
import { cn } from "@/lib/utils";
import { format, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface ReportRecord {
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
  old_file_url: string | null;
  replaced_at: string | null;
  replaced_by: string | null;
  replace_reason: string | null;
}

export interface ScholarRow {
  user_id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  has_bank_data: boolean;
  project_title: string;
  project_code: string;
  thematic_project_title: string;
  enrollment_id: string;
  current_report: ReportRecord | null;
  all_reports: ReportRecord[];
}

interface ScholarReportRowProps {
  scholar: ScholarRow;
  selectedMonth: string;
  onViewPdf: (fileUrl: string) => void;
  onReview: (report: ReportRecord, scholar: ScholarRow) => void;
  onReplaceFile: (report: ReportRecord, scholar: ScholarRow) => void;
  onSendReminder: (scholar: ScholarRow) => void;
}

const statusConfig: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  pending: { label: "Pendente", icon: Clock, className: "bg-muted text-muted-foreground border-muted" },
  under_review: { label: "Em Análise", icon: Clock, className: "bg-warning/10 text-warning border-warning/20" },
  approved: { label: "Aprovado", icon: CheckCircle, className: "bg-success/10 text-success border-success/20" },
  rejected: { label: "Devolvido", icon: XCircle, className: "bg-destructive/10 text-destructive border-destructive/20" },
};

function formatMonth(refMonth: string): string {
  try {
    const [year, month] = refMonth.split("-").map(Number);
    const d = new Date(year, month - 1, 1);
    return format(d, "MMM/yyyy", { locale: ptBR });
  } catch {
    return refMonth;
  }
}

function getDeadlineText(report: ReportRecord | null, selectedMonth: string): { text: string; urgent: boolean } | null {
  if (!report) {
    try {
      const [y, m] = selectedMonth.split("-").map(Number);
      const endOfMonth = new Date(y, m, 0);
      const daysLeft = differenceInDays(endOfMonth, new Date());
      if (daysLeft < 0) return { text: `Atrasado (${Math.abs(daysLeft)}d)`, urgent: true };
      if (daysLeft <= 5) return { text: `Vence em ${daysLeft}d`, urgent: true };
      return { text: `Vence em ${daysLeft}d`, urgent: false };
    } catch {
      return null;
    }
  }

  if (report.status === "rejected" && report.resubmission_deadline) {
    const deadline = parseISO(report.resubmission_deadline);
    const daysLeft = differenceInDays(deadline, new Date());
    if (daysLeft < 0) return { text: `Reenvio atrasado (${Math.abs(daysLeft)}d)`, urgent: true };
    return { text: `Reenvio em ${daysLeft}d`, urgent: daysLeft <= 3 };
  }

  return null;
}

export function ScholarReportRow({
  scholar,
  selectedMonth,
  onViewPdf,
  onReview,
  onReplaceFile,
  onSendReminder,
}: ScholarReportRowProps) {
  const [isOpen, setIsOpen] = useState(false);

  const report = scholar.current_report;
  const reportStatus = report?.status || "pending";
  const config = statusConfig[reportStatus] || statusConfig.pending;
  const StatusIcon = config.icon;
  const deadline = getDeadlineText(report, selectedMonth);

  return (
    <Fragment>
      {/* Main Row */}
      <TableRow
        className="cursor-pointer hover:bg-muted/50 transition-colors group"
        onClick={() => setIsOpen(!isOpen)}
      >
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

        {/* Submitted date */}
        <TableCell>
          {report ? (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(parseISO(report.submitted_at), "dd/MM/yyyy")}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </TableCell>

        {/* Deadline */}
        <TableCell>
          {deadline ? (
            <span className={cn(
              "text-xs font-medium flex items-center gap-1",
              deadline.urgent ? "text-destructive" : "text-muted-foreground"
            )}>
              {deadline.urgent && <AlertTriangle className="w-3 h-3" />}
              {deadline.text}
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

      {/* Expanded History Panel */}
      {isOpen && (
        <TableRow>
          <TableCell colSpan={6} className="p-0">
            <div className="bg-muted/30 border-t border-b px-6 py-4 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h4 className="font-semibold text-sm">Relatórios de {scholar.full_name}</h4>
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
                  {scholar.all_reports.length} relatório(s)
                </span>
              </div>

              {/* Inner reports table */}
              {scholar.all_reports.length === 0 ? (
                <div className="text-center py-8 border rounded-lg bg-background">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground mb-3">
                    Sem relatório nesta competência
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
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Data envio</TableHead>
                        <TableHead className="text-xs">Última ação</TableHead>
                        <TableHead className="text-xs">Arquivo</TableHead>
                        <TableHead className="text-xs w-[200px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scholar.all_reports.map((r) => {
                        const rConfig = statusConfig[r.status] || statusConfig.under_review;
                        const RIcon = rConfig.icon;
                        return (
                          <TableRow key={r.id}>
                            <TableCell className="text-sm font-medium">
                              {formatMonth(r.reference_month)}
                            </TableCell>
                            <TableCell>
                              <span className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border",
                                rConfig.className
                              )}>
                                <RIcon className="w-3 h-3" />
                                {rConfig.label}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {format(parseISO(r.submitted_at), "dd/MM/yyyy")}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {r.reviewed_at
                                ? format(parseISO(r.reviewed_at), "dd/MM/yyyy")
                                : r.replaced_at
                                  ? `Subst. ${format(parseISO(r.replaced_at), "dd/MM/yyyy")}`
                                  : "—"
                              }
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-1 text-xs h-7 px-2"
                                  onClick={() => onViewPdf(r.file_url)}
                                >
                                  <Eye className="w-3 h-3" />
                                  Ver
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-1 text-xs h-7 px-2"
                                  onClick={() => onViewPdf(r.file_url)}
                                >
                                  <Download className="w-3 h-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 flex-wrap">
                                {r.status === "under_review" && (
                                  <Button
                                    size="sm"
                                    className="gap-1 text-xs h-7 px-2"
                                    onClick={() => onReview(r, scholar)}
                                  >
                                    <FileSearch className="w-3 h-3" />
                                    Analisar
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1 text-xs h-7 px-2"
                                  onClick={() => onReplaceFile(r, scholar)}
                                >
                                  <FileUp className="w-3 h-3" />
                                  Substituir
                                </Button>
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
          </TableCell>
        </TableRow>
      )}
    </Fragment>
  );
}
