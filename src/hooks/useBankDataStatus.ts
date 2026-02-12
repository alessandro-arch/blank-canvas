import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type BankDataStatus = "not_filled" | "pending" | "under_review" | "validated" | "returned" | "rejected";

interface BankData {
  bankName: string;
  agency: string;
  account: string;
  accountType: string;
  pixKey: string;
}

interface UseBankDataStatusReturn {
  status: BankDataStatus;
  bankData: BankData | null;
  loading: boolean;
  lockedForEdit: boolean;
  notesGestor: string | null;
  refetch: () => Promise<void>;
}

export function useBankDataStatus(): UseBankDataStatusReturn {
  const { user } = useAuth();
  const [status, setStatus] = useState<BankDataStatus>("not_filled");
  const [bankData, setBankData] = useState<BankData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lockedForEdit, setLockedForEdit] = useState(false);
  const [notesGestor, setNotesGestor] = useState<string | null>(null);

  const fetchBankData = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching bank data:", error);
        setStatus("not_filled");
        setBankData(null);
        setLockedForEdit(false);
        setNotesGestor(null);
      } else if (!data) {
        // No bank data found
        setStatus("not_filled");
        setBankData(null);
        setLockedForEdit(false);
        setNotesGestor(null);
      } else {
        // Bank data exists - use the validation_status from DB
        setBankData({
          bankName: data.bank_name,
          agency: data.agency,
          account: data.account_number,
          accountType: data.account_type || "",
          pixKey: data.pix_key_masked || "",
        });
        
        // Map database status to our status type
        const dbStatus = (data as any).validation_status as string | undefined;
        if (dbStatus === 'pending') {
          setStatus("pending");
        } else if (dbStatus === 'under_review') {
          setStatus("under_review");
        } else if (dbStatus === 'validated') {
          setStatus("validated");
        } else if (dbStatus === 'returned') {
          setStatus("returned");
        } else {
          // Default to pending for backwards compatibility
          setStatus("pending");
        }
        
        setLockedForEdit((data as any).locked_for_edit ?? false);
        setNotesGestor((data as any).notes_gestor ?? null);
      }
    } catch (err) {
      console.error("Error in fetchBankData:", err);
      setStatus("not_filled");
      setBankData(null);
      setLockedForEdit(false);
      setNotesGestor(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBankData();
  }, [user?.id]);

  return {
    status,
    bankData,
    loading,
    lockedForEdit,
    notesGestor,
    refetch: fetchBankData,
  };
}
