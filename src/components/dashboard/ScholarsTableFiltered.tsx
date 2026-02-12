import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Filter, MoreHorizontal, Eye, Edit, Trash2, CheckSquare, Square, UserX, Loader2, X, RefreshCw, Calendar, Upload, ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useAdminMasterMode } from "@/contexts/AdminMasterModeContext";
import { BulkRemovalDialog } from "./BulkRemovalDialog";
import { AdminEditScholarDialog } from "@/components/admin/AdminEditScholarDialog";
import { getModalityLabel } from "@/lib/modality-labels";
import type { Database } from "@/integrations/supabase/types";

type EnrollmentStatus = Database["public"]["Enums"]["enrollment_status"];
type PaymentStatus = Database["public"]["Enums"]["payment_status"];

type OriginFilter = "Todos" | "manual" | "import";
type PeriodFilter = "Todos" | "today" | "7days" | "30days";

interface ScholarData {
  userId: string;
  fullName: string | null;
  email: string | null;
  cpf: string | null;
  phone: string | null;
  isActive: boolean;
  projectTitle: string | null;
  projectCode: string | null;
  modality: string | null;
  enrollmentStatus: EnrollmentStatus | null;
  enrollmentId: string | null;
  pendingReports: number;
  pendingPayments: number;
  origin: string | null;
  createdAt: string;
}

const enrollmentStatusConfig: Record<EnrollmentStatus, { label: string; className: string }> = {
  active: { label: "Ativo", className: "bg-success/10 text-success" },
  suspended: { label: "Suspenso", className: "bg-warning/10 text-warning" },
  completed: { label: "Concluído", className: "bg-info/10 text-info" },
  cancelled: { label: "Cancelado", className: "bg-destructive/10 text-destructive" },
};

const originLabels: Record<string, string> = {
  manual: "Manual",
  import: "Importação",
};

const periodLabels: Record<PeriodFilter, string> = {
  Todos: "Todos os períodos",
  today: "Importados hoje",
  "7days": "Últimos 7 dias",
  "30days": "Últimos 30 dias",
};

function StatusBadge({ status, config }: { status: string; config: { label: string; className: string } }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", config.className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {config.label}
    </span>
  );
}

