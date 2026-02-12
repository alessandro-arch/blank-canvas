import { useState, useRef } from "react";
import { 
  FileUp, 
  Upload, 
  X, 
  FileText, 
  Loader2,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ReportUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referenceMonth: string;
  referenceMonthFormatted: string;
  installmentNumber: number;
  enrollmentId: string;
  existingReportId?: string;
  isResubmit?: boolean;
  onSuccess: () => void;
}

export function ReportUploadDialog({
  open,
  onOpenChange,
  referenceMonth,
  referenceMonthFormatted,
  installmentNumber,
  enrollmentId,
  existingReportId,
  isResubmit = false,
  onSuccess,
}: ReportUploadDialogProps) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [observations, setObservations] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      if (selectedFile.type !== "application/pdf") {
        toast.error("Apenas arquivos PDF são permitidos");
        return;
      }
      // Validate file size (max 10MB)
      // Validate file size (max 5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast.error("O arquivo deve ter no máximo 5MB");
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      if (droppedFile.type !== "application/pdf") {
        toast.error("Apenas arquivos PDF são permitidos");
        return;
      }
      if (droppedFile.size > 5 * 1024 * 1024) {
        toast.error("O arquivo deve ter no máximo 5MB");
        return;
      }
      setFile(droppedFile);
    }
  };

  const handleSubmit = async () => {
    if (!file || !user) {
      toast.error("Selecione um arquivo PDF para enviar");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // 1. Count existing versions for this month
      const { data: existingReports, error: countError } = await supabase
        .from("reports")
        .select("id")
        .eq("user_id", user.id)
        .eq("reference_month", referenceMonth);

      if (countError) throw countError;

      const versionNumber = (existingReports?.length || 0) + 1;

      // 2. Generate unique filename with proper path structure
      // Path format: {user_id}/{reference_month}/v{version}.pdf
      const fileName = `${user.id}/${referenceMonth}/v${versionNumber}.pdf`;

      setUploadProgress(30);

      // 3. Upload file to storage (private bucket)
      const { error: uploadError } = await supabase.storage
        .from("reports")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      setUploadProgress(60);

      // 4. Store the path (not public URL) - we'll use signed URLs for access
      const filePath = fileName;

      setUploadProgress(80);

      // 5. Create report record with file path
      const { error: insertError } = await supabase
        .from("reports")
        .insert({
          user_id: user.id,
          reference_month: referenceMonth,
          installment_number: installmentNumber,
          file_url: filePath, // Store path, not public URL
          file_name: file.name,
          observations: observations || null,
          status: "under_review",
        });

      if (insertError) throw insertError;

      setUploadProgress(100);

      toast.success(
        isResubmit 
          ? "Relatório reenviado com sucesso!" 
          : "Relatório enviado com sucesso!"
      );

      // Reset form and close dialog
      setFile(null);
      setObservations("");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error uploading report:", error);
      toast.error(error.message || "Erro ao enviar relatório. Tente novamente.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setFile(null);
      setObservations("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="w-5 h-5 text-primary" />
            {isResubmit ? "Reenviar Relatório" : "Enviar Relatório"}
          </DialogTitle>
          <DialogDescription>
            {isResubmit 
              ? `Envie uma nova versão do relatório de ${referenceMonthFormatted}`
              : `Envie o relatório mensal referente a ${referenceMonthFormatted}`
            }
          </DialogDescription>
        </DialogHeader>

        {isResubmit && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
            <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-warning">Relatório devolvido para correção</p>
              <p className="text-muted-foreground mt-1">
                O relatório anterior foi devolvido. Envie uma nova versão corrigida.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4 mt-2">
          {/* File Upload Area */}
          <div>
            <Label htmlFor="report-file" className="text-sm font-medium">
              Arquivo do Relatório <span className="text-destructive">*</span>
            </Label>
            
            {!file ? (
              <div
                className="mt-2 border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">
                  Clique para selecionar ou arraste o arquivo
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Apenas PDF • Máximo 5MB
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="report-file"
                />
              </div>
            ) : (
              <div className="mt-2 flex items-center gap-3 p-3 rounded-lg bg-success/10 border border-success/20">
                <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-success" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRemoveFile}
                  disabled={uploading}
                  className="flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Observations */}
          <div>
            <Label htmlFor="observations" className="text-sm font-medium">
              Observações (opcional)
            </Label>
            <Textarea
              id="observations"
              placeholder="Adicione comentários ou observações sobre o relatório..."
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              disabled={uploading}
              className="mt-2 resize-none"
              rows={3}
            />
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Enviando...</span>
                <span className="font-medium">{uploadProgress}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={uploading}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!file || uploading}
            className="gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                {isResubmit ? "Reenviar Relatório" : "Enviar Relatório"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
