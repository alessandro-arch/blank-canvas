import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UserPlus, Search, Pencil, UserX, UserCheck, Clock, Mail, Users, XCircle, ShieldCheck, RefreshCw, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { useAdminMembers } from "@/hooks/useAdminMembers";
import { AddMemberDialog } from "./AddMemberDialog";
import { EditMemberDialog } from "./EditMemberDialog";
import type { AdminMemberFlat, OrgInvite } from "@/types/admin-members";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  manager: "Manager",
  reviewer: "Reviewer",
  auditor: "Auditor",
  beneficiary: "Beneficiário",
};

export function AdminMembersManagement() {
  const { members, invites, loading, updateMemberRole, toggleMemberActive, createInvite, revokeInvite, resendInviteEmail } = useAdminMembers();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editMember, setEditMember] = useState<AdminMemberFlat | null>(null);
  const [loadingInviteId, setLoadingInviteId] = useState<string | null>(null);

  // Metrics
  const totalMembers = members.length;
  const activeMembers = members.filter(m => m.is_active).length;
  const suspendedMembers = members.filter(m => !m.is_active).length;
  const pendingInvites = invites.filter(i => i.status === 'pending').length;

  const filtered = useMemo(() => {
    return members.filter((m) => {
      const name = m.full_name || "";
      const email = m.email || "";
      const matchSearch = !search || name.toLowerCase().includes(search.toLowerCase()) || email.toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === "all" || m.role === roleFilter;
      const matchStatus = statusFilter === "all" || (statusFilter === "active" ? m.is_active : !m.is_active);
      return matchSearch && matchRole && matchStatus;
    });
  }, [members, search, roleFilter, statusFilter]);

  const pendingInvitesList = useMemo(() => {
    return invites.filter(i => i.status === 'pending');
  }, [invites]);

  const roleBadge = (role: string) => {
    const variants: Record<string, string> = {
      admin: "bg-primary text-primary-foreground",
      manager: "bg-info text-white",
      reviewer: "bg-accent text-accent-foreground",
      auditor: "bg-warning text-warning-foreground",
      beneficiary: "bg-muted text-muted-foreground",
    };
    return (
      <Badge className={variants[role] || "bg-muted text-muted-foreground"}>
        {ROLE_LABELS[role] || role}
      </Badge>
    );
  };

  const handleResend = async (inviteId: string) => {
    setLoadingInviteId(inviteId);
    await resendInviteEmail(inviteId);
    setLoadingInviteId(null);
  };

  const handleRevoke = async (inviteId: string) => {
    setLoadingInviteId(inviteId);
    await revokeInvite(inviteId);
    setLoadingInviteId(null);
  };

  const isExpiringSoon = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    return diff > 0 && diff < 24 * 60 * 60 * 1000;
  };

  const renderEmailStatus = (inv: OrgInvite) => {
    const attempts = (inv as any).send_attempts || 0;
    const hasError = !!inv.send_error;
    const wasSent = !!inv.email_sent_at;

    if (wasSent && !hasError) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <span className="flex items-center gap-1 text-primary text-xs">
                <CheckCircle2 className="h-3 w-3" />
                Enviado
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Enviado em {format(new Date(inv.email_sent_at!), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
              {attempts > 1 && <p>{attempts} tentativa(s)</p>}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    if (hasError) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <span className="flex items-center gap-1 text-destructive text-xs">
                <AlertTriangle className="h-3 w-3" />
                Falha
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Erro: {inv.send_error}</p>
              <p>{attempts} tentativa(s)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    if (attempts > 0 && !wasSent) {
      return <span className="text-xs text-muted-foreground">{attempts} tentativa(s)</span>;
    }

    return <span className="text-xs text-muted-foreground">Nao enviado</span>;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalMembers}</p>
                <p className="text-xs text-muted-foreground">Total membros</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeMembers}</p>
                <p className="text-xs text-muted-foreground">Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <XCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{suspendedMembers}</p>
                <p className="text-xs text-muted-foreground">Suspensos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent">
                <Mail className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingInvites}</p>
                <p className="text-xs text-muted-foreground">Convites pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Membros</CardTitle>
              <CardDescription>Admins, managers e reviewers da organizacao</CardDescription>
            </div>
            <Button onClick={() => setAddOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Convidar Membro
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome ou e-mail..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Papel" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os papeis</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="reviewer">Reviewer</SelectItem>
                <SelectItem value="auditor">Auditor</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Suspensos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhum membro encontrado
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((m) => (
                  <TableRow key={m.id} className={!m.is_active ? "opacity-50" : ""}>
                    <TableCell className="font-medium">{m.full_name || "—"}</TableCell>
                    <TableCell>{m.email || "—"}</TableCell>
                    <TableCell>{roleBadge(m.role)}</TableCell>
                    <TableCell>
                      {m.is_active ? (
                        <Badge variant="outline" className="border-primary/50 text-primary">
                          <UserCheck className="h-3 w-3 mr-1" /> Ativo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-destructive/50 text-destructive">
                          <UserX className="h-3 w-3 mr-1" /> Suspenso
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(m.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setEditMember(m)} title="Editar papel">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => toggleMemberActive(m.id, !m.is_active)} title={m.is_active ? "Suspender" : "Reativar"}>
                          {m.is_active ? <UserX className="h-4 w-4 text-destructive" /> : <UserCheck className="h-4 w-4 text-primary" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pending Invites with tracking */}
          {pendingInvitesList.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" /> Convites Pendentes
              </h3>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Papel</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Expira em</TableHead>
                      <TableHead className="text-right">Acoes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingInvitesList.map((inv) => {
                      const isLoading = loadingInviteId === inv.id;
                      const expiringSoon = isExpiringSoon(inv.expires_at);
                      const manyAttempts = ((inv as any).send_attempts || 0) >= 3;

                      return (
                        <TableRow key={inv.id} className={manyAttempts ? "bg-destructive/5" : expiringSoon ? "bg-accent/50" : ""}>
                          <TableCell className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            {inv.invited_email}
                          </TableCell>
                          <TableCell>{roleBadge(inv.role)}</TableCell>
                          <TableCell>{renderEmailStatus(inv)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            <span className={expiringSoon ? "text-warning font-medium" : ""}>
                              {expiringSoon && <AlertTriangle className="h-3 w-3 inline mr-1" />}
                              {format(new Date(inv.expires_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {isLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin inline" />
                            ) : (
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="sm" onClick={() => handleResend(inv.id)} title="Reenviar e-mail">
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleRevoke(inv.id)} title="Revogar convite">
                                  <XCircle className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AddMemberDialog open={addOpen} onOpenChange={setAddOpen} onSubmit={createInvite} existingInvites={invites} />
      <EditMemberDialog
        open={!!editMember}
        onOpenChange={(open) => !open && setEditMember(null)}
        member={editMember}
        onUpdateRole={updateMemberRole}
        onToggleActive={toggleMemberActive}
      />
    </div>
  );
}
