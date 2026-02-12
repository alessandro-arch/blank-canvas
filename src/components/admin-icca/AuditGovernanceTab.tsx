import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ShieldAlert, Search, Filter, User, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AuditLogRow {
  id: string;
  userEmail: string;
  userRole: string;
  organizationName: string;
  action: string;
  entityType: string;
  createdAt: string;
  details: any;
}

export function AuditGovernanceTab() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");

  // Fetch audit logs
  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ["admin-icca-audit-logs"],
    queryFn: async (): Promise<AuditLogRow[]> => {
      const { data: logs, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      const enrichedLogs: AuditLogRow[] = [];

      for (const log of logs || []) {
        // Get user role
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", log.user_id)
          .single();

        // Get user's organization
        const { data: profile } = await supabase
          .from("profiles")
          .select(`
            organization_id,
            organizations(name)
          `)
          .eq("user_id", log.user_id)
          .single();

        enrichedLogs.push({
          id: log.id,
          userEmail: log.user_email || "Desconhecido",
          userRole: roleData?.role || "unknown",
          organizationName: (profile?.organizations as any)?.name || "N/A",
          action: log.action,
          entityType: log.entity_type,
          createdAt: log.created_at,
          details: log.details
        });
      }

      return enrichedLogs;
    }
  });

  // Get unique actions for filter
  const actions = [...new Set(auditLogs?.map(log => log.action) || [])].sort();

  // Filter logs
  const filteredLogs = auditLogs?.filter(log => {
    const matchesSearch = 
      log.userEmail.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.organizationName.toLowerCase().includes(search.toLowerCase());
    const matchesAction = actionFilter === "all" || log.action === actionFilter;

    return matchesSearch && matchesAction;
  }) || [];

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Admin</Badge>;
      case "manager":
        return <Badge className="bg-primary/10 text-primary border-primary/20">Gestor</Badge>;
      case "scholar":
        return <Badge className="bg-info/10 text-info border-info/20">Bolsista</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const getActionBadge = (action: string) => {
    if (action.includes("DELETE") || action.includes("REMOVE")) {
      return <Badge variant="destructive">{action}</Badge>;
    }
    if (action.includes("CREATE") || action.includes("ADD")) {
      return <Badge className="bg-success/10 text-success border-success/20">{action}</Badge>;
    }
    if (action.includes("UPDATE") || action.includes("EDIT")) {
      return <Badge className="bg-warning/10 text-warning border-warning/20">{action}</Badge>;
    }
    if (action.includes("APPROVE") || action.includes("VALIDATE")) {
      return <Badge className="bg-info/10 text-info border-info/20">{action}</Badge>;
    }
    return <Badge variant="outline">{action}</Badge>;
  };

  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            Auditoria e Governança
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Registro de ações críticas por organização, incluindo alterações de status, aprovações e validações.
          </p>
          
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por usuário, ação ou organização..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Tipo de Ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Ações</SelectItem>
                {actions.map(action => (
                  <SelectItem key={action} value={action}>{action}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead className="text-center">Papel</TableHead>
                  <TableHead>Organização</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Entidade</TableHead>
                  <TableHead className="text-right">Data/Hora</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum registro de auditoria encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{log.userEmail}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {getRoleBadge(log.userRole)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.organizationName}</Badge>
                      </TableCell>
                      <TableCell>
                        {getActionBadge(log.action)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {log.entityType}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {formatDateTime(log.createdAt)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
