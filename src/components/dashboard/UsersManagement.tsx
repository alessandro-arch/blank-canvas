import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Users, 
  Search, 
  MoreHorizontal, 
  Shield, 
  GraduationCap, 
  RefreshCw, 
  Clock, 
  Plus, 
  Trash2,
  UserX,
  UserCheck,
  AlertTriangle,
  Eye,
  Edit
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { AssignScholarshipDialog } from "./AssignScholarshipDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserWithRole {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: AppRole;
  created_at: string;
  has_active_enrollment: boolean;
  is_active: boolean;
  invite_code_used: string | null;
}

const ROLE_CONFIG: Record<AppRole, { label: string; variant: "default" | "secondary" | "outline"; icon: React.ReactNode }> = {
  admin: { label: "Administrador", variant: "default", icon: <Shield className="w-3 h-3" /> },
  manager: { label: "Gestor", variant: "secondary", icon: <Shield className="w-3 h-3" /> },
  auditor: { label: "Auditor", variant: "secondary", icon: <Shield className="w-3 h-3" /> },
  scholar: { label: "Bolsista", variant: "outline", icon: <GraduationCap className="w-3 h-3" /> },
};

type FilterType = "all" | AppRole | "egresso" | "awaiting" | "inactive";
type DialogAction = "deactivate" | "reactivate" | "delete" | null;

