import { useState } from "react";
import { 
  CheckSquare, Square, FileCheck, DollarSign, Mail, 
  AlertTriangle, Download, MoreHorizontal, Filter,
  ChevronDown, Users, Clock, Ban, CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface PendingItem {
  id: string;
  scholarName: string;
  project: string;
  type: "report" | "payment" | "document";
  status: "pending" | "overdue" | "urgent";
  daysWaiting: number;
  priority: "low" | "medium" | "high" | "critical";
  referenceMonth: string;
}

// Mock data
const pendingItems: PendingItem[] = [
  { id: "1", scholarName: "Ana Carolina Silva", project: "IA Aplicada à Saúde", type: "report", status: "pending", daysWaiting: 2, priority: "medium", referenceMonth: "Jan/2026" },
  { id: "2", scholarName: "Bruno Oliveira Santos", project: "Robótica Educacional", type: "report", status: "overdue", daysWaiting: 8, priority: "high", referenceMonth: "Jan/2026" },
  { id: "3", scholarName: "Carla Mendes Ferreira", project: "Sustentabilidade Urbana", type: "payment", status: "urgent", daysWaiting: 15, priority: "critical", referenceMonth: "Dez/2025" },
  { id: "4", scholarName: "Daniel Costa Lima", project: "IA Aplicada à Saúde", type: "document", status: "overdue", daysWaiting: 12, priority: "high", referenceMonth: "Jan/2026" },
  { id: "5", scholarName: "Elena Rodrigues Souza", project: "Direito Digital", type: "report", status: "pending", daysWaiting: 1, priority: "low", referenceMonth: "Jan/2026" },
  { id: "6", scholarName: "Fernando Alves Costa", project: "Robótica Educacional", type: "payment", status: "pending", daysWaiting: 3, priority: "medium", referenceMonth: "Jan/2026" },
];

const typeConfig = {
  report: { label: "Relatório", icon: FileCheck, className: "bg-info/10 text-info" },
  payment: { label: "Pagamento", icon: DollarSign, className: "bg-success/10 text-success" },
  document: { label: "Documento", icon: AlertTriangle, className: "bg-warning/10 text-warning" },
};

const priorityConfig = {
  low: { label: "Baixa", className: "bg-muted text-muted-foreground" },
  medium: { label: "Média", className: "bg-info/10 text-info" },
  high: { label: "Alta", className: "bg-warning/10 text-warning" },
  critical: { label: "Crítica", className: "bg-destructive/10 text-destructive" },
};

const statusConfig = {
  pending: { label: "Pendente", icon: Clock, className: "text-muted-foreground" },
  overdue: { label: "Atrasado", icon: AlertTriangle, className: "text-warning" },
  urgent: { label: "Urgente", icon: Ban, className: "text-destructive" },
};

export function BatchActionsPanel() {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("priority");

  const toggleItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const selectAll = () => {
    setSelectedItems(new Set(filteredItems.map(item => item.id)));
  };

  const deselectAll = () => {
    setSelectedItems(new Set());
  };

  const filteredItems = pendingItems
    .filter(item => filterType === "all" || item.type === filterType)
    .filter(item => filterPriority === "all" || item.priority === filterPriority)
    .sort((a, b) => {
      if (sortBy === "priority") {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      if (sortBy === "days") {
        return b.daysWaiting - a.daysWaiting;
      }
      return a.scholarName.localeCompare(b.scholarName);
    });

  const selectedCount = selectedItems.size;
  const hasSelection = selectedCount > 0;

  return (
    <div className="card-institutional mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            Fila de Pendências
            <Badge variant="secondary" className="text-xs">
              {filteredItems.length} itens
            </Badge>
          </h3>
          <p className="text-sm text-muted-foreground">
            Gerencie análises, aprovações e ações em lote
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="report">Relatórios</SelectItem>
              <SelectItem value="payment">Pagamentos</SelectItem>
              <SelectItem value="document">Documentos</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="critical">Crítica</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="medium">Média</SelectItem>
              <SelectItem value="low">Baixa</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="priority">Por prioridade</SelectItem>
              <SelectItem value="days">Por tempo de espera</SelectItem>
              <SelectItem value="name">Por nome</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Batch Actions Bar */}
      <div className={cn(
        "flex items-center justify-between p-3 rounded-lg mb-4 transition-all",
        hasSelection ? "bg-primary/5 border border-primary/20" : "bg-muted/30 border border-transparent"
      )}>
        <div className="flex items-center gap-3">
          <button
            onClick={selectedCount === filteredItems.length ? deselectAll : selectAll}
            className="p-1 rounded hover:bg-muted transition-colors"
          >
            {selectedCount === filteredItems.length && filteredItems.length > 0 ? (
              <CheckSquare className="w-5 h-5 text-primary" />
            ) : (
              <Square className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
          <span className="text-sm text-muted-foreground">
            {hasSelection 
              ? `${selectedCount} item(ns) selecionado(s)`
              : "Selecione itens para ações em lote"
            }
          </span>
        </div>

        {hasSelection && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="default" className="gap-2">
              <CheckCircle className="w-4 h-4" />
              Aprovar ({selectedCount})
            </Button>
            <Button size="sm" variant="outline" className="gap-2">
              <DollarSign className="w-4 h-4" />
              Liberar Pagamento
            </Button>
            <Button size="sm" variant="outline" className="gap-2">
              <Mail className="w-4 h-4" />
              Enviar Notificação
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Solicitar documentação</DropdownMenuItem>
                <DropdownMenuItem>Marcar para revisão</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  Rejeitar selecionados
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Items List */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {filteredItems.map((item) => {
          const isSelected = selectedItems.has(item.id);
          const TypeIcon = typeConfig[item.type].icon;
          const StatusIcon = statusConfig[item.status].icon;

          return (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer",
                isSelected 
                  ? "bg-primary/5 border-primary/30" 
                  : "bg-background hover:bg-muted/30 border-border"
              )}
              onClick={() => toggleItem(item.id)}
            >
              <div className="flex-shrink-0">
                {isSelected ? (
                  <CheckSquare className="w-5 h-5 text-primary" />
                ) : (
                  <Square className="w-5 h-5 text-muted-foreground" />
                )}
              </div>

              <div className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                typeConfig[item.type].className
              )}>
                <TypeIcon className="w-4 h-4" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground truncate">
                    {item.scholarName}
                  </span>
                  <span className={cn(
                    "inline-flex items-center gap-1 text-xs",
                    statusConfig[item.status].className
                  )}>
                    <StatusIcon className="w-3 h-3" />
                    {item.daysWaiting}d
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {item.project} • {typeConfig[item.type].label} • {item.referenceMonth}
                </p>
              </div>

              <Badge 
                variant="secondary" 
                className={cn("text-xs flex-shrink-0", priorityConfig[item.priority].className)}
              >
                {priorityConfig[item.priority].label}
              </Badge>

              <Button 
                size="sm" 
                variant="ghost" 
                className="flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  // TODO: Open detail view
                }}
              >
                Ver
              </Button>
            </div>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-success/50" />
          <p className="font-medium">Nenhuma pendência encontrada</p>
          <p className="text-sm">Todos os itens estão em dia!</p>
        </div>
      )}
    </div>
  );
}
