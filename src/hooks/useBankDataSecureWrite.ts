import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BankWriteData {
  organization_id?: string;
  target_user_id?: string;
  bank_name: string;
  bank_code: string;
  agency: string;
  account_number: string;
  account_type?: string;
  pix_key?: string;
  pix_key_type?: string;
}

export function useBankDataSecureWrite() {
  const [loading, setLoading] = useState(false);

  const writeBankData = async (data: BankWriteData): Promise<{ success: boolean; action?: string }> => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("secure-bank-write", {
        body: data,
      });

      if (error) {
        console.error("[secure-bank-write] Error:", error);
        return { success: false };
      }

      return result as { success: boolean; action?: string };
    } catch (err) {
      console.error("[secure-bank-write] Unexpected error:", err);
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  return { writeBankData, loading };
}
