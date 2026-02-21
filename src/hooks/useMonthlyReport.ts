import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export interface MonthlyReportPayload {
  atividades_realizadas: string;
  resultados_alcancados: string;
  dificuldades_encontradas: string;
  proximos_passos: string;
  horas_dedicadas: number | null;
  entregas: string[];
  observacoes: string;
}

export const EMPTY_PAYLOAD: MonthlyReportPayload = {
  atividades_realizadas: "",
  resultados_alcancados: "",
  dificuldades_encontradas: "",
  proximos_passos: "",
  horas_dedicadas: null,
  entregas: [],
  observacoes: "",
};

export type MonthlyReportStatus = "draft" | "submitted" | "under_review" | "approved" | "returned" | "cancelled";

export interface MonthlyReport {
  id: string;
  organization_id: string;
  project_id: string;
  beneficiary_user_id: string;
  period_year: number;
  period_month: number;
  status: MonthlyReportStatus;
  submitted_at: string | null;
  locked_at: string | null;
  approved_at: string | null;
  approved_by_user_id: string | null;
  returned_at: string | null;
  returned_by_user_id: string | null;
  return_reason: string | null;
  created_at: string;
  updated_at: string;
}

interface UseMonthlyReportParams {
  projectId: string | null;
  year: number;
  month: number;
}

