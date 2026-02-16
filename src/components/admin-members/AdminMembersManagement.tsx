import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UserPlus, Search, Pencil, UserX, UserCheck, Clock, Mail } from "lucide-react";
import { useAdminMembers, type AdminMember } from "@/hooks/useAdminMembers";
import { AddMemberDialog } from "./AddMemberDialog";
import { EditMemberDialog } from "./EditMemberDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function AdminMembersManagement() {
  const { members, invites, loading, updateMemberRole, toggleMemberActive, createInvite } = useAdminMembers();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editMember, setEditMember] = useState<AdminMember | null>(null);

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

  const roleBadge = (role: string) => {
    const variants: Record<string, string> = {
      admin: "bg-primary text-primary-foreground",
      owner: "bg-primary text-primary-foreground",
      manager: "bg-info text-white",
    };
    return (
      <Badge className={variants[role] || "bg-muted text-muted-foreground"}>
        {role === "owner" ? "Admin" : role.charAt(0).toUpperCase() + role.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  // Adapter for EditMemberDialog which expects OrgMember shape
  const editMemberAdapter = editMember ? {
    id: editMember.id,
    user_id: editMember.user_id,
    organization_id: editMember.organization_id,
    role: editMember.role,
    is_active: editMember.is_active,
    permissions: editMember.permissions,
    created_at: editMember.created_at,
    updated_at: editMember.updated_at,
    profiles: {
      full_name: editMember.full_name,
      email: editMember.email,
      avatar_url: editMember.avatar_url,
    },
  } : null;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Membros Administrativos</CardTitle>
              <CardDescription>Gerencie admins e managers da organização</CardDescription>
            </div>
            <Button onClick={() => setAddOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Adicionar Membro
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou e-mail..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Members Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
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
                    <TableCell className="font-medium">
                      {m.full_name || "—"}
                    </TableCell>
                    <TableCell>{m.email || "—"}</TableCell>
                    <TableCell>{roleBadge(m.role)}</TableCell>
                    <TableCell>
                      {m.is_active ? (
                        <Badge variant="outline" className="border-primary/50 text-primary">
                          <UserCheck className="h-3 w-3 mr-1" /> Ativo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-destructive/50 text-destructive">
                          <UserX className="h-3 w-3 mr-1" /> Inativo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(m.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setEditMember(m)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleMemberActive(m.id, !m.is_active)}
                        >
                          {m.is_active ? <UserX className="h-4 w-4 text-destructive" /> : <UserCheck className="h-4 w-4 text-primary" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pending Invites */}
          {invites.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" /> Convites Pendentes
              </h3>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Expira em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invites.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {inv.email}
                        </TableCell>
                        <TableCell>{roleBadge(inv.role)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(inv.expires_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AddMemberDialog open={addOpen} onOpenChange={setAddOpen} onSubmit={createInvite} />
      <EditMemberDialog
        open={!!editMember}
        onOpenChange={(open) => !open && setEditMember(null)}
        member={editMemberAdapter}
        onUpdateRole={updateMemberRole}
        onToggleActive={toggleMemberActive}
      />
    </>
  );
}
