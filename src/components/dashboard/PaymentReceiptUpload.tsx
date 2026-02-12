import { useState, useRef } from "react";
import { Upload, FileUp, X, Loader2, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PaymentReceiptUploadProps {
  paymentId: string;
  userId: string;
  referenceMonth: string;
  onUploadComplete: (receiptUrl: string) => void;
  className?: string;
}

export function PaymentReceiptUpload({
  paymentId,
  userId,
  referenceMonth,
  onUploadComplete,
  className,
}: PaymentReceiptUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error("Formato não suportado. Use PDF, PNG ou JPG.");
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      toast.error("O arquivo deve ter no máximo 5MB.");
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      // Generate file path: {user_id}/{reference_month}_{payment_id}.{ext}
      const fileExt = file.name.split(".").pop();
      const fileName = `${referenceMonth}_${paymentId}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      // Upload file
      const { data, error } = await supabase.storage
        .from("payment-receipts")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (error) {
        console.error("Upload error:", error);
        toast.error("Erro ao fazer upload do comprovante.");
        return;
      }

      // Success
      onUploadComplete(data.path);
      toast.success("Comprovante anexado com sucesso!");
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Erro ao fazer upload do comprovante.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemove = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <Label className="text-sm font-medium">
        Comprovante de Pagamento <span className="text-muted-foreground font-normal">(opcional)</span>
      </Label>

      {!file ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
        >
          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            Clique para anexar comprovante
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            PDF, PNG ou JPG (máx. 5MB)
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <File className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>
          {!uploading && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="flex-shrink-0"
              onClick={handleRemove}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        onChange={handleFileSelect}
        className="hidden"
      />

      {file && !uploading && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={handleUpload}
        >
          <FileUp className="w-4 h-4" />
          Enviar Comprovante
        </Button>
      )}

      {uploading && (
        <div className="flex items-center justify-center gap-2 p-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Enviando...</span>
        </div>
      )}
    </div>
  );
}
