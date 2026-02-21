import { useState } from "react";
import { useMonthlyReport } from "@/hooks/useMonthlyReport";
import { MonthlyReportForm } from "./MonthlyReportForm";
import { SubmitReportDialog } from "./SubmitReportDialog";
import { Clock } from "lucide-react";

interface Props {
  projectId: string | null;
}

export function MonthlyReportSection({ projectId }: Props) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  const {
    report, payload, loading, saving, submitting, lastSavedAt,
    isDraft, isReadOnly, pdfUrl, saveDraft, submitReport, reopenReport, updatePayload,
  } = useMonthlyReport({ projectId, year, month });

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
