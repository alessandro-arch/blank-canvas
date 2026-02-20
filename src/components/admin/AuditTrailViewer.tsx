import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Search, Eye, Calendar, User, Filter, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import type { Json } from "@/integrations/supabase/types";

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Json | null;
  previous_value: Json | null;
  new_value: Json | null;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  bulk_deactivate: "Desativação em massa",
  bulk_delete: "Exclusão em massa",
  update_cpf: "Alteração de CPF",
  update_enrollment: "Alteração de vínculo",
  release_payment: "Liberação de pagamento",
  update_user_role: "Alteração de permissão",
  create_enrollment: "Criação de vínculo",
  delete_enrollment: "Exclusão de vínculo",
  approve_report: "Aprovação de relatório",
  reject_report: "Rejeição de relatório",
  create_project: "Criação de projeto",
  update_project: "Alteração de projeto",
  archive_project: "Arquivamento de projeto",
  delete_project: "Exclusão de projeto",
  assign_scholar_to_project: "Vinculação de bolsista",
  bank_data_under_review: "Dados bancários em análise",
  bank_data_validated: "Dados bancários validados",
  bank_data_returned: "Dados bancários devolvidos",
};

const ENTITY_LABELS: Record<string, string> = {
  user: "Usuário",
  enrollment: "Vínculo",
  payment: "Pagamento",
  report: "Relatório",
  user_role: "Permissão",
  project: "Projeto",
  bank_account: "Dados Bancários",
};

const ACTION_COLORS: Record<string, string> = {
  bulk_delete: "bg-destructive text-destructive-foreground",
  delete_enrollment: "bg-destructive text-destructive-foreground",
  delete_project: "bg-destructive text-destructive-foreground",
  bulk_deactivate: "bg-amber-500 text-white",
  update_cpf: "bg-amber-500 text-white",
  update_user_role: "bg-amber-500 text-white",
  bank_data_validated: "bg-green-500 text-white",
  approve_report: "bg-green-500 text-white",
  bank_data_returned: "bg-orange-500 text-white",
  reject_report: "bg-orange-500 text-white",
};

export function AuditTrailViewer() {
  const { isAdmin } = useUserRole();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  
  // Filters
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterEntity, setFilterEntity] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("audit_logs")
        .select("id, user_id, action, entity_type, entity_id, details, previous_value, new_value, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      if (filterAction && filterAction !== "all") {
        query = query.eq("action", filterAction);
      }
      if (filterEntity && filterEntity !== "all") {
        query = query.eq("entity_type", filterEntity);
      }
      if (startDate) {
        query = query.gte("created_at", startDate);
      }
      if (endDate) {
        query = query.lte("created_at", `${endDate}T23:59:59`);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching audit logs:", error);
        return;
      }

      setLogs(data || []);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchLogs();
    }
  }, [isAdmin]);

  const handleApplyFilters = () => {
    fetchLogs();
  };

  const handleClearFilters = () => {
    setFilterAction("all");
    setFilterEntity("all");
    setStartDate("");
    setEndDate("");
    fetchLogs();
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>Trilha de Auditoria</CardTitle>
                <CardDescription>
                  Registro de todas as ações críticas realizadas no sistema
                </CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchLogs} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Filter className="w-4 h-4" />
              Filtros
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label className="text-xs">Tipo de Ação</Label>
                <Select value={filterAction} onValueChange={setFilterAction}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as ações" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as ações</SelectItem>
                    {Object.entries(ACTION_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Entidade</Label>
                <Select value={filterEntity} onValueChange={setFilterEntity}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as entidades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as entidades</SelectItem>
                    {Object.entries(ENTITY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Data Início</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Data Fim</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleApplyFilters} size="sm">
                Aplicar Filtros
              </Button>
              <Button onClick={handleClearFilters} variant="outline" size="sm">
                Limpar
              </Button>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum registro de auditoria encontrado</p>
              <p className="text-sm">Os registros aparecerão aqui quando ações críticas forem executadas.</p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Entidade</TableHead>
                    <TableHead className="text-right">Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs font-mono text-muted-foreground">{log.user_id.slice(0, 8)}...</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={ACTION_COLORS[log.action] || "bg-secondary"}>
                          {ACTION_LABELS[log.action] || log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {ENTITY_LABELS[log.entity_type] || log.entity_type}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Detalhes do Registro de Auditoria
            </DialogTitle>
            <DialogDescription>
              Informações completas sobre a ação registrada
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-6 pr-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Data/Hora</Label>
                    <p className="font-medium">
                      {format(new Date(selectedLog.created_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">ID do Usuário</Label>
                    <p className="font-mono text-xs">{selectedLog.user_id}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Ação</Label>
                    <Badge className={ACTION_COLORS[selectedLog.action] || "bg-secondary"}>
                      {ACTION_LABELS[selectedLog.action] || selectedLog.action}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Entidade</Label>
                    <p className="font-medium">
                      {ENTITY_LABELS[selectedLog.entity_type] || selectedLog.entity_type}
                      {selectedLog.entity_id && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ({selectedLog.entity_id.slice(0, 8)}...)
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Details */}
                {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Detalhes da Ação</Label>
                    <pre className="bg-muted p-3 rounded-lg text-xs overflow-auto">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Before/After Diff */}
                {(selectedLog.previous_value || selectedLog.new_value) && (
                  <div className="grid md:grid-cols-2 gap-4">
                    {selectedLog.previous_value && (
                      <div>
                        <Label className="text-xs text-muted-foreground mb-2 block">
                          Estado Anterior
                        </Label>
                        <pre className="bg-destructive/10 border border-destructive/20 p-3 rounded-lg text-xs overflow-auto">
                          {JSON.stringify(selectedLog.previous_value, null, 2)}
                        </pre>
                      </div>
                    )}
                    {selectedLog.new_value && (
                      <div>
                        <Label className="text-xs text-muted-foreground mb-2 block">
                          Estado Novo
                        </Label>
                        <pre className="bg-success/10 border border-success/20 p-3 rounded-lg text-xs overflow-auto">
                          {JSON.stringify(selectedLog.new_value, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
