import { Badge } from "@/components/ui/badge";
import type { MonthlyReportStatus } from "@/hooks/useMonthlyReport";

const statusConfig: Record<MonthlyReportStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  submitted: { label: "Enviado", variant: "default" },
  under_review: { label: "Em análise", variant: "outline" },
  approved: { label: "Aprovado", variant: "default" },
  returned: { label: "Devolvido", variant: "destructive" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

interface Props {
  status: MonthlyReportStatus;
}

export function MonthlyReportStatusBadge({ status }: Props) {
  const config = statusConfig[status] || statusConfig.draft;
  return (
    <Badge variant={config.variant} className={
      status === "approved" ? "bg-emerald-600 hover:bg-emerald-700 text-white" :
      status === "submitted" ? "bg-blue-600 hover:bg-blue-700 text-white" : ""
    }>
      {config.label}
    </Badge>
  );
}
