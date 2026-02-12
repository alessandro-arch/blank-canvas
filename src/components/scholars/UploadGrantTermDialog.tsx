import { useState, useRef } from "react";
import { Upload, FileUp, X, Loader2, FileText, Calendar } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuditLog } from "@/hooks/useAuditLog";

interface UploadGrantTermDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scholarUserId: string;
  scholarName: string;
  existingTerm?: {
    id: string;
    fileName: string;
  } | null;
  onSuccess: () => void;
}

export function UploadGrantTermDialog({
  open,
  onOpenChange,
  scholarUserId,
  scholarName,
  existingTerm,
  onSuccess,
}: UploadGrantTermDialogProps) {
  const { user } = useAuth();
  const { logAction } = useAuditLog();
  const [file, setFile] = useState<File | null>(null);
  const [signedAt, setSignedAt] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type (only PDF)
    if (selectedFile.type !== "application/pdf") {
      toast.error("Apenas arquivos PDF são permitidos");
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      toast.error("O arquivo deve ter no máximo 10MB");
      return;
    }

    setFile(selectedFile);
  };

  const handleRemoveFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async () => {
    if (!file || !user || !signedAt) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setUploading(true);

    try {
      // Generate file path: {scholar_user_id}/termo-outorga.pdf
      const fileExt = file.name.split(".").pop();
      const fileName = `termo-outorga.${fileExt}`;
      const filePath = `${scholarUserId}/${fileName}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from("grant-terms")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        toast.error("Erro ao fazer upload do arquivo");
        return;
      }

      // Upsert grant term record
      const termData = {
        user_id: scholarUserId,
        file_url: filePath,
        file_name: file.name,
        file_size: file.size,
        signed_at: signedAt,
        uploaded_by: user.id,
      };

      let dbError;

      if (existingTerm) {
        // Update existing
        const { error } = await supabase
          .from("grant_terms")
          .update(termData)
          .eq("id", existingTerm.id);
        dbError = error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("grant_terms")
          .insert(termData);
        dbError = error;
      }

      if (dbError) {
        console.error("Database error:", dbError);
        toast.error("Erro ao salvar registro do termo");
        return;
      }

      // Log audit
      await logAction({
        action: existingTerm ? "update_grant_term" : "upload_grant_term",
        entityType: "grant_term",
        entityId: scholarUserId,
        details: {
          scholarName,
          fileName: file.name,
          signedAt,
        },
      });

      toast.success(
        existingTerm
          ? "Termo de outorga atualizado com sucesso!"
          : "Termo de outorga enviado com sucesso!"
      );

      // Reset form
      setFile(null);
      setSignedAt("");
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
      setSignedAt("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            {existingTerm ? "Substituir Termo de Outorga" : "Enviar Termo de Outorga"}
          </DialogTitle>
          <DialogDescription>
            {existingTerm
              ? `Substituir o termo de outorga de ${scholarName}`
              : `Anexar o termo de outorga assinado de ${scholarName}`}
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
                <p className="text-sm font-medium text-foreground">
                  Clique para selecionar o arquivo
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Apenas PDF (máx. 10MB)
                </p>
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0"
                    onClick={handleRemoveFile}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Signed date */}
          <div className="space-y-2">
            <Label htmlFor="signedAt" className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              Data de Assinatura <span className="text-destructive">*</span>
            </Label>
            <Input
              id="signedAt"
              type="date"
              value={signedAt}
              onChange={(e) => setSignedAt(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              disabled={uploading}
            />
          </div>

          {existingTerm && (
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
              <p className="text-sm text-warning">
                <strong>Atenção:</strong> O arquivo atual ({existingTerm.fileName}) será substituído.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={uploading}>
            Cancelar
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!file || !signedAt || uploading}
            className="gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <FileUp className="w-4 h-4" />
                {existingTerm ? "Substituir" : "Enviar"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
