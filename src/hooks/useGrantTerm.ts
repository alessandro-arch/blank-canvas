import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface GrantTerm {
  id: string;
  userId: string;
  fileUrl: string;
  fileName: string;
  fileSize: number | null;
  signedAt: string;
  uploadedBy: string;
  uploadedAt: string;
}

interface UseGrantTermReturn {
  grantTerm: GrantTerm | null;
  loading: boolean;
  error: string | null;
  signedUrl: string | null;
  refresh: () => Promise<void>;
}

export function useGrantTerm(userId: string | undefined): UseGrantTermReturn {
  const [grantTerm, setGrantTerm] = useState<GrantTerm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  const fetchGrantTerm = useCallback(async () => {
    if (!userId) {
      setGrantTerm(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("grant_terms")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        console.error("Error fetching grant term:", fetchError);
        setError("Erro ao carregar termo de outorga");
        return;
      }

      if (data) {
        setGrantTerm({
          id: data.id,
          userId: data.user_id,
          fileUrl: data.file_url,
          fileName: data.file_name,
          fileSize: data.file_size,
          signedAt: data.signed_at,
          uploadedBy: data.uploaded_by,
          uploadedAt: data.uploaded_at,
        });

        // Get signed URL for download
        const { data: signedData } = await supabase.storage
          .from("grant-terms")
          .createSignedUrl(data.file_url, 900); // 15 minutes

        if (signedData) {
          setSignedUrl(signedData.signedUrl);
        }
      } else {
        setGrantTerm(null);
        setSignedUrl(null);
      }
    } catch (err) {
      console.error("Error fetching grant term:", err);
      setError("Erro ao carregar termo de outorga");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchGrantTerm();
  }, [fetchGrantTerm]);

  return {
    grantTerm,
    loading,
    error,
    signedUrl,
    refresh: fetchGrantTerm,
  };
}
