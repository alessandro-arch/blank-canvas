import { DollarSign, TrendingUp, FileText, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface ScholarStatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  color: "primary" | "success" | "info" | "warning";
}

const colorClasses = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  info: "bg-info/10 text-info",
  warning: "bg-warning/10 text-warning",
};

export function ScholarStatCard({ title, value, subtitle, icon: Icon, color }: ScholarStatCardProps) {
  return (
    <div className="card-stat">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", colorClasses[color])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

interface ScholarStatsProps {
  totalForecast: number;
  totalReceived: number;
  totalInstallments: number;
  paidInstallments: number;
  reportsSent: number;
  pendingReports: number;
  grantValue: number;
  loading?: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function ScholarStats({
  totalForecast = 0,
  totalReceived = 0,
  totalInstallments = 0,
  paidInstallments = 0,
  reportsSent = 0,
  pendingReports = 0,
  grantValue = 0,
  loading = false,
}: ScholarStatsProps) {
  // Safe defaults for all numeric values
  const safeTotalForecast = totalForecast ?? 0;
  const safeTotalReceived = totalReceived ?? 0;
  const safeTotalInstallments = totalInstallments ?? 0;
  const safePaidInstallments = paidInstallments ?? 0;
  const safeReportsSent = reportsSent ?? 0;
  const safePendingReports = pendingReports ?? 0;
  const safeGrantValue = grantValue ?? 0;

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card-stat animate-pulse">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="h-8 w-20 bg-muted rounded" />
                <div className="h-3 w-28 bg-muted rounded" />
              </div>
              <div className="w-10 h-10 rounded-lg bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const stats: ScholarStatCardProps[] = [
    {
      title: "Total Previsto",
      value: safeTotalForecast > 0 ? formatCurrency(safeTotalForecast) : "—",
      subtitle: safeTotalInstallments > 0 
        ? `${safeTotalInstallments} parcelas de ${formatCurrency(safeGrantValue)}`
        : "Sem parcelas definidas",
      icon: TrendingUp,
      color: "primary",
    },
    {
      title: "Total Recebido",
      value: safeTotalReceived > 0 ? formatCurrency(safeTotalReceived) : "R$ 0",
      subtitle: `${safePaidInstallments} parcela${safePaidInstallments !== 1 ? 's' : ''} paga${safePaidInstallments !== 1 ? 's' : ''}`,
      icon: DollarSign,
      color: "success",
    },
    {
      title: "Relatórios Enviados",
      value: String(safeReportsSent),
      subtitle: safeTotalInstallments > 0 ? `de ${safeTotalInstallments} meses` : "Sem período definido",
      icon: FileText,
      color: "info",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      {stats.map((stat) => (
        <ScholarStatCard key={stat.title} {...stat} />
      ))}
    </div>
  );
}
