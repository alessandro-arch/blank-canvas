import { History, FileText, CheckCircle, XCircle, Clock, Download, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { openReportPdf, downloadReportPdf } from "@/hooks/useSignedUrl";

export interface ReportVersion {
  id: string;
  version: number;
  submittedAt: string;
  status: "approved" | "rejected" | "under_review";
  feedback?: string;
  fileUrl?: string;
}

interface ReportVersionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referenceMonth: string;
  referenceMonthRaw?: string;
  versions: ReportVersion[];
}

const statusConfig = {
  approved: { 
    label: "Aprovado", 
    icon: CheckCircle, 
    className: "text-success bg-success/10" 
  },
  rejected: { 
    label: "Devolvido", 
    icon: XCircle, 
    className: "text-destructive bg-destructive/10" 
  },
  under_review: { 
    label: "Em Análise", 
    icon: Clock, 
    className: "text-info bg-info/10" 
  },
};

export function ReportVersionsDialog({ 
  open, 
  onOpenChange, 
  referenceMonth,
  referenceMonthRaw,
  versions 
}: ReportVersionsDialogProps) {
  const handleViewPdf = (fileUrl: string) => {
    openReportPdf(fileUrl);
  };

  const handleDownloadPdf = (fileUrl: string, version: number) => {
    const fileName = `relatorio_${referenceMonthRaw || referenceMonth}_v${version}.pdf`;
    downloadReportPdf(fileUrl, fileName);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Histórico de Versões
          </DialogTitle>
          <DialogDescription>
            Versões do relatório de {referenceMonth}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-3">
          {versions.map((version, index) => {
            const config = statusConfig[version.status];
            const StatusIcon = config.icon;
            const isLatest = index === 0;

            return (
              <div 
                key={version.id}
                className={cn(
                  "p-4 rounded-lg border transition-colors",
                  isLatest ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">
                          Versão {version.version}
                        </p>
                        {isLatest && (
                          <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                            Atual
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Enviado em {version.submittedAt}
                      </p>
                      <div className="mt-2">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
                          config.className
                        )}>
                          <StatusIcon className="w-3 h-3" />
                          {config.label}
                        </span>
                      </div>
                      {version.feedback && (
                        <p className="mt-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                          <strong>Parecer:</strong> {version.feedback}
                        </p>
                      )}
                    </div>
                  </div>
                  {version.fileUrl && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleViewPdf(version.fileUrl!)}
                        title="Visualizar PDF"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDownloadPdf(version.fileUrl!, version.version)}
                        title="Baixar PDF"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