export function useMonthlyReport({ projectId, year, month }: UseMonthlyReportParams) {
  const { user } = useAuth();
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [payload, setPayload] = useState<MonthlyReportPayload>(EMPTY_PAYLOAD);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const payloadRef = useRef(payload);
  const reportRef = useRef(report);

  useEffect(() => { payloadRef.current = payload; }, [payload]);
  useEffect(() => { reportRef.current = report; }, [report]);

  // Fetch or create draft
  const fetchOrCreateDraft = useCallback(async () => {
    if (!projectId || !user) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("create_monthly_report_draft", {
        p_project_id: projectId,
        p_year: year,
        p_month: month,
      });
      if (error) throw error;

      const result = data as { report_id: string; status: string };
      const reportId = result.report_id;

      const { data: reportData, error: reportError } = await supabase
        .from("monthly_reports")
        .select("*")
        .eq("id", reportId)
        .single();
      if (reportError) throw reportError;
      setReport(reportData as unknown as MonthlyReport);

      const { data: fieldsData } = await supabase
        .from("monthly_report_fields")
        .select("payload")
        .eq("report_id", reportId)
        .single();

      if (fieldsData?.payload && typeof fieldsData.payload === "object") {
        const p = fieldsData.payload as Record<string, unknown>;
        setPayload({
          atividades_realizadas: (p.atividades_realizadas as string) || "",
          resultados_alcancados: (p.resultados_alcancados as string) || "",
          dificuldades_encontradas: (p.dificuldades_encontradas as string) || "",
          proximos_passos: (p.proximos_passos as string) || "",
          horas_dedicadas: typeof p.horas_dedicadas === "number" ? p.horas_dedicadas : null,
          entregas: Array.isArray(p.entregas) ? (p.entregas as string[]) : [],
          observacoes: (p.observacoes as string) || "",
        });
      } else {
        setPayload(EMPTY_PAYLOAD);
      }

      // Load PDF URL if exists (via secure-report-pdf Edge Function)
      if ((reportData as any).status !== "draft") {
        try {
          const { data: pdfData } = await supabase.functions.invoke("secure-report-pdf", {
            body: { report_id: reportId, action: "view" },
          });
          if (pdfData?.signedUrl) {
            setPdfUrl(pdfData.signedUrl);
          } else if (pdfData instanceof Blob) {
            setPdfUrl(URL.createObjectURL(pdfData));
          } else {
            setPdfUrl(null);
          }
        } catch {
          setPdfUrl(null);
        }
      } else {
        setPdfUrl(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao carregar relatório";
      console.error("[MonthlyReport] fetchOrCreateDraft error:", msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [projectId, user, year, month]);

  useEffect(() => { fetchOrCreateDraft(); }, [fetchOrCreateDraft]);

  // Save draft
  const saveDraft = useCallback(async (silent = false) => {
    const currentReport = reportRef.current;
    if (!currentReport || !["draft", "returned"].includes(currentReport.status)) return;
    setSaving(true);
    try {
      const { error } = await supabase.rpc("save_monthly_report_draft", {
        p_report_id: currentReport.id,
        p_payload: payloadRef.current as unknown as Json,
      });
      if (error) throw error;
      setLastSavedAt(new Date());
      if (!silent) toast.success("Rascunho salvo com sucesso");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar rascunho";
      if (!silent) toast.error(msg);
    } finally {
      setSaving(false);
    }
  }, []);

  // Autosave every 15s when draft
  useEffect(() => {
    if (!report || !["draft", "returned"].includes(report.status)) return;
    autosaveTimerRef.current = setInterval(() => {
      saveDraft(true);
    }, 15000);
    return () => { if (autosaveTimerRef.current) clearInterval(autosaveTimerRef.current); };
  }, [report?.id, report?.status, saveDraft]);

  // Submit report
  const submitReport = useCallback(async () => {
    const currentReport = reportRef.current;
    if (!currentReport) return;

    // Save draft first
    await saveDraft(true);

    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("submit_monthly_report", {
        p_report_id: currentReport.id,
      });
      if (error) throw error;

      toast.success("Relatório enviado com sucesso!");

      // Trigger PDF generation
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (token) {
        try {
          await fetch(`${supabaseUrl}/functions/v1/generate-monthly-report-pdf`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({ report_id: currentReport.id }),
          });
        } catch (pdfErr) {
          console.warn("[MonthlyReport] PDF generation trigger failed:", pdfErr);
        }
      }

      // Link pending legacy reports (reenvio_solicitado) to this new digital report
      try {
        const refMonth = `${currentReport.period_year}-${String(currentReport.period_month).padStart(2, "0")}`;
        const { data: legacyReports } = await supabase
          .from("reports")
          .select("id")
          .eq("user_id", user!.id)
          .eq("reenvio_solicitado", true)
          .is("monthly_report_id", null)
          .eq("reference_month", refMonth);

        if (legacyReports && legacyReports.length > 0) {
          const ids = legacyReports.map(r => r.id);
          await supabase
            .from("reports")
            .update({
              monthly_report_id: currentReport.id,
              status: "replaced_by_digital",
            })
            .in("id", ids);
          console.log(`[MonthlyReport] Linked ${ids.length} legacy report(s) to digital report ${currentReport.id}`);
        }
      } catch (linkErr) {
        console.warn("[MonthlyReport] Failed to link legacy reports:", linkErr);
      }

      // Refresh to get updated state
      await fetchOrCreateDraft();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao enviar relatório";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }, [saveDraft, fetchOrCreateDraft, user]);

  // Reopen report (after return)
  const reopenReport = useCallback(async () => {
    const currentReport = reportRef.current;
    if (!currentReport || currentReport.status !== "returned") return;

    try {
      const { error } = await supabase.rpc("reopen_monthly_report", {
        p_report_id: currentReport.id,
      });
      if (error) throw error;
      toast.success("Relatório reaberto para correção");
      await fetchOrCreateDraft();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao reabrir relatório";
      toast.error(msg);
    }
  }, [fetchOrCreateDraft]);

  const updatePayload = useCallback((partial: Partial<MonthlyReportPayload>) => {
    setPayload(prev => ({ ...prev, ...partial }));
  }, []);

  const isDraft = report?.status === "draft" || report?.status === "returned";
  const isReadOnly = !isDraft;

  return {
    report,
    payload,
    loading,
    saving,
    submitting,
    lastSavedAt,
    isDraft,
    isReadOnly,
    pdfUrl,
    saveDraft,
    submitReport,
    reopenReport,
    updatePayload,
    refresh: fetchOrCreateDraft,
  };
}
