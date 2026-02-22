import { useState, useRef } from "react";
import { Upload, X, Loader2, FileText, FileUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useAuditLog } from "@/hooks/useAuditLog";

interface UploadWorkPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  organizationId: string;
  scholarUserId: string;
  scholarName: string;
  existingPlan?: { id: string; fileName: string } | null;
  onSuccess: () => void;
}

async function computeSHA256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function sanitizeFileName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function UploadWorkPlanDialog({
  open,
  onOpenChange,
  projectId,
  organizationId,
  scholarUserId,
  scholarName,
  existingPlan,
  onSuccess,
}: UploadWorkPlanDialogProps) {
  const { user } = useAuth();
  const { logAction } = useAuditLog();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [objetivoGeral, setObjetivoGeral] = useState("");
  const [objetivosEspecificos, setObjetivosEspecificos] = useState("");
  const [atividades, setAtividades] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    if (selectedFile.type !== "application/pdf") {
      toast.error("Apenas arquivos PDF são permitidos");
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error("O arquivo deve ter no máximo 10MB");
      return;
    }
    setFile(selectedFile);
  };

  const handleRemoveFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpload = async () => {
    if (!file || !user) {
      toast.error("Selecione um arquivo PDF");
      return;
    }

    setUploading(true);
    try {
      // Compute checksum
      const checksum = await computeSHA256(file);

      // Generate path
      const fileId = crypto.randomUUID();
      const safeName = sanitizeFileName(file.name);
      const pdfPath = `org/${organizationId}/subproject/${projectId}/${fileId}_${safeName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("workplans")
        .upload(pdfPath, file, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        toast.error("Erro ao fazer upload do arquivo");
        return;
      }

      // Archive existing active plans
      const { error: archiveErr } = await supabase
        .from("work_plans")
        .update({ status: "archived" } as any)
        .eq("project_id", projectId)
        .eq("scholar_user_id", scholarUserId)
        .eq("status", "active");

      if (archiveErr) {
        console.error("Archive error:", archiveErr);
      }

      // Build extracted_json if any structured data was provided
      const hasStructuredData = objetivoGeral || objetivosEspecificos || atividades;
      const extractedJson = hasStructuredData
        ? {
            objetivo_geral: objetivoGeral || null,
            objetivos_especificos: objetivosEspecificos || null,
            atividades: atividades || null,
          }
        : null;

      // Insert new work plan
      const { error: insertErr } = await supabase.from("work_plans").insert({
        organization_id: organizationId,
        project_id: projectId,
        scholar_user_id: scholarUserId,
        uploaded_by: user.id,
        file_name: file.name,
        file_size: file.size,
        pdf_path: pdfPath,
        checksum_sha256: checksum,
        extracted_json: extractedJson,
        extracted_text: hasStructuredData
          ? [objetivoGeral, objetivosEspecificos, atividades].filter(Boolean).join("\n\n")
          : null,
        status: "active",
      } as any);

      if (insertErr) {
        console.error("Insert error:", insertErr);
        toast.error("Erro ao salvar registro do plano de trabalho");
        return;
      }

      await logAction({
        action: existingPlan ? "update_work_plan" : "upload_work_plan",
        entityType: "work_plan",
        entityId: projectId,
        details: { scholarName, fileName: file.name },
      });

      toast.success(
        existingPlan
          ? "Plano de trabalho substituído com sucesso!"
          : "Plano de trabalho enviado com sucesso!"
      );

      // Reset
      setFile(null);
      setObjetivoGeral("");
      setObjetivosEspecificos("");
      setAtividades("");
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Erro ao processar upload");
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setFile(null);
      setObjetivoGeral("");
      setObjetivosEspecificos("");
      setAtividades("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            {existingPlan ? "Substituir Plano de Trabalho" : "Enviar Plano de Trabalho"}
          </DialogTitle>
          <DialogDescription>
            {existingPlan
              ? `Substituir o plano de trabalho de ${scholarName}`
              : `Anexar o plano de trabalho de ${scholarName}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File upload */}
          <div className="space-y-2">
            <Label>
              Arquivo PDF <span className="text-destructive">*</span>
            </Label>
            {!file ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
              >
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Clique para selecionar</p>
                <p className="text-xs text-muted-foreground mt-1">Apenas PDF (máx. 10MB)</p>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                {!uploading && (
                  <Button type="button" variant="ghost" size="icon" onClick={handleRemoveFile}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
            <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileSelect} className="hidden" />
          </div>

          {/* Structured data (optional) */}
          <div className="space-y-3 border-t pt-4">
            <p className="text-sm font-medium text-foreground">
              Dados estruturados <span className="text-muted-foreground font-normal">(opcional — usado pela IA)</span>
            </p>

            <div className="space-y-2">
              <Label htmlFor="wp-objetivo">Objetivo Geral</Label>
              <Textarea
                id="wp-objetivo"
                placeholder="Descreva o objetivo geral do plano..."
                value={objetivoGeral}
                onChange={(e) => setObjetivoGeral(e.target.value)}
                rows={2}
                disabled={uploading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wp-especificos">Objetivos Específicos</Label>
              <Textarea
                id="wp-especificos"
                placeholder="Liste os objetivos específicos..."
                value={objetivosEspecificos}
                onChange={(e) => setObjetivosEspecificos(e.target.value)}
                rows={3}
                disabled={uploading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wp-atividades">Atividades e Cronograma</Label>
              <Textarea
                id="wp-atividades"
                placeholder="Descreva as atividades previstas e o cronograma (meses 1-24)..."
                value={atividades}
                onChange={(e) => setAtividades(e.target.value)}
                rows={4}
                disabled={uploading}
              />
            </div>
          </div>

          {existingPlan && (
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
              <p className="text-sm text-warning">
                <strong>Atenção:</strong> O plano atual ({existingPlan.fileName}) será arquivado.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={uploading}>
            Cancelar
          </Button>
          <Button onClick={handleUpload} disabled={!file || uploading} className="gap-2">
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <FileUp className="w-4 h-4" />
                {existingPlan ? "Substituir" : "Enviar"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
