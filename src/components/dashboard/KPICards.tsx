import { Users, FileText, Clock, CheckCircle, DollarSign, Ban } from "lucide-react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPIData {
  label: string;
  value: number;
  icon: LucideIcon;
  color: "primary" | "warning" | "info" | "success" | "destructive";
  trend?: string;
}

const colorClasses = {
  primary: "bg-primary/10 text-primary",
  warning: "bg-warning/10 text-warning",
  info: "bg-info/10 text-info",
  success: "bg-success/10 text-success",
  destructive: "bg-destructive/10 text-destructive",
};

const kpis: KPIData[] = [
  { label: "Bolsistas Ativos", value: 198, icon: Users, color: "primary", trend: "+5 este mês" },
  { label: "Relatórios Pendentes", value: 34, icon: FileText, color: "warning", trend: "do mês atual" },
  { label: "Em Análise", value: 18, icon: Clock, color: "info" },
  { label: "Aprovados", value: 156, icon: CheckCircle, color: "success" },
  { label: "Pagamentos Liberáveis", value: 142, icon: DollarSign, color: "success", trend: "R$ 98.400" },
  { label: "Pagamentos Bloqueados", value: 12, icon: Ban, color: "destructive", trend: "documentação" },
];

export function KPICards() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="card-stat">
          <div className="flex items-center gap-2 mb-2">
            <div className={cn("w-6 h-6 rounded flex items-center justify-center", colorClasses[kpi.color])}>
              <kpi.icon className="w-3 h-3" />
            </div>
          </div>
          <p className="text-lg font-bold text-foreground">{kpi.value}</p>
          <p className="text-[10px] font-medium text-muted-foreground leading-tight">{kpi.label}</p>
          {kpi.trend && (
            <p className="text-[11px] text-muted-foreground/70 mt-0.5">{kpi.trend}</p>
          )}
        </div>
      ))}
    </div>
  );
}
