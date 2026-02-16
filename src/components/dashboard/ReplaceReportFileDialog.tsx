import { useState, useRef } from "react";
import {
  FileUp, Upload, X, FileText, Loader2, AlertCircle, CheckCircle, Eye,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAuditLog } from "@/hooks/useAuditLog";
import { toast } from "sonner";

interface ReplaceReportFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: {
    id: string;
    user_id: string;
    scholar_name: string;
    project_code: string;
    reference_month: string;
    file_url: string;
    file_name: string;
    status: string;
  };
  onViewPdf: (fileUrl: string) => void;
  onSuccess: () => void;
}

export function ReplaceReportFileDialog({
  open, onOpenChange, report, onViewPdf, onSuccess,
}: ReplaceReportFileDialogProps) {
  const { user } = useAuth();
  const { logAction } = useAuditLog();
  const [file, setFile] = useState<File | null>(null);
  const [reason, setReason] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isApproved = report.status === "approved";
  const reasonRequired = isApproved;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== "application/pdf") {
      toast.error("Apenas arquivos PDF são permitidos");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error("O arquivo deve ter no máximo 10MB");
      return;
    }
    setFile(f);
  };

  const handleRemoveFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    if (f.type !== "application/pdf") { toast.error("Apenas arquivos PDF são permitidos"); return; }
    if (f.size > 10 * 1024 * 1024) { toast.error("O arquivo deve ter no máximo 10MB"); return; }
    setFile(f);
  };

  const handleSubmit = async () => {
    if (!file || !user) { toast.error("Selecione um arquivo PDF"); return; }
    if (reasonRequired && !reason.trim()) {
      toast.error("Justificativa obrigatória para relatórios já aprovados");
      return;
    }

    setUploading(true);
    try {
      const oldFileUrl = report.file_url;
      const timestamp = Date.now();
      const newFileName = `${report.user_id}/${report.reference_month}/replaced_${timestamp}.pdf`;

      // Upload new file
      const { error: uploadError } = await supabase.storage
        .from("reports")
        .upload(newFileName, file, { cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;

      // Update report record
      const updatePayload: Record<string, any> = {
        file_url: newFileName,
        file_name: file.name,
        old_file_url: oldFileUrl,
        replaced_at: new Date().toISOString(),
        replaced_by: user.id,
        replace_reason: reason || null,
      };

      // If approved, revert to under_review
      if (isApproved) {
        updatePayload.status = "under_review";
        updatePayload.reviewed_at = null;
        updatePayload.reviewed_by = null;
        updatePayload.feedback = null;
      }

      const { error: updateError } = await supabase
        .from("reports")
        .update(updatePayload)
        .eq("id", report.id);
      if (updateError) throw updateError;

      // Audit log
      await logAction({
        action: "report_file_replaced",
        entityType: "report",
        entityId: report.id,
        details: {
          report_id: report.id,
          old_file_url: oldFileUrl,
          new_file_url: newFileName,
          month_ref: report.reference_month,
          reason: reason || null,
          was_approved: isApproved,
        } as any,
        previousValue: { file_url: oldFileUrl, status: report.status } as any,
        newValue: { file_url: newFileName, status: isApproved ? "under_review" : report.status } as any,
      });

      toast.success("Arquivo do relatório substituído com sucesso!");
      setFile(null);
      setReason("");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error replacing report file:", error);
      toast.error(error.message || "Erro ao substituir arquivo");
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setFile(null);
      setReason("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="w-5 h-5 text-primary" />
            Substituir Arquivo do Relatório
          </DialogTitle>
          <DialogDescription>
            Substitua o arquivo PDF do relatório de {report.scholar_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Report info */}
          <div className="p-3 bg-muted/50 rounded-lg space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bolsista</span>
              <span className="font-medium">{report.scholar_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Projeto</span>
              <span className="font-medium">{report.project_code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mês Referência</span>
              <span className="font-medium">{report.reference_month}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Arquivo Atual</span>
              <Button variant="link" size="sm" className="p-0 h-auto gap-1" onClick={() => onViewPdf(report.file_url)}>
                <Eye className="w-3 h-3" />
                {report.file_name}
              </Button>
            </div>
          </div>

          {isApproved && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
              <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-warning">Relatório já aprovado</p>
                <p className="text-muted-foreground mt-1">
                  A substituição do arquivo retornará o status para "Em Análise" para revalidação. Justificativa obrigatória.
                </p>
              </div>
            </div>
          )}

          {/* File upload */}
          <div>
            <Label className="text-sm font-medium">
              Novo Arquivo <span className="text-destructive">*</span>
            </Label>
            {!file ? (
              <div
                className="mt-2 border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium">Clique ou arraste o arquivo</p>
                <p className="text-xs text-muted-foreground mt-1">Apenas PDF • Máximo 10MB</p>
                <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" onChange={handleFileChange} className="hidden" />
              </div>
            ) : (
              <div className="mt-2 flex items-center gap-3 p-3 rounded-lg bg-success/10 border border-success/20">
                <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-success" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <Button variant="ghost" size="icon" onClick={handleRemoveFile} disabled={uploading}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Reason */}
          <div>
            <Label className="text-sm font-medium">
              Motivo da substituição {reasonRequired && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              placeholder="Informe o motivo da substituição do arquivo..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={uploading}
              className="mt-2 resize-none"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleClose} disabled={uploading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!file || uploading || (reasonRequired && !reason.trim())} className="gap-2">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {uploading ? "Enviando..." : "Salvar substituição"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
