import { AlertTriangle, FileText } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface PendingResubmission {
  id: string;
  reference_month: string;
  feedback: string | null;
}

interface ResubmitAlertBannerProps {
  pendingResubmissions: PendingResubmission[];
}

function formatMonth(refMonth: string): string {
  try {
    const [year, month] = refMonth.split("-").map(Number);
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  } catch {
    return refMonth;
  }
}

export function ResubmitAlertBanner({ pendingResubmissions }: ResubmitAlertBannerProps) {
  if (pendingResubmissions.length === 0) return null;

  return (
    <Alert variant="destructive" className="border-warning bg-warning/5 text-foreground">
      <AlertTriangle className="h-4 w-4 !text-warning" />
      <AlertTitle className="text-warning font-semibold">
        Reenvio solicitado pelo gestor
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-2">
        <p className="text-sm text-muted-foreground">
          O gestor solicitou que você reenvie {pendingResubmissions.length === 1 ? "o relatório abaixo" : "os relatórios abaixo"} utilizando o formulário digital.
        </p>
        {pendingResubmissions.map((r) => (
          <div
            key={r.id}
            className="flex items-start gap-2 p-2 rounded-md bg-background border border-border"
          >
            <FileText className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium capitalize">{formatMonth(r.reference_month)}</p>
              {r.feedback && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  Parecer: {r.feedback}
                </p>
              )}
            </div>
          </div>
        ))}
        <p className="text-xs text-muted-foreground pt-1">
          Preencha o formulário abaixo e envie para substituir o relatório antigo.
        </p>
      </AlertDescription>
    </Alert>
  );
}
