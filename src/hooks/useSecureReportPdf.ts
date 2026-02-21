import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SecureReportPdfResult {
  signedUrl?: string;
  legacy?: boolean;
  blob?: Blob;
}

export function useSecureReportPdf() {
  const [loading, setLoading] = useState(false);

  const fetchReportPdf = async (
    reportId: string,
    action: "view" | "download" = "view"
  ): Promise<string | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("secure-report-pdf", {
        body: { report_id: reportId, action },
      });

      if (error) {
        console.error("[secure-report-pdf] Error:", error);
        // Fallback: check if data has signedUrl (legacy)
        if (data?.signedUrl) return data.signedUrl;
        return null;
      }

      // If response is a legacy signed URL
      if (data?.signedUrl) {
        return data.signedUrl;
      }

      // If response is binary PDF (decrypted), create blob URL
      if (data instanceof Blob) {
        return URL.createObjectURL(data);
      }

      // If data is arraybuffer-like
      if (data instanceof ArrayBuffer) {
        const blob = new Blob([data], { type: "application/pdf" });
        return URL.createObjectURL(blob);
      }

      return null;
    } catch (err) {
      console.error("[secure-report-pdf] Unexpected error:", err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { fetchReportPdf, loading };
}
