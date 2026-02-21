import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Download,
  Loader2,
  AlertCircle,
  Maximize2,
  Minimize2,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface PdfViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  pdfUrl: string | null;
}

const ZOOM_STEPS = [50, 75, 100, 125, 150, 200];
const DEFAULT_ZOOM_INDEX = 2; // 100%

export function PdfViewerDialog({
  open,
  onOpenChange,
  title,
  pdfUrl,
}: PdfViewerDialogProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);
  const isMobile = useIsMobile();

  const zoom = ZOOM_STEPS[zoomIndex];

  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = `${title.replace(/\s+/g, "_")}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOpenNewTab = () => {
    if (!pdfUrl) return;
    window.open(pdfUrl, "_blank", "noopener,noreferrer");
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
      setIsFullscreen(false);
      setZoomIndex(DEFAULT_ZOOM_INDEX);
    }
    onOpenChange(value);
  };

  const handleZoomIn = useCallback(() => {
    setZoomIndex((i) => Math.min(i + 1, ZOOM_STEPS.length - 1));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomIndex((i) => Math.max(i - 1, 0));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoomIndex(DEFAULT_ZOOM_INDEX);
  }, []);

  // Build iframe src with embedded viewer hint for fit-width
  const viewerSrc = pdfUrl
    ? `${pdfUrl}#view=FitH&toolbar=1&navpanes=0`
    : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          "flex flex-col gap-0 overflow-hidden",
          isFullscreen
            ? "max-w-[100vw] max-h-[100vh] w-screen h-screen rounded-none p-0"
            : isMobile
              ? "max-w-[98vw] max-h-[95vh] h-[95vh] p-3"
              : "max-w-5xl max-h-[90vh] h-[88vh] p-5"
        )}
      >
        {/* Header — fixed */}
        <DialogHeader
          className={cn(
            "flex-shrink-0 border-b border-border",
            isFullscreen ? "px-5 py-3" : "pb-3"
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-base font-semibold truncate flex-1 min-w-0">
              {title}
            </DialogTitle>

            {/* Actions row */}
            <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
              {/* Zoom controls — hidden on mobile (pinch zoom instead) */}
              {!isMobile && (
                <div className="flex items-center gap-0.5 border border-border rounded-md px-1 py-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleZoomOut}
                    disabled={zoomIndex === 0 || !pdfUrl || error}
                    title="Diminuir zoom"
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </Button>
                  <button
                    className="text-xs font-medium text-muted-foreground min-w-[3rem] text-center hover:text-foreground transition-colors"
                    onClick={handleZoomReset}
                    title="Resetar zoom"
                  >
                    {zoom}%
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleZoomIn}
                    disabled={zoomIndex === ZOOM_STEPS.length - 1 || !pdfUrl || error}
                    title="Aumentar zoom"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleOpenNewTab}
                disabled={!pdfUrl || error}
                title="Abrir em nova aba"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>

              {!isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsFullscreen((f) => !f)}
                  title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={handleDownload}
                disabled={!pdfUrl || error}
              >
                <Download className="h-3.5 w-3.5" />
                <span className={isMobile ? "sr-only" : ""}>Baixar PDF</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Body — viewer area fills remaining height */}
        <div
          className={cn(
            "relative flex-1 min-h-0 overflow-auto rounded-md border bg-muted/10",
            isFullscreen ? "mx-2 mb-2 mt-2" : "mt-3"
          )}
          style={{
            WebkitOverflowScrolling: "touch",
          }}
        >
          {/* Loading overlay */}
          {loading && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 bg-background/80">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Carregando documento...
              </p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10 bg-background p-6">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-foreground">
                  Não foi possível carregar o PDF
                </p>
                <p className="text-xs text-muted-foreground">
                  Tente abrir em uma nova aba ou baixar o arquivo.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleOpenNewTab}>
                  <ExternalLink className="h-4 w-4 mr-1.5" />
                  Nova aba
                </Button>
                <Button variant="default" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-1.5" />
                  Baixar PDF
                </Button>
              </div>
            </div>
          )}

          {/* PDF viewer */}
          {viewerSrc && (
            <div
              className="w-full origin-top-left"
              style={{
                transform: !isMobile ? `scale(${zoom / 100})` : undefined,
                transformOrigin: "top left",
                width: !isMobile ? `${10000 / zoom}%` : "100%",
                minHeight: "100%",
              }}
            >
              <iframe
                src={viewerSrc}
                className="w-full border-0"
                style={{
                  height: !isMobile
                    ? `${Math.max(100, 10000 / zoom)}vh`
                    : "calc(100vh - 120px)",
                  minHeight: isMobile ? "70vh" : "80vh",
                }}
                title={title}
                onLoad={handleLoad}
                onError={handleError}
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                referrerPolicy="no-referrer"
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
