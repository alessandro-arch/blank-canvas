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
  FileSearch,
  CheckCircle,
  Clock,
  XCircle,
  User,
  Calendar,
  Eye,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

interface ReportsThematicCardProps {
  group: ThematicReportsGroup;
  onViewPdf: (fileUrl: string) => void;
  onReview: (report: ReportWithDetails) => void;
}

const statusConfig: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  under_review: { label: "Em Análise", icon: Clock, className: "bg-warning/10 text-warning border-warning/20" },
  approved: { label: "Aprovado", icon: CheckCircle, className: "bg-success/10 text-success border-success/20" },
  rejected: { label: "Devolvido", icon: XCircle, className: "bg-destructive/10 text-destructive border-destructive/20" },
};

function formatReferenceMonth(refMonth: string): string {
  try {
    const [year, month] = refMonth.split("-").map(Number);
    const date = new Date(year, month - 1, 1);
    return format(date, "MMM/yyyy", { locale: ptBR });
  } catch {
    return refMonth;
  }
}

export function ReportsThematicCard({ group, onViewPdf, onReview }: ReportsThematicCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Calculate KPIs
  const totalReports = group.reports.length;
  const underReviewReports = group.reports.filter(r => r.status === 'under_review');
  const approvedReports = group.reports.filter(r => r.status === 'approved');
  const rejectedReports = group.reports.filter(r => r.status === 'rejected');

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
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FileSearch className="h-6 w-6 text-primary" />
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
                  <div className="flex items-center justify-center gap-1 text-warning">
                    <Clock className="h-4 w-4" />
                  </div>
                  <p className="text-xl font-semibold text-warning">{underReviewReports.length}</p>
                  <p className="text-xs text-muted-foreground">Em Análise</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-success">
                    <CheckCircle className="h-4 w-4" />
                  </div>
                  <p className="text-xl font-semibold text-success">{approvedReports.length}</p>
                  <p className="text-xs text-muted-foreground">Aprovados</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-destructive">
                    <XCircle className="h-4 w-4" />
                  </div>
                  <p className="text-xl font-semibold text-destructive">{rejectedReports.length}</p>
                  <p className="text-xs text-muted-foreground">Devolvidos</p>
                </div>
                <div className="text-center border-l pl-6">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground">
                    <FileText className="h-4 w-4" />
                  </div>
                  <p className="text-xl font-semibold text-foreground">{totalReports}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
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
                <p className="text-lg font-semibold text-warning">{underReviewReports.length}</p>
                <p className="text-xs text-muted-foreground">Em Análise</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-success">{approvedReports.length}</p>
                <p className="text-xs text-muted-foreground">Aprovados</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-destructive">{rejectedReports.length}</p>
                <p className="text-xs text-muted-foreground">Devolvidos</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold">{totalReports}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Summary Stats Bar */}
            <div className="flex flex-wrap gap-4 p-4 bg-muted/30 rounded-lg text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Em Análise:</span>
                <Badge variant="secondary" className="bg-warning/10 text-warning">{underReviewReports.length}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Aprovados:</span>
                <Badge className="bg-success">{approvedReports.length}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Devolvidos:</span>
                <Badge variant="destructive">{rejectedReports.length}</Badge>
              </div>
            </div>

            {/* Reports Table */}
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bolsista</TableHead>
                    <TableHead>Projeto</TableHead>
                    <TableHead>Referência</TableHead>
                    <TableHead>Parcela</TableHead>
                    <TableHead>Enviado em</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[160px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.reports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhum relatório encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    group.reports.map((report) => {
                      const config = statusConfig[report.status] || statusConfig.under_review;
                      const StatusIcon = config.icon;

                      return (
                        <TableRow key={report.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                <User className="w-4 h-4 text-muted-foreground" />
                              </div>
                              <span className="font-medium">{report.scholar_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {report.project_code}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatReferenceMonth(report.reference_month)}</TableCell>
                          <TableCell>{report.installment_number}</TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(parseISO(report.submitted_at), "dd/MM/yyyy")}
                            </span>
                          </TableCell>
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
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
                                onClick={() => onViewPdf(report.file_url)}
                              >
                                <Eye className="w-4 h-4" />
                                Ver PDF
                              </Button>
                              {report.status === "under_review" && (
                                <Button
                                  size="sm"
                                  className="gap-1.5"
                                  onClick={() => onReview(report)}
                                >
                                  <FileSearch className="w-4 h-4" />
                                  Avaliar
                                </Button>
                              )}
                            </div>
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
