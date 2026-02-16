import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UseSignedUrlReturn {
  getSignedUrl: (filePath: string, expiresIn?: number) => Promise<string | null>;
  loading: boolean;
}

/**
 * Hook to generate signed URLs for private storage files.
 * Default expiration: 10 minutes (600 seconds)
 */
export function useSignedUrl(): UseSignedUrlReturn {
  const [loading, setLoading] = useState(false);

  const getSignedUrl = useCallback(async (filePath: string, expiresIn: number = 600): Promise<string | null> => {
    if (!filePath) {
      return null;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from("reports")
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        console.error("Error creating signed URL:", error);
        const isNotFound = (error as any)?.statusCode === "404" || error.message?.includes("not found");
        toast.error(isNotFound ? "Arquivo não encontrado no storage" : "Erro ao gerar link de acesso ao arquivo");
        return null;
      }

      return data?.signedUrl || null;
    } catch (err) {
      console.error("Error in getSignedUrl:", err);
      toast.error("Erro ao acessar o arquivo");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    getSignedUrl,
    loading,
  };
}

/**
 * Utility function to open a PDF in a new tab using signed URL
 */
export async function openReportPdf(filePath: string): Promise<void> {
  if (!filePath) {
    toast.error("Arquivo não encontrado");
    return;
  }

  // Open window synchronously to avoid popup blocker
  const newWindow = window.open("about:blank", "_blank");

  try {
    const { data, error } = await supabase.storage
      .from("reports")
      .createSignedUrl(filePath, 600); // 10 minutes

    if (error) {
      console.error("Error creating signed URL:", error);
      const isNotFound = (error as any)?.statusCode === "404" || error.message?.includes("not found");
      toast.error(isNotFound ? "Arquivo PDF não encontrado no storage" : "Erro ao gerar link de acesso ao arquivo");
      newWindow?.close();
      return;
    }

    if (data?.signedUrl) {
      if (newWindow) {
        newWindow.location.href = data.signedUrl;
      } else {
        // Don't navigate in same tab - inform user about popup blocker
        toast.error("Permita pop-ups no navegador para visualizar o arquivo");
      }
    } else {
      toast.error("Link de acesso não disponível");
      newWindow?.close();
    }
  } catch (err) {
    console.error("Error opening PDF:", err);
    toast.error("Erro ao abrir o arquivo");
    newWindow?.close();
  }
}

/**
 * Utility function to download a PDF using signed URL
 */
export async function downloadReportPdf(filePath: string, fileName?: string): Promise<void> {
  if (!filePath) {
    toast.error("Arquivo não encontrado");
    return;
  }

  try {
    const { data, error } = await supabase.storage
      .from("reports")
      .createSignedUrl(filePath, 600); // 10 minutes

    if (error) {
      console.error("Error creating signed URL:", error);
      const isNotFound = (error as any)?.statusCode === "404" || error.message?.includes("not found");
      toast.error(isNotFound ? "Arquivo PDF não encontrado no storage" : "Erro ao gerar link de download");
      return;
    }

    if (data?.signedUrl) {
      // Create a temporary link element to trigger download
      const link = document.createElement("a");
      link.href = data.signedUrl;
      link.download = fileName || "relatorio.pdf";
      // download attribute handles it, no need for target="_blank"
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      toast.error("Link de download não disponível");
    }
  } catch (err) {
    console.error("Error downloading PDF:", err);
    toast.error("Erro ao baixar o arquivo");
  }
}

/**
 * Utility function to download payment receipt using signed URL
 */
export async function downloadPaymentReceipt(filePath: string, fileName?: string): Promise<void> {
  if (!filePath) {
    toast.error("Comprovante não encontrado");
    return;
  }

  try {
    const { data, error } = await supabase.storage
      .from("payment-receipts")
      .createSignedUrl(filePath, 600); // 10 minutes

    if (error) {
      console.error("Error creating signed URL for receipt:", error);
      toast.error("Erro ao gerar link de download do comprovante");
      return;
    }

    if (data?.signedUrl) {
      // Create a temporary link element to trigger download
      const link = document.createElement("a");
      link.href = data.signedUrl;
      link.download = fileName || "comprovante.pdf";
      // download attribute handles it, no need for target="_blank"
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      toast.error("Link de download não disponível");
    }
  } catch (err) {
    console.error("Error downloading receipt:", err);
    toast.error("Erro ao baixar o comprovante");
  }
}
