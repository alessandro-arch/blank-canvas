import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface MaskedBankData {
  bank_code: string;
  bank_name: string;
  agency: string;
  account_number: string;
  account_type: string | null;
  pix: string;
  pix_key_type: string | null;
}

export interface SecureBankResponse {
  mode: "full" | "masked";
  masked: MaskedBankData;
  // Full fields (only when mode === "full")
  bank_code?: string;
  bank_name?: string;
  agency?: string;
  account_number?: string;
  account_type?: string | null;
  pix?: string | null;
  pix_key_type?: string | null;
  pix_protected?: boolean;
}

export function useBankDataSecureRead() {
  const [loading, setLoading] = useState(false);

  const readBankData = async (
    organizationId: string,
    beneficiaryUserId: string
  ): Promise<SecureBankResponse | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("secure-bank-read", {
        body: {
          organization_id: organizationId,
          beneficiary_user_id: beneficiaryUserId,
        },
      });

      if (error) {
        console.error("[secure-bank-read] Error:", error);
        return null;
      }

      return data as SecureBankResponse;
    } catch (err) {
      console.error("[secure-bank-read] Unexpected error:", err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { readBankData, loading };
}
