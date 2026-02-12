import { Card, CardContent } from "@/components/ui/card";
import { Send, MailOpen, AlertTriangle, CalendarDays, BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface MessageMetrics {
  total: number;
  unread: number;
  failed: number;
  sentThisMonth: number;
  readRate: number;
}

interface MessageMetricsCardsProps {
  metrics: MessageMetrics;
  loading: boolean;
  lastUpdated: Date | null;
}

export function MessageMetricsCards({ metrics, loading, lastUpdated }: MessageMetricsCardsProps) {
  const cards = [
    { label: "Total enviadas", value: metrics.total, icon: Send, color: "text-primary" },
    { label: "Não lidas", value: metrics.unread, icon: MailOpen, color: "text-amber-600" },
    { label: "Com erro", value: metrics.failed, icon: AlertTriangle, color: "text-destructive" },
    { label: "Enviadas no mês", value: metrics.sentThisMonth, icon: CalendarDays, color: "text-emerald-600" },
    { label: "Taxa de leitura", value: `${metrics.readRate}%`, icon: BarChart3, color: "text-blue-600" },
  ];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {cards.map((card) => (
          <Card key={card.label} className="border border-border/60">
            <CardContent className="p-4">
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-7 w-12" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 mb-1">
                    <card.icon className={`w-3.5 h-3.5 ${card.color}`} />
                    <span className="text-xs text-muted-foreground font-medium">{card.label}</span>
                  </div>
                  <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      {lastUpdated && (
        <p className="text-[11px] text-muted-foreground text-right">
          Última atualização: {lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </p>
      )}
    </div>
  );
}
