import { useState, useEffect } from "react";
import { useMonthlyReport } from "@/hooks/useMonthlyReport";
import { MonthlyReportForm } from "./MonthlyReportForm";
import { SubmitReportDialog } from "./SubmitReportDialog";
import { ResubmitAlertBanner } from "./ResubmitAlertBanner";
import { Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  projectId: string | null;
}

interface PendingResubmission {
  id: string;
  reference_month: string;
  feedback: string | null;
}

export function MonthlyReportSection({ projectId }: Props) {
  const { user } = useAuth();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [pendingResubmissions, setPendingResubmissions] = useState<PendingResubmission[]>([]);

  const {
    report, payload, loading, saving, submitting, lastSavedAt,
    isDraft, isReadOnly, pdfUrl, saveDraft, submitReport, reopenReport, updatePayload,
  } = useMonthlyReport({ projectId, year, month });

  // Fetch pending resubmissions from legacy reports table
  useEffect(() => {
    if (!user) return;
    const fetchPending = async () => {
      const { data } = await supabase
        .from("reports")
        .select("id, reference_month, feedback")
        .eq("user_id", user.id)
        .eq("reenvio_solicitado", true)
        .is("monthly_report_id", null);
      setPendingResubmissions((data as PendingResubmission[]) || []);
    };
    fetchPending();
  }, [user]);

  if (!projectId) {
    return (
      <div className="card-institutional">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center mb-3">
            <Clock className="w-6 h-6 text-warning" />
          </div>
          <p className="text-muted-foreground text-sm">
            O formulário de relatório mensal ficará disponível após a atribuição de um subprojeto.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ResubmitAlertBanner pendingResubmissions={pendingResubmissions} />

      <MonthlyReportForm
        payload={payload}
        status={report?.status || "draft"}
        loading={loading}
        saving={saving}
        lastSavedAt={lastSavedAt}
        isDraft={isDraft}
        isReadOnly={isReadOnly}
        submittedAt={report?.submitted_at || null}
        returnReason={report?.return_reason || null}
        periodYear={year}
        periodMonth={month}
        pdfUrl={pdfUrl}
        onUpdate={updatePayload}
        onSave={() => saveDraft(false)}
        onSubmit={() => setShowSubmitDialog(true)}
        onReopen={reopenReport}
      />

      <SubmitReportDialog
        open={showSubmitDialog}
        onOpenChange={setShowSubmitDialog}
        onConfirm={async () => {
          await submitReport();
          setShowSubmitDialog(false);
        }}
        submitting={submitting}
      />
    </>
  );
}