export function ScholarsTableFiltered() {
  const navigate = useNavigate();
  const { hasManagerAccess, isAdmin } = useUserRole();
  const { isAdminMasterMode } = useAdminMasterMode();
  const [scholars, setScholars] = useState<ScholarData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [modalityFilter, setModalityFilter] = useState("Todos");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [originFilter, setOriginFilter] = useState<OriginFilter>("Todos");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("Todos");
  const [adminEditDialogOpen, setAdminEditDialogOpen] = useState(false);
  const [selectedScholarForEdit, setSelectedScholarForEdit] = useState<ScholarData | null>(null);

  const fetchScholars = async () => {
    setLoading(true);
    try {
      // Fetch profiles that are scholars (have role = scholar)
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "scholar");

      if (rolesError) throw rolesError;

      const scholarUserIds = rolesData?.map(r => r.user_id) || [];
      
      if (scholarUserIds.length === 0) {
        setScholars([]);
        setLoading(false);
        return;
      }

      // Fetch profiles for scholars
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, cpf, phone, is_active, origin, created_at")
        .in("user_id", scholarUserIds);

      if (profilesError) throw profilesError;

      // Fetch enrollments with project info
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from("enrollments")
        .select(`
          id,
          user_id,
          status,
          modality,
          project_id,
          projects (
            title,
            code
          )
        `)
        .in("user_id", scholarUserIds);

      if (enrollmentsError) throw enrollmentsError;

      // Fetch pending reports count
      const { data: reports, error: reportsError } = await supabase
        .from("reports")
        .select("user_id, status")
        .in("user_id", scholarUserIds)
        .eq("status", "under_review");

      if (reportsError) throw reportsError;

      // Fetch pending payments count
      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select("user_id, status")
        .in("user_id", scholarUserIds)
        .eq("status", "pending");

      if (paymentsError) throw paymentsError;

      // Build lookup maps
      const pendingReportsMap = new Map<string, number>();
      reports?.forEach(r => {
        pendingReportsMap.set(r.user_id, (pendingReportsMap.get(r.user_id) || 0) + 1);
      });

      const pendingPaymentsMap = new Map<string, number>();
      payments?.forEach(p => {
        pendingPaymentsMap.set(p.user_id, (pendingPaymentsMap.get(p.user_id) || 0) + 1);
      });

      // Map enrollments by user_id (get most recent or active one)
      const enrollmentMap = new Map<string, typeof enrollments[0]>();
      enrollments?.forEach(e => {
        const existing = enrollmentMap.get(e.user_id);
        if (!existing || e.status === "active") {
          enrollmentMap.set(e.user_id, e);
        }
      });

      // Build scholar data
      const scholarData: ScholarData[] = (profiles || []).map(profile => {
        const enrollment = enrollmentMap.get(profile.user_id);
        const project = enrollment?.projects as { title: string; code: string } | null;
        
        return {
          userId: profile.user_id,
          fullName: profile.full_name,
          email: profile.email,
          cpf: profile.cpf,
          phone: profile.phone,
          isActive: profile.is_active,
          projectTitle: project?.title || null,
          projectCode: project?.code || null,
          modality: enrollment?.modality || null,
          enrollmentStatus: enrollment?.status || null,
          enrollmentId: enrollment?.id || null,
          pendingReports: pendingReportsMap.get(profile.user_id) || 0,
          pendingPayments: pendingPaymentsMap.get(profile.user_id) || 0,
          origin: profile.origin || 'manual',
          createdAt: profile.created_at,
        };
      });

      setScholars(scholarData);
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Error fetching scholars:", error);
      toast.error("Erro ao carregar bolsistas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScholars();
  }, []);

  const filteredScholars = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000);

    return scholars.filter((scholar) => {
      const matchesSearch = 
        !searchTerm ||
        scholar.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        scholar.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        scholar.cpf?.includes(searchTerm);
      
      const matchesStatus = 
        statusFilter === "Todos" ||
        (statusFilter === "Ativo" && scholar.enrollmentStatus === "active") ||
        (statusFilter === "Suspenso" && scholar.enrollmentStatus === "suspended") ||
        (statusFilter === "Concluído" && scholar.enrollmentStatus === "completed") ||
        (statusFilter === "Cancelado" && scholar.enrollmentStatus === "cancelled") ||
        (statusFilter === "Sem Vínculo" && !scholar.enrollmentStatus) ||
        (statusFilter === "Desativado" && !scholar.isActive);
      
      const matchesModality = 
        modalityFilter === "Todos" ||
        scholar.modality === modalityFilter;
      
      const matchesOrigin = 
        originFilter === "Todos" ||
        scholar.origin === originFilter;
      
      // Period filter logic
      let matchesPeriod = true;
      if (periodFilter !== "Todos" && scholar.createdAt) {
        const createdDate = new Date(scholar.createdAt);
        switch (periodFilter) {
          case "today":
            matchesPeriod = createdDate >= todayStart;
            break;
          case "7days":
            matchesPeriod = createdDate >= sevenDaysAgo;
            break;
          case "30days":
            matchesPeriod = createdDate >= thirtyDaysAgo;
            break;
        }
      }
      
      return matchesSearch && matchesStatus && matchesModality && matchesOrigin && matchesPeriod;
    });
  }, [scholars, searchTerm, statusFilter, modalityFilter, originFilter, periodFilter]);

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("Todos");
    setModalityFilter("Todos");
    setOriginFilter("Todos");
    setPeriodFilter("Todos");
  };

  const hasActiveFilters = searchTerm || statusFilter !== "Todos" || modalityFilter !== "Todos" || originFilter !== "Todos" || periodFilter !== "Todos";

  // Selection logic
  const allFilteredSelected = filteredScholars.length > 0 && filteredScholars.every(s => selectedIds.has(s.userId));
  const someFilteredSelected = filteredScholars.some(s => selectedIds.has(s.userId));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      const newSelected = new Set(selectedIds);
      filteredScholars.forEach(s => newSelected.delete(s.userId));
      setSelectedIds(newSelected);
    } else {
      const newSelected = new Set(selectedIds);
      filteredScholars.forEach(s => newSelected.add(s.userId));
      setSelectedIds(newSelected);
    }
  };

  const toggleSelectOne = (userId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkRemove = () => {
    setBulkDialogOpen(true);
  };

  const handleBulkDeactivate = async () => {
    const userIds = Array.from(selectedIds);
    try {
      const { data, error } = await supabase.functions.invoke("manage-users", {
        body: { action: "deactivate", userIds },
      });

      if (error) {
        const refCode = `ERR-${Date.now().toString(36).toUpperCase()}`;
        console.error("[BULK_DEACTIVATE_ERROR]", { error, refCode });
        toast.error("Erro ao desativar usuários", {
          description: `${error.message}. Código: ${refCode}`,
          duration: 10000,
        });
        return;
      }

      if (data?.results) {
        const successCount = data.results.success?.length || 0;
        const failedCount = data.results.failed?.length || 0;
        
        if (successCount > 0) {
          toast.success(`${successCount} usuário(s) desativado(s)`);
        }
        if (failedCount > 0) {
          toast.warning(`${failedCount} usuário(s) não puderam ser desativados`);
        }
      }

      setSelectedIds(new Set());
      fetchScholars();
    } catch (error: any) {
      const refCode = `ERR-${Date.now().toString(36).toUpperCase()}`;
      console.error("[BULK_DEACTIVATE_ERROR]", { error, refCode });
      toast.error("Erro inesperado", {
        description: `Código: ${refCode}`,
        duration: 10000,
      });
    }
  };

  const cancelSelection = () => {
    setSelectedIds(new Set());
  };

  const selectedCount = selectedIds.size;
  const getInitials = (name: string | null) => {
    if (!name) return "??";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  // Get unique modalities from scholars
  const modalities = useMemo(() => {
    const modalitySet = new Set(scholars.map(s => s.modality).filter(Boolean));
    return Array.from(modalitySet) as string[];
  }, [scholars]);

  if (!hasManagerAccess) {
    return null;
  }

  return (
    <div className="card-institutional overflow-hidden p-0">
      {/* Header */}
      <div className="p-5 border-b border-border">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Bolsistas</h3>
            <p className="text-sm text-muted-foreground">
              {filteredScholars.length} de {scholars.length} bolsistas
              {selectedCount > 0 && (
                <span className="ml-2 text-primary font-medium">
                  • {selectedCount} selecionado(s)
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchScholars}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              Atualizar
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Limpar filtros
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="Todos">Todos</SelectItem>
              <SelectItem value="Ativo">Ativo</SelectItem>
              <SelectItem value="Suspenso">Suspenso</SelectItem>
              <SelectItem value="Concluído">Concluído</SelectItem>
              <SelectItem value="Cancelado">Cancelado</SelectItem>
              <SelectItem value="Sem Vínculo">Sem Vínculo</SelectItem>
              <SelectItem value="Desativado">Desativado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={modalityFilter} onValueChange={setModalityFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Modalidade" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="Todos">Todas Modalidades</SelectItem>
              {modalities.map((modality) => (
                <SelectItem key={modality} value={modality}>
                  {getModalityLabel(modality)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={originFilter} onValueChange={(v) => setOriginFilter(v as OriginFilter)}>
            <SelectTrigger className="w-[160px]">
              <Upload className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="Todos">Todas Origens</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="import">Importação</SelectItem>
            </SelectContent>
          </Select>

          <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="Todos">Todos os períodos</SelectItem>
              <SelectItem value="today">Importados hoje</SelectItem>
              <SelectItem value="7days">Últimos 7 dias</SelectItem>
              <SelectItem value="30days">Últimos 30 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedCount > 0 && (
        <div className="px-5 py-3 bg-primary/5 border-b border-primary/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="gap-1">
              {selectedCount} selecionado(s)
            </Badge>
            <span className="text-sm text-muted-foreground">
              Ações em massa:
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkRemove}
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Remover
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkDeactivate}
              className="gap-2 border-warning text-warning hover:bg-warning/10"
            >
              <UserX className="w-4 h-4" />
              Desativar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={cancelSelection}
              className="gap-2"
            >
              <X className="w-4 h-4" />
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Carregando bolsistas...</span>
          </div>
        ) : (
          <table className="table-institutional">
            <thead>
              <tr>
                <th className="w-12">
                  <button
                    onClick={toggleSelectAll}
                    className="p-1 rounded hover:bg-muted transition-colors"
                    title={allFilteredSelected ? "Desmarcar todos" : "Selecionar todos"}
                  >
                    {allFilteredSelected ? (
                      <CheckSquare className="w-5 h-5 text-primary" />
                    ) : someFilteredSelected ? (
                      <div className="w-5 h-5 border-2 border-primary rounded flex items-center justify-center">
                        <div className="w-2.5 h-0.5 bg-primary" />
                      </div>
                    ) : (
                      <Square className="w-5 h-5 text-muted-foreground" />
                    )}
                  </button>
                </th>
                <th>Bolsista</th>
                <th>Projeto</th>
                <th>Modalidade</th>
                <th>Status</th>
                <th>Pendências</th>
                <th className="w-12">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredScholars.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">
                    {scholars.length === 0 
                      ? "Nenhum bolsista cadastrado. Importe bolsistas via planilha."
                      : "Nenhum bolsista encontrado com os filtros selecionados."
                    }
                  </td>
                </tr>
              ) : (
                filteredScholars.map((scholar) => {
                  const isSelected = selectedIds.has(scholar.userId);
                  return (
                    <tr 
                      key={scholar.userId}
                      className={cn(
                        isSelected && "bg-primary/5",
                        !scholar.isActive && "opacity-60"
                      )}
                    >
                      <td>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectOne(scholar.userId)}
                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-medium text-primary">
                              {getInitials(scholar.fullName)}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-foreground block">
                              {scholar.fullName || "Sem nome"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {scholar.email}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="text-muted-foreground">
                        {scholar.projectTitle ? (
                          <div>
                            <span className="block">{scholar.projectTitle}</span>
                            {scholar.projectCode && (
                              <span className="text-xs opacity-70">{scholar.projectCode}</span>
                            )}
                          </div>
                        ) : (
                          <span className="italic">Sem projeto</span>
                        )}
                      </td>
                      <td className="text-muted-foreground">
                        {scholar.modality ? getModalityLabel(scholar.modality) : "—"}
                      </td>
                      <td>
                        {!scholar.isActive ? (
                          <Badge variant="destructive" className="gap-1">
                            <UserX className="w-3 h-3" />
                            Desativado
                          </Badge>
                        ) : scholar.enrollmentStatus ? (
                          <StatusBadge 
                            status={scholar.enrollmentStatus} 
                            config={enrollmentStatusConfig[scholar.enrollmentStatus]} 
                          />
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Sem Vínculo
                          </Badge>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          {scholar.pendingReports > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {scholar.pendingReports} relatório(s)
                            </Badge>
                          )}
                          {scholar.pendingPayments > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {scholar.pendingPayments} pagamento(s)
                            </Badge>
                          )}
                          {scholar.pendingReports === 0 && scholar.pendingPayments === 0 && (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1.5 rounded hover:bg-muted transition-colors">
                              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover">
                            <DropdownMenuItem 
                              className="gap-2"
                              onClick={() => navigate(`/admin/bolsista/${scholar.userId}`)}
                            >
                              <Eye className="w-4 h-4" />
                              Ver perfil
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="gap-2"
                              onClick={() => navigate(`/admin/bolsista/${scholar.userId}`)}
                            >
                              <Edit className="w-4 h-4" />
                              Editar
                            </DropdownMenuItem>
                            {isAdmin && isAdminMasterMode && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="gap-2 text-destructive focus:text-destructive"
                                  onClick={() => {
                                    setSelectedScholarForEdit(scholar);
                                    setAdminEditDialogOpen(true);
                                  }}
                                >
                                  <ShieldAlert className="w-4 h-4" />
                                  Editar Perfil (Admin)
                                </DropdownMenuItem>
                              </>
                            )}
                            {isAdmin && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="gap-2 text-destructive focus:text-destructive"
                                  onClick={() => {
                                    setSelectedIds(new Set([scholar.userId]));
                                    setBulkDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Remover
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Bulk Removal Dialog */}
      <BulkRemovalDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        selectedUserIds={Array.from(selectedIds)}
        onComplete={() => {
          setSelectedIds(new Set());
          fetchScholars();
        }}
      />

      {/* Admin Edit Scholar Dialog */}
      <AdminEditScholarDialog
        open={adminEditDialogOpen}
        onOpenChange={setAdminEditDialogOpen}
        scholar={selectedScholarForEdit}
        onSuccess={fetchScholars}
      />
    </div>
  );
}