export function UsersManagement() {
  const { user: currentUser } = useAuth();
  const { role: currentUserRole } = useUserRole();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<FilterType>("all");
  const [inviteCodeFilter, setInviteCodeFilter] = useState<string>("all");
  
  // Selection state
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<DialogAction>(null);
  const [processing, setProcessing] = useState(false);
  
  // Dialog state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);

  const isAdmin = currentUserRole === "admin";

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch profiles with their roles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, email, avatar_url, created_at, is_active, invite_code_used");

      if (profilesError) throw profilesError;

      // Fetch roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Fetch active enrollments to identify egressos
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from("enrollments")
        .select("user_id, status")
        .eq("status", "active");

      if (enrollmentsError) throw enrollmentsError;

      const activeEnrollmentUserIds = new Set(enrollments?.map(e => e.user_id) || []);
      const rolesMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

      const usersWithRoles: UserWithRole[] = (profiles || []).map(profile => ({
        id: profile.id,
        user_id: profile.user_id,
        full_name: profile.full_name,
        email: profile.email,
        avatar_url: profile.avatar_url,
        role: rolesMap.get(profile.user_id) || "scholar",
        created_at: profile.created_at,
        has_active_enrollment: activeEnrollmentUserIds.has(profile.user_id),
        is_active: profile.is_active,
        invite_code_used: profile.invite_code_used,
      }));

      setUsers(usersWithRoles);
      setSelectedUserIds(new Set()); // Clear selection on refresh
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Unique invite codes for filter
  const uniqueInviteCodes = Array.from(new Set(users.map(u => u.invite_code_used).filter(Boolean) as string[])).sort();

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      !searchTerm ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.invite_code_used?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    // Invite code filter
    if (inviteCodeFilter !== "all") {
      if (inviteCodeFilter === "none") {
        if (user.invite_code_used) return false;
      } else {
        if (user.invite_code_used !== inviteCodeFilter) return false;
      }
    }

    if (roleFilter === "all") return true;
    if (roleFilter === "inactive") return !user.is_active;
    if (roleFilter === "awaiting") {
      return user.role === "scholar" && !user.has_active_enrollment && user.is_active;
    }
    if (roleFilter === "egresso") {
      return user.role === "scholar" && !user.has_active_enrollment && user.is_active;
    }
    if (roleFilter === "scholar") {
      return user.role === "scholar" && user.has_active_enrollment && user.is_active;
    }
    return user.role === roleFilter && user.is_active;
  });

  // Filter out current user from selectable users
  const selectableUsers = filteredUsers.filter(u => u.user_id !== currentUser?.id);

  const getInitials = (name: string | null) => {
    if (!name) return "??";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getUserStatus = (user: UserWithRole) => {
    if (!user.is_active) {
      return { label: "Desativado", variant: "destructive" as const, icon: <UserX className="w-3 h-3" /> };
    }
    if (user.role === "admin" || user.role === "manager") {
      return ROLE_CONFIG[user.role];
    }
    if (user.role === "scholar" && !user.has_active_enrollment) {
      return { label: "Aguardando Atribuição", variant: "outline" as const, icon: <Clock className="w-3 h-3" /> };
    }
    return ROLE_CONFIG.scholar;
  };

  const isAwaitingAssignment = (user: UserWithRole) => {
    return user.role === "scholar" && !user.has_active_enrollment && user.is_active;
  };

  const handleAssignScholarship = (user: UserWithRole) => {
    setSelectedUser(user);
    setAssignDialogOpen(true);
  };

  // Selection handlers
  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUserIds);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUserIds(newSelection);
  };

  const toggleAllSelection = () => {
    if (selectedUserIds.size === selectableUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(selectableUsers.map(u => u.user_id)));
    }
  };

  const generateReferenceCode = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ERR-${timestamp}-${random}`;
  };

  const openActionDialog = (action: DialogAction, userId?: string) => {
    if (userId) {
      setSelectedUserIds(new Set([userId]));
    }
    setDialogAction(action);
    setDialogOpen(true);
  };

  const handleUserAction = async () => {
    if (selectedUserIds.size === 0 || !dialogAction) return;
    
    const targetUserIds = Array.from(selectedUserIds);
    setProcessing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("manage-users", {
        body: { action: dialogAction, userIds: targetUserIds },
      });

      // Handle function invocation errors
      if (error) {
        const referenceCode = generateReferenceCode();
        
        console.error("[MANAGE_USERS_ERROR]", {
          statusCode: error.status || "N/A",
          payload: error,
          targetUserIds,
          action: dialogAction,
          referenceCode,
        });

        // Try to extract structured error from response context
        let userMessage = error.message || "Falha na comunicação com o servidor";
        
        // Check if data contains the actual error details (e.g., 409 has_dependencies)
        if (data?.message) {
          userMessage = data.message;
        } else if (data?.details?.failed?.length > 0) {
          userMessage = data.details.failed.map((f: { error: string }) => f.error).join("; ");
        }

        // Show contextual message for dependency errors
        if (data?.error === "has_dependencies") {
          toast.warning("Não é possível excluir este usuário", {
            description: `${userMessage} Sugestão: desative o usuário em vez de excluí-lo.`,
            duration: 10000,
          });
        } else {
          toast.error("Erro ao processar solicitação", {
            description: `${userMessage}. Código: ${referenceCode}`,
            duration: 10000,
          });
        }
        return;
      }

      // Check if the response indicates an error
      if (data?.error) {
        const referenceCode = generateReferenceCode();
        
        console.error("[MANAGE_USERS_ERROR]", {
          statusCode: data.statusCode || "N/A",
          payload: data,
          targetUserIds,
          action: dialogAction,
          referenceCode,
        });

        toast.error("Não foi possível completar a ação", {
          description: `${data.error}. Código: ${referenceCode}`,
          duration: 10000,
        });
        return;
      }

      // Handle partial failures
      if (data.results?.failed?.length > 0) {
        const failedCount = data.results.failed.length;
        const successCount = data.results.success.length;
        
        console.warn("[MANAGE_USERS_PARTIAL]", {
          successCount,
          failedCount,
          failed: data.results.failed,
          targetUserIds,
          action: dialogAction,
        });

        if (successCount > 0) {
          toast.warning(`${successCount} usuário(s) processado(s), ${failedCount} falha(s)`, {
            description: data.results.failed.map((f: { id: string; error: string }) => f.error).join("; "),
            duration: 10000,
          });
        } else {
          toast.error("Não foi possível processar nenhum usuário", {
            description: data.results.failed[0]?.error || "Erro desconhecido",
            duration: 10000,
          });
          return;
        }
      } else {
        // Full success
        console.info("[MANAGE_USERS_SUCCESS]", {
          action: dialogAction,
          count: data.results?.success?.length || 0,
          targetUserIds,
        });

        toast.success(data.message || "Ação realizada com sucesso");
      }

      setSelectedUserIds(new Set());
      setDialogOpen(false);
      setDialogAction(null);
      fetchUsers();
      
    } catch (error: any) {
      const referenceCode = generateReferenceCode();
      
      console.error("[MANAGE_USERS_ERROR]", {
        statusCode: error?.status || "UNKNOWN",
        payload: error,
        targetUserIds,
        action: dialogAction,
        referenceCode,
      });

      toast.error("Erro inesperado", {
        description: `Ocorreu um erro inesperado. Código: ${referenceCode}`,
        duration: 10000,
      });
    } finally {
      setProcessing(false);
    }
  };

  const stats = {
    total: users.length,
    managers: users.filter(u => (u.role === "manager" || u.role === "admin") && u.is_active).length,
    scholars: users.filter(u => u.role === "scholar" && u.has_active_enrollment && u.is_active).length,
    awaiting: users.filter(u => u.role === "scholar" && !u.has_active_enrollment && u.is_active).length,
    inactive: users.filter(u => !u.is_active).length,
  };

  const selectedCount = selectedUserIds.size;
  const isAllSelected = selectableUsers.length > 0 && selectedUserIds.size === selectableUsers.length;
  const isSomeSelected = selectedUserIds.size > 0 && selectedUserIds.size < selectableUsers.length;

  // Check if selected users can be deleted (no linked records - only for display purposes)
  const selectedUsers = users.filter(u => selectedUserIds.has(u.user_id));
  const hasActiveScholars = selectedUsers.some(u => u.role === "scholar" && u.has_active_enrollment);
  const hasInactiveUsers = selectedUsers.some(u => !u.is_active);
  const hasActiveUsers = selectedUsers.some(u => u.is_active);

  const getDialogContent = () => {
    switch (dialogAction) {
      case "deactivate":
        return {
          title: "Desativar usuário(s)?",
          description: (
            <>
              Você está prestes a desativar <strong>{selectedCount} usuário(s)</strong>. 
              Esta ação irá:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Bloquear acesso à plataforma</li>
                <li>Suspender matrículas ativas</li>
                <li>Preservar todo o histórico de relatórios e pagamentos</li>
              </ul>
              <p className="mt-3 text-sm">O usuário poderá ser reativado posteriormente.</p>
            </>
          ),
          confirmLabel: "Desativar",
          icon: <UserX className="w-4 h-4 mr-2" />,
        };
      case "reactivate":
        return {
          title: "Reativar usuário(s)?",
          description: (
            <>
              Você está prestes a reativar <strong>{selectedCount} usuário(s)</strong>. 
              Esta ação irá:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Restaurar acesso à plataforma</li>
                <li>Permitir login novamente</li>
              </ul>
              <p className="mt-3 text-sm text-muted-foreground">
                Nota: As matrículas suspensas precisarão ser reativadas manualmente.
              </p>
            </>
          ),
          confirmLabel: "Reativar",
          icon: <UserCheck className="w-4 h-4 mr-2" />,
        };
      case "delete":
        return {
          title: "Excluir permanentemente?",
          description: (
            <>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 mb-4">
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div className="text-sm">
                  <strong className="text-destructive">Ação irreversível!</strong>
                  <p className="text-muted-foreground mt-1">
                    A exclusão permanente só é permitida para usuários sem registros vinculados.
                  </p>
                </div>
              </div>
              Você está prestes a excluir permanentemente <strong>{selectedCount} usuário(s)</strong>. 
              Esta ação irá:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Remover todos os dados do perfil</li>
                <li>Excluir dados bancários</li>
                <li>Remover acesso definitivamente</li>
              </ul>
            </>
          ),
          confirmLabel: "Excluir Permanentemente",
          icon: <Trash2 className="w-4 h-4 mr-2" />,
        };
      default:
        return null;
    }
  };

  const dialogContent = getDialogContent();

  return (
    <>
      <Card className="mt-6">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Usuários da Plataforma</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {stats.total} usuários • {stats.managers} gestores • {stats.scholars} bolsistas ativos • {stats.awaiting} aguardando • {stats.inactive} inativos
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedCount > 0 && (
                <div className="flex items-center gap-2">
                  {hasActiveUsers && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => openActionDialog("deactivate")}
                      className="gap-2 border-orange-200 text-orange-700 hover:bg-orange-50"
                    >
                      <UserX className="w-4 h-4" />
                      Desativar ({selectedUsers.filter(u => u.is_active).length})
                    </Button>
                  )}
                  {hasInactiveUsers && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => openActionDialog("reactivate")}
                      className="gap-2 border-green-200 text-green-700 hover:bg-green-50"
                    >
                      <UserCheck className="w-4 h-4" />
                      Reativar ({selectedUsers.filter(u => !u.is_active).length})
                    </Button>
                  )}
                  {isAdmin ? (
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => openActionDialog("delete")}
                      className="gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Excluir ({selectedCount})
                    </Button>
                  ) : (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span tabIndex={0}>
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              disabled
                              className="gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              Excluir ({selectedCount})
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Apenas administradores podem executar esta ação</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              )}
              <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as FilterType)}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="admin">Administradores</SelectItem>
                <SelectItem value="manager">Gestores</SelectItem>
                <SelectItem value="scholar">Bolsistas Ativos</SelectItem>
                <SelectItem value="awaiting">Aguardando Atribuição</SelectItem>
                <SelectItem value="inactive">Desativados</SelectItem>
              </SelectContent>
            </Select>
            <Select value={inviteCodeFilter} onValueChange={setInviteCodeFilter}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Código de convite" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os códigos</SelectItem>
                <SelectItem value="none">Sem código</SelectItem>
                {uniqueInviteCodes.map(code => (
                  <SelectItem key={code} value={code}>{code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-medium text-muted-foreground">Nenhum usuário encontrado</h3>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {searchTerm || roleFilter !== "all" 
                  ? "Tente ajustar os filtros de busca"
                  : "Importe dados via planilha para adicionar usuários"}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={isAllSelected}
                        onCheckedChange={toggleAllSelection}
                        aria-label="Selecionar todos"
                        className={isSomeSelected ? "data-[state=checked]:bg-primary/50" : ""}
                      />
                    </TableHead>
                    <TableHead>Usuário</TableHead>
                    
                    <TableHead>Email</TableHead>
                    <TableHead>Código Convite</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const status = getUserStatus(user);
                    const awaiting = isAwaitingAssignment(user);
                    const isCurrentUser = user.user_id === currentUser?.id;
                    const isSelected = selectedUserIds.has(user.user_id);
                    const isInactive = !user.is_active;
                    
                    return (
                      <TableRow 
                        key={user.id} 
                        className={`${awaiting ? "bg-warning/5" : ""} ${isSelected ? "bg-primary/5" : ""} ${isInactive ? "opacity-60" : ""}`}
                      >
                        <TableCell>
                          {!isCurrentUser ? (
                            <Checkbox 
                              checked={isSelected}
                              onCheckedChange={() => toggleUserSelection(user.user_id)}
                              aria-label={`Selecionar ${user.full_name}`}
                            />
                          ) : (
                            <div className="w-4 h-4" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={user.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {getInitials(user.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className={`font-medium ${isInactive ? "line-through" : ""}`}>
                                {user.full_name || "Sem nome"}
                              </span>
                              {isCurrentUser && (
                                <span className="text-xs text-muted-foreground">(você)</span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.email || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.invite_code_used ? (
                            <Badge variant="outline" className="font-mono text-xs">{user.invite_code_used}</Badge>
                          ) : (
                            <span className="text-muted-foreground/50">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={status.variant} 
                            className={`gap-1 ${awaiting ? "bg-warning/10 text-warning border-warning/20" : ""} ${isInactive ? "bg-destructive/10 text-destructive border-destructive/20" : ""}`}
                          >
                            {status.icon}
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {awaiting && (
                                <>
                                  <DropdownMenuItem 
                                    className="gap-2 text-primary"
                                    onClick={() => handleAssignScholarship(user)}
                                  >
                                    <Plus className="w-4 h-4" />
                                    Atribuir Bolsa
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              <DropdownMenuItem 
                                className="gap-2"
                                onClick={() => navigate(`/admin/bolsista/${user.user_id}`)}
                              >
                                <Eye className="w-4 h-4" />
                                Ver detalhes
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="gap-2"
                                onClick={() => navigate(`/admin/bolsista/${user.user_id}`)}
                              >
                                <Edit className="w-4 h-4" />
                                Editar perfil
                              </DropdownMenuItem>
                              {!isCurrentUser && (
                                <>
                                  <DropdownMenuSeparator />
                                  {user.is_active ? (
                                    <DropdownMenuItem 
                                      className="gap-2 text-orange-600 focus:text-orange-600"
                                      onClick={() => openActionDialog("deactivate", user.user_id)}
                                    >
                                      <UserX className="w-4 h-4" />
                                      Desativar bolsista
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem 
                                      className="gap-2 text-green-600 focus:text-green-600"
                                      onClick={() => openActionDialog("reactivate", user.user_id)}
                                    >
                                      <UserCheck className="w-4 h-4" />
                                      Reativar usuário
                                    </DropdownMenuItem>
                                  )}
                                  {isAdmin ? (
                                    <DropdownMenuItem 
                                      className="gap-2 text-destructive focus:text-destructive"
                                      onClick={() => openActionDialog("delete", user.user_id)}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      Excluir permanentemente
                                    </DropdownMenuItem>
                                  ) : (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="w-full">
                                            <DropdownMenuItem 
                                              disabled
                                              className="gap-2 text-muted-foreground cursor-not-allowed"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                              Excluir permanentemente
                                            </DropdownMenuItem>
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent side="left">
                                          <p>Apenas administradores podem executar esta ação</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Confirmation Dialog */}
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogContent?.title}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>{dialogContent?.description}</div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleUserAction}
              disabled={processing}
              className={dialogAction === "delete" 
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" 
                : dialogAction === "deactivate"
                  ? "bg-orange-600 text-white hover:bg-orange-700"
                  : "bg-green-600 text-white hover:bg-green-700"
              }
            >
              {processing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  {dialogContent?.icon}
                  {dialogContent?.confirmLabel}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assign Scholarship Dialog */}
      {selectedUser && (
        <AssignScholarshipDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          userId={selectedUser.user_id}
          userName={selectedUser.full_name}
          onSuccess={fetchUsers}
        />
      )}
    </>
  );
}
