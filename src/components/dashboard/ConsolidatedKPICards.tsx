import { useState } from "react";
import { 
  Users, FileText, Clock, CheckCircle, DollarSign, Ban, 
  TrendingUp, TrendingDown, ChevronDown, ChevronUp,
  Briefcase, GraduationCap, AlertCircle
} from "lucide-react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface KPIMetric {
  label: string;
  value: number;
  previousValue?: number;
  icon: LucideIcon;
  color: "primary" | "warning" | "info" | "success" | "destructive";
  trend?: string;
  format?: "number" | "currency" | "percentage";
  drilldown?: DrilldownItem[];
}

interface DrilldownItem {
  label: string;
  value: number;
  color?: string;
}

const colorClasses = {
  primary: "bg-primary/10 text-primary",
  warning: "bg-warning/10 text-warning",
  info: "bg-info/10 text-info",
  success: "bg-success/10 text-success",
  destructive: "bg-destructive/10 text-destructive",
};

const borderColors = {
  primary: "border-l-primary",
  warning: "border-l-warning",
  info: "border-l-info",
  success: "border-l-success",
  destructive: "border-l-destructive",
};

// Mock data - em produção viria de uma API
const consolidatedKPIs: KPIMetric[] = [
  { 
    label: "Bolsistas Ativos", 
    value: 198, 
    previousValue: 185,
    icon: Users, 
    color: "primary", 
    trend: "+7.0% vs mês anterior",
    drilldown: [
      { label: "Iniciação Científica", value: 82 },
      { label: "Extensão", value: 45 },
      { label: "Pesquisa", value: 38 },
      { label: "Monitoria", value: 33 },
    ]
  },
  { 
    label: "Projetos em Andamento", 
    value: 24, 
    previousValue: 22,
    icon: Briefcase, 
    color: "info",
    drilldown: [
      { label: "Tecnologia", value: 8 },
      { label: "Saúde", value: 6 },
      { label: "Educação", value: 5 },
      { label: "Meio Ambiente", value: 5 },
    ]
  },
  { 
    label: "Relatórios Pendentes", 
    value: 34, 
    previousValue: 28,
    icon: FileText, 
    color: "warning", 
    trend: "do mês atual",
    drilldown: [
      { label: "Atrasados (>7 dias)", value: 8, color: "destructive" },
      { label: "Próximos do prazo", value: 12, color: "warning" },
      { label: "Dentro do prazo", value: 14, color: "success" },
    ]
  },
  { 
    label: "Em Análise", 
    value: 18, 
    previousValue: 22,
    icon: Clock, 
    color: "info",
    drilldown: [
      { label: "Há mais de 5 dias", value: 5 },
      { label: "2-5 dias", value: 8 },
      { label: "Recebidos hoje", value: 5 },
    ]
  },
  { 
    label: "Aprovados no Mês", 
    value: 156, 
    previousValue: 142,
    icon: CheckCircle, 
    color: "success",
    trend: "+9.9% vs mês anterior"
  },
  { 
    label: "Pagamentos Liberáveis", 
    value: 142, 
    icon: DollarSign, 
    color: "success", 
    trend: "R$ 98.400,00",
    format: "currency"
  },
  { 
    label: "Pagamentos Bloqueados", 
    value: 12, 
    previousValue: 8,
    icon: Ban, 
    color: "destructive", 
    trend: "pendência documental",
    drilldown: [
      { label: "Documentação incompleta", value: 7 },
      { label: "Relatório rejeitado", value: 3 },
      { label: "Conta inválida", value: 2 },
    ]
  },
  { 
    label: "Taxa de Aprovação", 
    value: 91, 
    previousValue: 88,
    icon: GraduationCap, 
    color: "primary",
    format: "percentage",
    trend: "+3% vs mês anterior"
  },
];

function formatValue(value: number, format?: "number" | "currency" | "percentage"): string {
  if (format === "percentage") return `${value}%`;
  if (format === "currency") {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  }
  return value.toLocaleString("pt-BR");
}

function getTrendIndicator(current: number, previous?: number) {
  if (!previous) return null;
  const diff = ((current - previous) / previous) * 100;
  const isPositive = diff > 0;
  return { diff, isPositive };
}

interface KPICardProps {
  kpi: KPIMetric;
  isExpanded: boolean;
  onToggle: () => void;
}

function KPICard({ kpi, isExpanded, onToggle }: KPICardProps) {
  const trend = getTrendIndicator(kpi.value, kpi.previousValue);
  const hasDrilldown = kpi.drilldown && kpi.drilldown.length > 0;

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div className={cn(
        "card-stat border-l-4 transition-all duration-200",
        borderColors[kpi.color],
        hasDrilldown && "cursor-pointer",
        isExpanded && "ring-1 ring-primary/20"
      )}>
        <CollapsibleTrigger asChild disabled={!hasDrilldown}>
          <div className="w-full">
            <div className="flex items-start justify-between mb-2">
              <div className={cn("w-6 h-6 rounded flex items-center justify-center", colorClasses[kpi.color])}>
                <kpi.icon className="w-3 h-3" />
              </div>
              {hasDrilldown && (
                <div className="text-muted-foreground">
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              )}
            </div>
            
            <div className="flex items-end gap-2 mb-0.5">
              <p className="text-lg font-bold text-foreground">
                {formatValue(kpi.value, kpi.format)}
              </p>
              {trend && (
                <div className={cn(
                  "flex items-center gap-0.5 text-xs font-medium pb-1",
                  trend.isPositive ? "text-success" : "text-destructive"
                )}>
                  {trend.isPositive ? 
                    <TrendingUp className="w-3 h-3" /> : 
                    <TrendingDown className="w-3 h-3" />
                  }
                  <span>{Math.abs(trend.diff).toFixed(1)}%</span>
                </div>
              )}
            </div>
            
            <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
            {kpi.trend && (
              <p className="text-xs text-muted-foreground/70 mt-1">{kpi.trend}</p>
            )}
          </div>
        </CollapsibleTrigger>

        {hasDrilldown && (
          <CollapsibleContent>
            <div className="mt-4 pt-4 border-t border-border space-y-2">
              {kpi.drilldown!.map((item, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className={cn(
                    "font-medium",
                    item.color === "destructive" && "text-destructive",
                    item.color === "warning" && "text-warning",
                    item.color === "success" && "text-success",
                    !item.color && "text-foreground"
                  )}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  );
}

export function ConsolidatedKPICards() {
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());

  const toggleCard = (index: number) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedCards(newExpanded);
  };

  const expandAll = () => {
    const allIndexes = consolidatedKPIs
      .map((kpi, index) => kpi.drilldown ? index : -1)
      .filter(i => i !== -1);
    setExpandedCards(new Set(allIndexes));
  };

  const collapseAll = () => {
    setExpandedCards(new Set());
  };

  const hasExpandableCards = consolidatedKPIs.some(kpi => kpi.drilldown);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Indicadores Consolidados</h3>
          <p className="text-sm text-muted-foreground">Visão geral do sistema de bolsas</p>
        </div>
        {hasExpandableCards && (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={expandAll}>
              Expandir todos
            </Button>
            <Button variant="ghost" size="sm" onClick={collapseAll}>
              Recolher todos
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3">
        {consolidatedKPIs.map((kpi, index) => (
          <KPICard
            key={kpi.label}
            kpi={kpi}
            isExpanded={expandedCards.has(index)}
            onToggle={() => toggleCard(index)}
          />
        ))}
      </div>
    </div>
  );
}
