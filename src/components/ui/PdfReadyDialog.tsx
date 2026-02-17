import { FileText, ExternalLink, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PdfReadyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signedUrl: string | null;
  title?: string;
}

export function PdfReadyDialog({
  open,
  onOpenChange,
  signedUrl,
  title = "Relatório pronto",
}: PdfReadyDialogProps) {
  if (!signedUrl) return null;

  const handleOpen = () => {
    window.open(signedUrl, "_blank", "noopener,noreferrer");
    onOpenChange(false);
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = signedUrl;
    link.download = "relatorio.pdf";
    link.click();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Seu relatório foi gerado com sucesso. Escolha como deseja acessá-lo.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
          <Button variant="outline" className="flex-1 min-h-[44px]" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Baixar
          </Button>
          <Button className="flex-1 min-h-[44px]" onClick={handleOpen}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Abrir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
