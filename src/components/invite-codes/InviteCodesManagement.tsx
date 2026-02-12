import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  Ticket, 
  Plus, 
  Copy, 
  Eye, 
  Power, 
  RefreshCw, 
  Trash2,
  MoreHorizontal,
  ShieldAlert,
  Info,
  CheckCircle2,
  Edit
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useAdminMasterMode } from '@/contexts/AdminMasterModeContext';
import { useUserRole } from '@/hooks/useUserRole';
import { CreateInviteCodeDialog } from './CreateInviteCodeDialog';
import { EditInviteCodeDialog } from './EditInviteCodeDialog';
import { InviteCodeDetailsDialog } from './InviteCodeDetailsDialog';
import { CriticalActionDialog } from '@/components/admin/CriticalActionDialog';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

type InviteCodeStatus = 'active' | 'disabled' | 'expired' | 'exhausted';

interface InviteCode {
  id: string;
  thematic_project_id: string;
  partner_company_id: string;
  code: string;
  status: InviteCodeStatus;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  created_by: string;
  created_at: string;
}

interface ThematicProject {
  id: string;
  title: string;
  sponsor_name: string;
}

export function InviteCodesManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<InviteCodeStatus | 'all'>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState<InviteCode | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [codeToEdit, setCodeToEdit] = useState<InviteCode | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [codeToDelete, setCodeToDelete] = useState<InviteCode | null>(null);
  
  const { isAdminMasterMode } = useAdminMasterMode();
  const { isAdmin } = useUserRole();
  const { currentOrganization } = useOrganizationContext();

  // Fetch invite codes filtered by organization
  const { data: inviteCodes, isLoading, refetch } = useQuery({
    queryKey: ['invite-codes', statusFilter, projectFilter, currentOrganization?.id],
    queryFn: async () => {
      let query = supabase
        .from('invite_codes')
        .select('*')
        .order('created_at', { ascending: false });

      // Filter by current organization
      if (currentOrganization?.id) {
        query = query.eq('organization_id', currentOrganization.id);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (projectFilter !== 'all') {
        query = query.eq('thematic_project_id', projectFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as InviteCode[];
    },
  });

  // Fetch thematic projects for filters and references (filtered by organization)
  const { data: thematicProjects } = useQuery({
    queryKey: ['thematic-projects-for-invite-codes', currentOrganization?.id],
    queryFn: async () => {
      let query = supabase
        .from('thematic_projects')
        .select('id, title, sponsor_name')
        .eq('status', 'active')
        .order('title');

      if (currentOrganization?.id) {
        query = query.eq('organization_id', currentOrganization.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ThematicProject[];
    },
  });

  // Fetch creator emails
  const { data: creatorEmails } = useQuery({
    queryKey: ['invite-code-creators', inviteCodes?.map(c => c.created_by)],
    enabled: !!inviteCodes?.length,
    queryFn: async () => {
      if (!inviteCodes?.length) return {};
      
      const creatorIds = [...new Set(inviteCodes.map(c => c.created_by))];
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, email, full_name')
        .in('user_id', creatorIds);

      if (error) throw error;
      
      const emailMap: Record<string, string> = {};
      data?.forEach(p => {
        emailMap[p.user_id] = p.full_name || p.email || 'Desconhecido';
      });
      return emailMap;
    },
  });

  const getThematicProjectInfo = (projectId: string) => {
    return thematicProjects?.find(p => p.id === projectId);
  };

  const filteredCodes = inviteCodes?.filter(code => {
    const searchLower = searchTerm.toLowerCase();
    const project = getThematicProjectInfo(code.thematic_project_id);
    return (
      code.code.toLowerCase().includes(searchLower) ||
      project?.title.toLowerCase().includes(searchLower) ||
      project?.sponsor_name.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (status: InviteCodeStatus) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-success text-success-foreground">Ativo</Badge>;
      case 'disabled':
        return <Badge variant="secondary">Desativado</Badge>;
      case 'expired':
        return <Badge variant="outline" className="border-amber-500 text-amber-600">Expirado</Badge>;
      case 'exhausted':
        return <Badge variant="outline" className="border-muted-foreground">Esgotado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleCopyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    toast.success('Código copiado!', {
      description: code,
    });
  };

  const handleToggleStatus = async (code: InviteCode) => {
    const newStatus = code.status === 'active' ? 'disabled' : 'active';
    
    const { error } = await supabase
      .from('invite_codes')
      .update({ status: newStatus })
      .eq('id', code.id);

    if (error) {
      toast.error('Erro ao atualizar status', { description: error.message });
      return;
    }

    // Log audit
    await supabase.rpc('insert_audit_log', {
      p_action: newStatus === 'active' ? 'ENABLE_INVITE_CODE' : 'DISABLE_INVITE_CODE',
      p_entity_type: 'invite_code',
      p_entity_id: code.id,
      p_details: { code: code.code, new_status: newStatus },
      p_previous_value: { status: code.status },
      p_new_value: { status: newStatus },
    });

    toast.success(`Código ${newStatus === 'active' ? 'ativado' : 'desativado'}`);
    refetch();
  };

  const handleViewDetails = (code: InviteCode) => {
    setSelectedCode(code);
    setDetailsDialogOpen(true);
  };

  const handleEditCode = (code: InviteCode) => {
    setCodeToEdit(code);
    setEditDialogOpen(true);
  };

  const handleRegenerateCode = async (code: InviteCode) => {
    const newCode = generateInviteCode();
    
    const { error } = await supabase
      .from('invite_codes')
      .update({ code: newCode, status: 'active', used_count: 0 })
      .eq('id', code.id);

    if (error) {
      toast.error('Erro ao regenerar código', { description: error.message });
      return;
    }

    // Log audit
    await supabase.rpc('insert_audit_log', {
      p_action: 'REGENERATE_INVITE_CODE',
      p_entity_type: 'invite_code',
      p_entity_id: code.id,
      p_details: { old_code: code.code, new_code: newCode },
      p_previous_value: { code: code.code, status: code.status, used_count: code.used_count },
      p_new_value: { code: newCode, status: 'active', used_count: 0 },
    });

    toast.success('Código regenerado!', { description: newCode });
    refetch();
  };

  const handleDeleteCode = async () => {
    if (!codeToDelete) return;

    const { error } = await supabase
      .from('invite_codes')
      .delete()
      .eq('id', codeToDelete.id);

    if (error) {
      toast.error('Erro ao excluir código', { description: error.message });
      return;
    }

    // Log audit
    await supabase.rpc('insert_audit_log', {
      p_action: 'DELETE_INVITE_CODE',
      p_entity_type: 'invite_code',
      p_entity_id: codeToDelete.id,
      p_details: { code: codeToDelete.code },
      p_previous_value: { 
        id: codeToDelete.id,
        code: codeToDelete.code,
        status: codeToDelete.status,
        used_count: codeToDelete.used_count,
      },
    });

    toast.success('Código excluído');
    setCodeToDelete(null);
    refetch();
  };

  const openDeleteDialog = (code: InviteCode) => {
    setCodeToDelete(code);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Ticket className="h-6 w-6 text-primary" />
            Códigos de Convite
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie códigos de acesso ao Projeto Temático para autorização de novos bolsistas.
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Gerar Código
        </Button>
      </div>

      {/* Info Card */}
      <Alert className="border-primary/20 bg-primary/5">
        <Info className="h-4 w-4 text-primary" />
        <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-sm">
            Códigos de convite autorizam novos bolsistas a se cadastrar no Portal. 
            Envie apenas para pessoas autorizadas — usuários não autorizados podem ser excluídos.
          </span>
          {isAdminMasterMode && (
            <Badge variant="outline" className="border-amber-500 text-amber-600 gap-1 shrink-0">
              <ShieldAlert className="h-3 w-3" />
              Modo Administrador Master
            </Badge>
          )}
        </AlertDescription>
      </Alert>

      {/* Main Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            Códigos Cadastrados
          </CardTitle>
          <CardDescription>
            {filteredCodes?.length ?? 0} código(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por projeto, empresa ou código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as InviteCodeStatus | 'all')}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="disabled">Desativado</SelectItem>
                  <SelectItem value="expired">Expirado</SelectItem>
                  <SelectItem value="exhausted">Esgotado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table */}
          <ScrollArea className="h-[500px] rounded-lg border">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Usos</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Criado por</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredCodes?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <Ticket className="h-12 w-12 opacity-30" />
                        <div>
                          <p className="font-medium">Nenhum código criado ainda.</p>
                          <p className="text-sm">Clique em "Gerar Código" para começar.</p>
                        </div>
                        <Button 
                          variant="outline" 
                          onClick={() => setCreateDialogOpen(true)}
                          className="mt-2 gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Gerar Código
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCodes?.map((code) => {
                    return (
                      <TableRow key={code.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                              {code.code}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleCopyCode(code.code)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(code.status as InviteCodeStatus)}</TableCell>
                        <TableCell>
                          {code.max_uses 
                            ? `${code.used_count}/${code.max_uses}` 
                            : <span className="text-muted-foreground">Ilimitado</span>
                          }
                        </TableCell>
                        <TableCell>
                          {code.expires_at 
                            ? format(new Date(code.expires_at), 'dd/MM/yyyy', { locale: ptBR })
                            : <span className="text-muted-foreground">Sem validade</span>
                          }
                        </TableCell>
                        <TableCell className="text-sm">
                          {creatorEmails?.[code.created_by] || '—'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(code.created_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleCopyCode(code.code)}>
                                <Copy className="h-4 w-4 mr-2" />
                                Copiar código
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleViewDetails(code)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Ver detalhes
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditCode(code)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar limite de usos
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleStatus(code)}>
                                <Power className="h-4 w-4 mr-2" />
                                {code.status === 'active' ? 'Desativar' : 'Ativar'}
                              </DropdownMenuItem>
                              
                              {isAdmin && isAdminMasterMode && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleRegenerateCode(code)}>
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Regenerar código
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => openDeleteDialog(code)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Excluir
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CreateInviteCodeDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={refetch}
      />

      {selectedCode && (
        <InviteCodeDetailsDialog
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
          inviteCode={selectedCode}
          project={getThematicProjectInfo(selectedCode.thematic_project_id)}
        />
      )}

      {codeToEdit && (
        <EditInviteCodeDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          inviteCode={codeToEdit}
          onSuccess={refetch}
        />
      )}

      <CriticalActionDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Excluir Código de Convite"
        description={`Esta ação é irreversível. O código "${codeToDelete?.code}" será permanentemente excluído e não poderá mais ser utilizado para novos cadastros.`}
        confirmText="Excluir Código"
        confirmationWord="EXCLUIR"
        onConfirm={handleDeleteCode}
        variant="destructive"
      />
    </div>
  );
}

// Utility function to generate invite codes
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'SC-';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
