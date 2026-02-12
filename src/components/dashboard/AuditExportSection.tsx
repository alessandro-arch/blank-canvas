import { useState } from "react";
import { 
  Download, FileSpreadsheet, FileText, Filter, 
  Calendar, Clock, User, CheckCircle, XCircle,
  Eye, ChevronRight, History, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface AuditLog {
  id: string;
  action: "approved" | "rejected" | "payment_released" | "payment_blocked" | "document_requested";
  performer: string;
  target: string;
  targetType: "report" | "payment" | "scholar";
  timestamp: Date;
  details?: string;
}

interface ExportOption {
  id: string;
  label: string;
  description: string;
  icon: typeof FileSpreadsheet;
  format: "xlsx" | "csv" | "pdf";
}

// Mock data
const auditLogs: AuditLog[] = [
  { id: "1", action: "approved", performer: "Maria Santos", target: "Relatório Jan/2026 - Ana Carolina", targetType: "report", timestamp: new Date(2026, 0, 28, 14, 30), details: "Aprovado sem ressalvas" },
  { id: "2", action: "payment_released", performer: "Maria Santos", target: "Pagamento Fev/2026 - Bruno Oliveira", targetType: "payment", timestamp: new Date(2026, 0, 28, 14, 15) },
  { id: "3", action: "rejected", performer: "João Silva", target: "Relatório Jan/2026 - Carlos Lima", targetType: "report", timestamp: new Date(2026, 0, 28, 11, 45), details: "Faltam informações sobre atividades realizadas" },
  { id: "4", action: "document_requested", performer: "Maria Santos", target: "Elena Rodrigues", targetType: "scholar", timestamp: new Date(2026, 0, 27, 16, 20), details: "Solicitado comprovante de matrícula atualizado" },
  { id: "5", action: "payment_blocked", performer: "Sistema", target: "Pagamento Jan/2026 - Fernando Costa", targetType: "payment", timestamp: new Date(2026, 0, 27, 10, 0), details: "Bloqueado automaticamente - relatório pendente" },
  { id: "6", action: "approved", performer: "João Silva", target: "Relatório Dez/2025 - Gabriela Martins", targetType: "report", timestamp: new Date(2026, 0, 26, 15, 30) },
];

const exportOptions: ExportOption[] = [
  { id: "scholars_list", label: "Lista de Bolsistas", description: "Todos os bolsistas ativos com dados cadastrais", icon: FileSpreadsheet, format: "xlsx" },
  { id: "payments_summary", label: "Resumo de Pagamentos", description: "Folha de pagamento do mês atual", icon: FileSpreadsheet, format: "xlsx" },
  { id: "reports_status", label: "Status de Relatórios", description: "Situação de todos os relatórios pendentes", icon: FileText, format: "pdf" },
  { id: "projects_progress", label: "Progresso de Projetos", description: "Avanço percentual de cada projeto", icon: FileSpreadsheet, format: "xlsx" },
  { id: "audit_trail", label: "Trilha de Auditoria", description: "Histórico completo de ações do período", icon: FileText, format: "csv" },
];

const actionConfig = {
  approved: { label: "Aprovação", icon: CheckCircle, className: "text-success bg-success/10" },
  rejected: { label: "Rejeição", icon: XCircle, className: "text-destructive bg-destructive/10" },
  payment_released: { label: "Pagamento Liberado", icon: CheckCircle, className: "text-success bg-success/10" },
  payment_blocked: { label: "Pagamento Bloqueado", icon: XCircle, className: "text-warning bg-warning/10" },
  document_requested: { label: "Documento Solicitado", icon: FileText, className: "text-info bg-info/10" },
};

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `há ${diffMins}min`;
  if (diffHours < 24) return `há ${diffHours}h`;
  return `há ${diffDays}d`;
}

function AuditLogItem({ log }: { log: AuditLog }) {
  const config = actionConfig[log.action];
  const Icon = config.icon;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors">
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
        config.className
      )}>
        <Icon className="w-4 h-4" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-foreground text-sm">
            {config.label}
          </span>
          <span className="text-xs text-muted-foreground">por</span>
          <span className="text-sm text-foreground">{log.performer}</span>
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {log.target}
        </p>
        {log.details && (
          <p className="text-xs text-muted-foreground/70 mt-1 italic">
            "{log.details}"
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs text-muted-foreground">
          {formatRelativeTime(log.timestamp)}
        </span>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
          <Eye className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

function ExportCard({ option, onExport }: { option: ExportOption; onExport: () => void }) {
  const Icon = option.icon;

  return (
    <div className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/20 transition-all">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{option.label}</span>
          <Badge variant="secondary" className="text-xs uppercase">
            {option.format}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{option.description}</p>
      </div>

      <Button size="sm" variant="outline" className="gap-2" onClick={onExport}>
        <Download className="w-4 h-4" />
        Exportar
      </Button>
    </div>
  );
}

export function AuditExportSection() {
  const [auditFilter, setAuditFilter] = useState<string>("all");
  const [exportPeriod, setExportPeriod] = useState<string>("current_month");

  const filteredLogs = auditLogs.filter(log => 
    auditFilter === "all" || log.action === auditFilter
  );

  const handleExport = (optionId: string) => {
    // TODO: Implement actual export
    console.log("Exporting:", optionId, "Period:", exportPeriod);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Audit Trail */}
      <div className="card-institutional">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <div>
              <h3 className="text-lg font-semibold text-foreground">Trilha de Auditoria</h3>
              <p className="text-sm text-muted-foreground">Últimas ações no sistema</p>
            </div>
          </div>
          <Select value={auditFilter} onValueChange={setAuditFilter}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="Filtrar ação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as ações</SelectItem>
              <SelectItem value="approved">Aprovações</SelectItem>
              <SelectItem value="rejected">Rejeições</SelectItem>
              <SelectItem value="payment_released">Pagamentos liberados</SelectItem>
              <SelectItem value="payment_blocked">Pagamentos bloqueados</SelectItem>
              <SelectItem value="document_requested">Documentos solicitados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1 max-h-[350px] overflow-y-auto">
          {filteredLogs.map(log => (
            <AuditLogItem key={log.id} log={log} />
          ))}
        </div>

        {filteredLogs.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <History className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum registro encontrado</p>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-border">
          <Button variant="ghost" size="sm" className="w-full gap-2">
            Ver histórico completo
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Export Section */}
      <div className="card-institutional">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            <div>
              <h3 className="text-lg font-semibold text-foreground">Exportação de Dados</h3>
              <p className="text-sm text-muted-foreground">Relatórios e planilhas</p>
            </div>
          </div>
          <Select value={exportPeriod} onValueChange={setExportPeriod}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current_month">Mês atual</SelectItem>
              <SelectItem value="last_month">Mês anterior</SelectItem>
              <SelectItem value="last_quarter">Último trimestre</SelectItem>
              <SelectItem value="last_semester">Último semestre</SelectItem>
              <SelectItem value="last_year">Último ano</SelectItem>
              <SelectItem value="all_time">Todo o período</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          {exportOptions.map(option => (
            <ExportCard 
              key={option.id} 
              option={option} 
              onExport={() => handleExport(option.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
