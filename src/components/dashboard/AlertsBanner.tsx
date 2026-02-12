import { AlertTriangle, Clock, Ban, TrendingDown, X, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Alert {
  id: string;
  type: "late_reports" | "blocked_payments" | "low_progress";
  title: string;
  description: string;
  count: number;
  severity: "warning" | "error" | "info";
}

const alertConfig = {
  late_reports: {
    icon: Clock,
    bgClass: "bg-warning/5 border-warning/20",
    iconBg: "bg-warning/10 text-warning",
    badgeClass: "bg-warning text-warning-foreground",
  },
  blocked_payments: {
    icon: Ban,
    bgClass: "bg-destructive/5 border-destructive/20",
    iconBg: "bg-destructive/10 text-destructive",
    badgeClass: "bg-destructive text-destructive-foreground",
  },
  low_progress: {
    icon: TrendingDown,
    bgClass: "bg-info/5 border-info/20",
    iconBg: "bg-info/10 text-info",
    badgeClass: "bg-info text-info-foreground",
  },
};

// Mock data - em produção viria de uma API
const mockAlerts: Alert[] = [
  {
    id: "1",
    type: "late_reports",
    title: "Relatórios atrasados",
    description: "bolsistas não enviaram o relatório do mês anterior",
    count: 8,
    severity: "warning",
  },
  {
    id: "2",
    type: "blocked_payments",
    title: "Pagamentos bloqueados há +30 dias",
    description: "bolsistas com pagamento bloqueado por documentação pendente",
    count: 3,
    severity: "error",
  },
  {
    id: "3",
    type: "low_progress",
    title: "Projetos com avanço baixo",
    description: "projetos com progresso abaixo de 50% do esperado",
    count: 5,
    severity: "info",
  },
];

interface AlertItemProps {
  alert: Alert;
  onDismiss: (id: string) => void;
}

function AlertItem({ alert, onDismiss }: AlertItemProps) {
  const config = alertConfig[alert.type];
  const Icon = config.icon;

  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg border transition-all hover:shadow-sm",
      config.bgClass
    )}>
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", config.iconBg)}>
        <Icon className="w-4 h-4" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            "inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 rounded-full text-xs font-bold",
            config.badgeClass
          )}>
            {alert.count}
          </span>
          <p className="text-sm font-medium text-foreground truncate">
            {alert.title}
          </p>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {alert.count} {alert.description}
        </p>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 px-2 text-xs gap-1"
        >
          Ver detalhes
          <ChevronRight className="w-3 h-3" />
        </Button>
        <button 
          onClick={() => onDismiss(alert.id)}
          className="p-1 rounded hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export function AlertsBanner() {
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
  const [collapsed, setCollapsed] = useState(false);

  const handleDismiss = (id: string) => {
    setAlerts(alerts.filter(alert => alert.id !== id));
  };

  if (alerts.length === 0) return null;

  const criticalCount = alerts.filter(a => a.severity === "error").length;
  const warningCount = alerts.filter(a => a.severity === "warning").length;

  return (
    <div className="mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-warning" />
          <h4 className="text-sm font-semibold text-foreground">Alertas que requerem atenção</h4>
          <div className="flex items-center gap-1.5 ml-2">
            {criticalCount > 0 && (
              <span className="inline-flex items-center justify-center h-5 px-1.5 rounded-full text-xs font-bold bg-destructive text-destructive-foreground">
                {criticalCount} crítico{criticalCount > 1 ? "s" : ""}
              </span>
            )}
            {warningCount > 0 && (
              <span className="inline-flex items-center justify-center h-5 px-1.5 rounded-full text-xs font-bold bg-warning text-warning-foreground">
                {warningCount} aviso{warningCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-xs h-7"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? "Expandir" : "Recolher"}
        </Button>
      </div>

      {/* Alerts Grid */}
      {!collapsed && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {alerts.map(alert => (
            <AlertItem 
              key={alert.id} 
              alert={alert} 
              onDismiss={handleDismiss} 
            />
          ))}
        </div>
      )}

      {/* Collapsed Summary */}
      {collapsed && (
        <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 border border-border">
          {alerts.map(alert => {
            const config = alertConfig[alert.type];
            const Icon = config.icon;
            return (
              <div key={alert.id} className="flex items-center gap-2">
                <span className={cn(
                  "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold",
                  config.badgeClass
                )}>
                  {alert.count}
                </span>
                <Icon className={cn("w-4 h-4", config.iconBg.split(" ")[1])} />
                <span className="text-xs text-muted-foreground">{alert.title}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
