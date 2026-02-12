import { DollarSign, GraduationCap, Calendar, FileCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getModalityLabel } from "@/lib/modality-labels";
import type { Database } from "@/integrations/supabase/types";

type Enrollment = Database["public"]["Tables"]["enrollments"]["Row"];
type Project = Database["public"]["Tables"]["projects"]["Row"];

interface ScholarSummaryCardsProps {
  enrollment: (Enrollment & { project: Project | null }) | null;
  stats: {
    totalInstallments: number;
    paidInstallments: number;
    reportsSent: number;
    pendingReports: number;
  } | null;
  approvedReportsCount: number;
  loading: boolean;
}

interface ScholarSummaryCard {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  iconBgClass: string;
}

export function ScholarSummaryCards({ enrollment, stats, approvedReportsCount, loading }: ScholarSummaryCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card-stat flex items-start gap-4">
            <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // No active enrollment - show empty state cards
  if (!enrollment || !stats) {
    const emptyCards: ScholarSummaryCard[] = [
      {
        title: "Valor Mensal",
        value: "—",
        subtitle: "Aguardando vínculo",
        icon: <DollarSign className="w-5 h-5" />,
        iconBgClass: "bg-muted text-muted-foreground",
      },
      {
        title: "Tipo de Bolsa",
        value: "—",
        subtitle: "Aguardando vínculo",
        icon: <GraduationCap className="w-5 h-5" />,
        iconBgClass: "bg-muted text-muted-foreground",
      },
      {
        title: "Total de Parcelas",
        value: "—",
        subtitle: "Aguardando vínculo",
        icon: <Calendar className="w-5 h-5" />,
        iconBgClass: "bg-muted text-muted-foreground",
      },
      {
        title: "Documentos Aprovados",
        value: "—",
        subtitle: "Aguardando vínculo",
        icon: <FileCheck className="w-5 h-5" />,
        iconBgClass: "bg-muted text-muted-foreground",
      },
    ];

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {emptyCards.map((card, index) => (
          <div key={index} className="card-stat flex items-start gap-4 opacity-60">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${card.iconBgClass}`}>
              {card.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {card.title}
              </p>
              <p className="text-lg font-bold text-muted-foreground mt-0.5">
                {card.value}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {card.subtitle}
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Get modality from project (source of truth from manager), fallback to enrollment.modality
  const modalityFromProject = enrollment.project?.modalidade_bolsa;
  const modalityLabel = getModalityLabel(modalityFromProject || enrollment.modality);

  // Build cards with real data
  const summaryCards: ScholarSummaryCard[] = [
    {
      title: "Valor Mensal",
      value: formatCurrency(Number(enrollment.grant_value)),
      subtitle: "Bruto",
      icon: <DollarSign className="w-5 h-5" />,
      iconBgClass: "bg-success/10 text-success",
    },
    {
      title: "Tipo de Bolsa",
      value: modalityLabel.length > 25 ? modalityLabel.substring(0, 22) + "..." : modalityLabel,
      subtitle: enrollment.modality.toUpperCase(),
      icon: <GraduationCap className="w-5 h-5" />,
      iconBgClass: "bg-primary/10 text-primary",
    },
    {
      title: "Total de Parcelas",
      value: String(stats.totalInstallments),
      subtitle: `${stats.paidInstallments} pagas • ${stats.totalInstallments - stats.paidInstallments} pendentes`,
      icon: <Calendar className="w-5 h-5" />,
      iconBgClass: "bg-info/10 text-info",
    },
    {
      title: "Documentos Aprovados",
      value: String(approvedReportsCount),
      subtitle: `de ${stats.totalInstallments} relatórios`,
      icon: <FileCheck className="w-5 h-5" />,
      iconBgClass: "bg-warning/10 text-warning",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {summaryCards.map((card, index) => (
        <div
          key={index}
          className="card-stat flex items-start gap-4"
        >
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${card.iconBgClass}`}>
            {card.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {card.title}
            </p>
            <p className="text-lg font-bold text-foreground mt-0.5 truncate" title={card.value}>
              {card.value}
            </p>
            {card.subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {card.subtitle}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
