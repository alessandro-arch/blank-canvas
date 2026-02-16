import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { unformatCPF } from "@/lib/cpf-validator";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type BankAccount = Database["public"]["Tables"]["bank_accounts"]["Row"];

export interface PersonalData {
  name: string;
  cpf: string;
  email: string;
  phone: string;
  institution: string;
  academicLevel: string;
  lattesUrl: string;
}

export interface BankData {
  bankCode: string;
  bankName: string;
  agency: string;
  account: string;
  accountType: string;
  pixKey: string;
  pixKeyType: string;
}

interface UseScholarProfileReturn {
  personalData: PersonalData;
  bankData: BankData | null;
  loading: boolean;
  saving: boolean;
  lastUpdated: string | null;
  cpfLocked: boolean;
  error: string | null;
  savePersonalData: (data: Partial<PersonalData>) => Promise<{ success: boolean; error?: string }>;
  saveBankData: (data: Partial<BankData>) => Promise<{ success: boolean; error?: string }>;
  refresh: () => Promise<void>;
}

const emptyPersonalData: PersonalData = {
  name: "",
  cpf: "",
  email: "",
  phone: "",
  institution: "",
  academicLevel: "",
  lattesUrl: "",
};

export function useScholarProfile(): UseScholarProfileReturn {
  const { user } = useAuth();
  const [personalData, setPersonalData] = useState<PersonalData>(emptyPersonalData);
  const [bankData, setBankData] = useState<BankData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [cpfLocked, setCpfLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setPersonalData(emptyPersonalData);
      setBankData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch profile data (no longer contains cpf/phone)
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      // Fetch sensitive data (cpf/phone) from profiles_sensitive
      const { data: sensitiveData, error: sensitiveError } = await supabase
        .from("profiles_sensitive")
        .select("cpf, phone")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        setError("Erro ao carregar dados do perfil");
      } else if (profileData) {
        setPersonalData({
          name: profileData.full_name || "",
          cpf: sensitiveData?.cpf || "",
          email: profileData.email || user.email || "",
          phone: sensitiveData?.phone || "",
          institution: profileData.institution || "",
          academicLevel: profileData.academic_level || "",
          lattesUrl: profileData.lattes_url || "",
        });
        setLastUpdated(profileData.updated_at);
        setCpfLocked(!!sensitiveData?.cpf && sensitiveData.cpf.length > 0);
      } else {
        setPersonalData({
          ...emptyPersonalData,
          email: user.email || "",
        });
      }

      if (sensitiveError) {
        console.error("Error fetching sensitive data:", sensitiveError);
      }

      // Fetch bank account data
      const { data: bankAccountData, error: bankError } = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (bankError) {
        console.error("Error fetching bank account:", bankError);
      } else if (bankAccountData) {
        setBankData({
          bankCode: bankAccountData.bank_code || "",
          bankName: bankAccountData.bank_name || "",
          agency: bankAccountData.agency || "",
          account: bankAccountData.account_number || "",
          accountType: bankAccountData.account_type || "",
          pixKey: bankAccountData.pix_key_masked || "",
          pixKeyType: bankAccountData.pix_key_type || "",
        });
      } else {
        setBankData(null);
      }
    } catch (err) {
      console.error("Error fetching scholar profile:", err);
      setError("Erro ao carregar dados do perfil");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const savePersonalData = async (data: Partial<PersonalData>): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: "Usuário não autenticado" };
    }

    setSaving(true);
    setError(null);

    try {
      // If CPF is locked, don't allow updating it
      // Convert empty strings to null for optional fields to satisfy database constraints
      const normalizeValue = (value: string | undefined | null): string | null => {
        if (value === undefined || value === null || value.trim() === "") {
          return null;
        }
        return value;
      };

      const updateData: Record<string, string | null> = {
        full_name: normalizeValue(data.name ?? personalData.name),
        institution: normalizeValue(data.institution ?? personalData.institution),
        academic_level: normalizeValue(data.academicLevel ?? personalData.academicLevel),
        lattes_url: normalizeValue(data.lattesUrl ?? personalData.lattesUrl),
      };

      const { error: updateError } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("user_id", user.id);

      if (updateError) {
        console.error("Error updating profile:", updateError);
        return { success: false, error: "Erro ao salvar dados pessoais. Tente novamente." };
      }

      // Save PII (cpf/phone) to profiles_sensitive via RPC
      const hasCpfChange = !cpfLocked && data.cpf;
      const hasPhoneChange = data.phone !== undefined;

      if (hasCpfChange || hasPhoneChange) {
        const rpcParams: Record<string, string | undefined> = {};
        if (hasCpfChange && data.cpf) {
          rpcParams.p_cpf = unformatCPF(data.cpf);
        }
        if (hasPhoneChange) {
          rpcParams.p_phone = data.phone?.replace(/\D/g, "") || undefined;
        }

        const { error: sensitiveError } = await supabase.rpc("upsert_sensitive_profile", rpcParams);

        if (sensitiveError) {
          console.error("Error saving sensitive data:", sensitiveError);
          return { success: false, error: "Erro ao salvar dados sensíveis. Tente novamente." };
        }
      }

      // Update local state
      setPersonalData(prev => ({
        ...prev,
        ...data,
        cpf: cpfLocked ? prev.cpf : (data.cpf ?? prev.cpf),
      }));

      if (!cpfLocked && data.cpf) {
        setCpfLocked(true);
      }

      setLastUpdated(new Date().toISOString());
      return { success: true };
    } catch (err) {
      console.error("Error saving personal data:", err);
      return { success: false, error: "Erro inesperado ao salvar dados" };
    } finally {
      setSaving(false);
    }
  };

  const saveBankData = async (data: Partial<BankData>): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: "Usuário não autenticado" };
    }

    setSaving(true);
    setError(null);

    try {
      // Note: PIX key encryption is handled by database triggers using encrypt_pix_key()
      // We store the masked version for display purposes
      const pixKeyValue = data.pixKey || bankData?.pixKey || null;
      const bankRecord = {
        user_id: user.id,
        bank_code: data.bankCode || bankData?.bankCode || "",
        bank_name: data.bankName || bankData?.bankName || "",
        agency: data.agency || bankData?.agency || "",
        account_number: data.account || bankData?.account || "",
        account_type: data.accountType || bankData?.accountType || "checking",
        pix_key_type: data.pixKeyType || bankData?.pixKeyType || null,
      };

      // Check if bank account exists
      const { data: existing } = await supabase
        .from("bank_accounts")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      let upsertError;

      if (existing) {
        // Update existing - pix_key is handled by database trigger for encryption
        const updateData: Record<string, string | null> = {
          bank_code: bankRecord.bank_code,
          bank_name: bankRecord.bank_name,
          agency: bankRecord.agency,
          account_number: bankRecord.account_number,
          account_type: bankRecord.account_type,
          pix_key_type: bankRecord.pix_key_type,
        };
        
        // Only include PIX key fields if a new value is provided
        if (pixKeyValue && pixKeyValue.trim() !== "") {
          updateData.pix_key_masked = pixKeyValue; // Database trigger will encrypt and mask
        }
        
        const { error } = await supabase
          .from("bank_accounts")
          .update(updateData)
          .eq("user_id", user.id);
        upsertError = error;
      } else {
        // Insert new - database trigger will handle PIX key encryption
        const insertData = {
          ...bankRecord,
          pix_key_masked: pixKeyValue, // Database trigger will encrypt and mask
        };
        const { error } = await supabase
          .from("bank_accounts")
          .insert(insertData);
        upsertError = error;
      }

      if (upsertError) {
        console.error("Error saving bank data:", upsertError);
        return { success: false, error: "Erro ao salvar dados bancários. Tente novamente." };
      }

      // Update local state
      setBankData(prev => ({
        bankCode: data.bankCode ?? prev?.bankCode ?? "",
        bankName: data.bankName ?? prev?.bankName ?? "",
        agency: data.agency ?? prev?.agency ?? "",
        account: data.account ?? prev?.account ?? "",
        accountType: data.accountType ?? prev?.accountType ?? "",
        pixKey: data.pixKey ?? prev?.pixKey ?? "",
        pixKeyType: data.pixKeyType ?? prev?.pixKeyType ?? "",
      }));

      return { success: true };
    } catch (err) {
      console.error("Error saving bank data:", err);
      return { success: false, error: "Erro inesperado ao salvar dados bancários" };
    } finally {
      setSaving(false);
    }
  };

  return {
    personalData,
    bankData,
    loading,
    saving,
    lastUpdated,
    cpfLocked,
    error,
    savePersonalData,
    saveBankData,
    refresh: fetchProfile,
  };
}
