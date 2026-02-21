import { useState } from "react";
import { FileText, ExternalLink, Download, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PdfViewerDialog } from "@/components/ui/PdfViewerDialog";

type PdfDialogStatus = "loading" | "ready" | "error";

interface PdfReadyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signedUrl: string | null;
  title?: string;
  status?: PdfDialogStatus;
  errorMessage?: string;
  onRetry?: () => void;
}

export function PdfReadyDialog({
  open,
  onOpenChange,
  signedUrl,
  title = "Relatório pronto",
  status = "ready",
  errorMessage,
  onRetry,
}: PdfReadyDialogProps) {
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);

  const handleOpen = () => {
    if (!signedUrl) return;
    setPdfViewerOpen(true);
    onOpenChange(false);
  };

  const handleDownload = () => {
    if (!signedUrl) return;
    const link = document.createElement("a");
    link.href = signedUrl;
    link.download = "relatorio.pdf";
    link.click();
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {status === "loading" ? (
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
              ) : status === "error" ? (
                <AlertCircle className="h-5 w-5 text-destructive" />
              ) : (
                <FileText className="h-5 w-5 text-primary" />
              )}
              {status === "loading"
                ? "Gerando relatório..."
                : status === "error"
                  ? "Erro ao gerar relatório"
                  : title}
            </DialogTitle>
            <DialogDescription>
              {status === "loading"
                ? "Aguarde enquanto o relatório está sendo gerado. Isso pode levar alguns segundos."
                : status === "error"
                  ? errorMessage || "Não foi possível gerar o relatório. Tente novamente."
                  : "Seu relatório foi gerado com sucesso. Escolha como deseja acessá-lo."}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
            {status === "loading" && (
              <Button variant="outline" className="flex-1 min-h-[44px]" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
            )}
            {status === "error" && (
              <>
                <Button variant="outline" className="flex-1 min-h-[44px]" onClick={() => onOpenChange(false)}>
                  Fechar
                </Button>
                {onRetry && (
                  <Button className="flex-1 min-h-[44px]" onClick={onRetry}>
                    Tentar novamente
                  </Button>
                )}
              </>
            )}
            {status === "ready" && signedUrl && (
              <>
                <Button variant="ghost" className="flex-1 min-h-[44px]" onClick={() => onOpenChange(false)}>
                  Fechar
                </Button>
                <Button variant="outline" className="flex-1 min-h-[44px]" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar
                </Button>
                <Button className="flex-1 min-h-[44px]" onClick={handleOpen}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PdfViewerDialog
        open={pdfViewerOpen}
        onOpenChange={setPdfViewerOpen}
        title={title}
        pdfUrl={signedUrl}
      />
    </>
  );
}
