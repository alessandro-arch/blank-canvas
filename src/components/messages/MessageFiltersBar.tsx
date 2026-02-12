import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

export interface MessageFilters {
  search: string;
  status: string;
  type: string;
  eventType: string;
  sortBy: string;
}

interface MessageFiltersBarProps {
  filters: MessageFilters;
  onChange: (filters: MessageFilters) => void;
  onClear: () => void;
}

const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "delivered", label: "Entregue" },
  { value: "read", label: "Lida" },
  { value: "unread", label: "Não lida" },
  { value: "failed", label: "Erro" },
];

const TYPE_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "manual", label: "Manual" },
  { value: "system", label: "Automática/Sistema" },
  { value: "reminder", label: "Lembrete" },
];

const EVENT_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "report_submitted", label: "Relatório enviado" },
  { value: "report_reviewed", label: "Relatório devolvido" },
  { value: "monthly_reminder", label: "Lembrete dia 25" },
  { value: "general", label: "Geral" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Mais recentes" },
  { value: "oldest", label: "Mais antigas" },
  { value: "unread_first", label: "Não lidas primeiro" },
  { value: "errors_first", label: "Erros primeiro" },
];

export const DEFAULT_FILTERS: MessageFilters = {
  search: "",
  status: "all",
  type: "all",
  eventType: "all",
  sortBy: "newest",
};

export function MessageFiltersBar({ filters, onChange, onClear }: MessageFiltersBarProps) {
  const hasFilters = filters.search !== "" || filters.status !== "all" || filters.type !== "all" || filters.eventType !== "all";

  const update = (key: keyof MessageFilters, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por assunto, destinatário, e-mail ou palavra-chave..."
          value={filters.search}
          onChange={(e) => update("search", e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filters.status} onValueChange={(v) => update("status", v)}>
          <SelectTrigger className="w-[140px] h-9 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.type} onValueChange={(v) => update("type", v)}>
          <SelectTrigger className="w-[160px] h-9 text-xs">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.eventType} onValueChange={(v) => update("eventType", v)}>
          <SelectTrigger className="w-[170px] h-9 text-xs">
            <SelectValue placeholder="Evento" />
          </SelectTrigger>
          <SelectContent>
            {EVENT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.sortBy} onValueChange={(v) => update("sortBy", v)}>
          <SelectTrigger className="w-[170px] h-9 text-xs">
            <SelectValue placeholder="Ordenar" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={onClear} className="h-9 text-xs text-muted-foreground">
            <X className="w-3.5 h-3.5 mr-1" />
            Limpar filtros
          </Button>
        )}
      </div>
    </div>
  );
}
