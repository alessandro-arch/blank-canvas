import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ReportAttachment {
  id: string;
  report_id: string;
  file_path: string;
  file_name: string;
  file_type: "pdf" | "png" | "jpeg";
  file_size_bytes: number;
  caption: string;
  sha256_hash: string | null;
  uploaded_by: string;
  uploaded_at: string;
}

const MAX_FILES = 5;
const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpeg",
};

async function computeSha256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function useReportAttachments(reportId: string | null, isEditable: boolean) {
  const { user } = useAuth();
  const [attachments, setAttachments] = useState<ReportAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchAttachments = useCallback(async () => {
    if (!reportId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("report_attachments")
        .select("*")
        .eq("report_id", reportId)
        .order("uploaded_at", { ascending: true });
      if (error) throw error;
      setAttachments((data as unknown as ReportAttachment[]) || []);
    } catch (err) {
      console.error("[Attachments] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  const uploadAttachment = useCallback(
    async (file: File, caption: string) => {
      if (!reportId || !user) return;

      // Validations
      if (!ALLOWED_TYPES[file.type]) {
        toast.error("Formato não permitido. Use PDF, PNG ou JPEG.");
        return;
      }
      if (file.size > MAX_SIZE) {
        toast.error("Arquivo muito grande. Máximo 2 MB.");
        return;
      }
      if (attachments.length >= MAX_FILES) {
        toast.error("Máximo de 5 anexos por relatório.");
        return;
      }
      if (!caption.trim()) {
        toast.error("Legenda é obrigatória.");
        return;
      }
      if (caption.length > 400) {
        toast.error("Legenda deve ter no máximo 400 caracteres.");
        return;
      }

      setUploading(true);
      try {
        const sha256 = await computeSha256(file);
        const fileType = ALLOWED_TYPES[file.type];
        const ext = fileType === "jpeg" ? "jpg" : fileType;
        const filePath = `${user.id}/${reportId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

        const { error: uploadErr } = await supabase.storage
          .from("report-attachments")
          .upload(filePath, file, { contentType: file.type, upsert: false });
        if (uploadErr) throw uploadErr;

        const { error: insertErr } = await supabase
          .from("report_attachments")
          .insert({
            report_id: reportId,
            file_path: filePath,
            file_name: file.name,
            file_type: fileType,
            file_size_bytes: file.size,
            caption: caption.trim(),
            sha256_hash: sha256,
            uploaded_by: user.id,
          });
        if (insertErr) throw insertErr;

        toast.success("Anexo adicionado com sucesso.");
        await fetchAttachments();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erro ao enviar anexo";
        toast.error(msg);
      } finally {
        setUploading(false);
      }
    },
    [reportId, user, attachments.length, fetchAttachments]
  );

  const removeAttachment = useCallback(
    async (attachmentId: string, filePath: string) => {
      if (!isEditable) return;
      try {
        await supabase.storage.from("report-attachments").remove([filePath]);
        const { error } = await supabase
          .from("report_attachments")
          .delete()
          .eq("id", attachmentId);
        if (error) throw error;
        toast.success("Anexo removido.");
        await fetchAttachments();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erro ao remover anexo";
        toast.error(msg);
      }
    },
    [isEditable, fetchAttachments]
  );

  const getSignedUrl = useCallback(async (filePath: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from("report-attachments")
      .createSignedUrl(filePath, 300);
    if (error) {
      toast.error("Erro ao gerar link de acesso");
      return null;
    }
    return data.signedUrl;
  }, []);

  return {
    attachments,
    loading,
    uploading,
    uploadAttachment,
    removeAttachment,
    getSignedUrl,
    canAddMore: attachments.length < MAX_FILES && isEditable,
  };
}
