import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X, Loader2, AlertCircle } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface PdfViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  pdfUrl: string | null;
}

export function PdfViewerDialog({
  open,
  onOpenChange,
  title,
  pdfUrl,
}: PdfViewerDialogProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const isMobile = useIsMobile();

  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = `${title.replace(/\s+/g, "_")}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleLoad = () => {
    setLoading(false);
    setError(false);
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      setLoading(true);
      setError(false);
    }
    onOpenChange(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={`${
          isMobile
            ? "max-w-[98vw] max-h-[95vh] p-3"
            : "max-w-4xl max-h-[90vh] p-6"
        } flex flex-col gap-0`}
      >
        <DialogHeader className="flex-shrink-0 pb-3">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-lg font-semibold truncate">
              {title}
            </DialogTitle>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={!pdfUrl || error}
              >
                <Download className="h-4 w-4 mr-1.5" />
                Baixar PDF
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div
          className={`relative flex-1 min-h-0 rounded-md border bg-muted/30 overflow-hidden ${
            isMobile ? "h-[70vh]" : "h-[70vh]"
          }`}
        >
          {loading && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 bg-background/80">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Carregando documento...
              </p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 bg-background">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <p className="text-sm text-muted-foreground text-center px-4">
                Não foi possível carregar o PDF no visualizador.
              </p>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-1.5" />
                Baixar PDF diretamente
              </Button>
            </div>
          )}

          {pdfUrl && (
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0"
              title={title}
              onLoad={handleLoad}
              onError={handleError}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
