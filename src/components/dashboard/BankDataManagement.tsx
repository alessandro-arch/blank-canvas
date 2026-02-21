import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SecurityBadge } from '@/components/ui/SecurityBadge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAuditLog } from '@/hooks/useAuditLog';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useBankDataSecureRead, SecureBankResponse } from '@/hooks/useBankDataSecureRead';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { 
  Search, 
  Landmark, 
  CheckCircle, 
  Clock,
  AlertCircle,
  XCircle,
  RotateCcw,
  FileCheck,
  Info,
  RefreshCw,
  Filter,
  Building2,
  UserX,
} from 'lucide-react';

import { BankDataThematicCard } from './BankDataThematicCard';

type BankValidationStatus = 'pending' | 'under_review' | 'validated' | 'returned';

interface BankAccountWithProfile {
  id: string;
  user_id: string;
  bank_name: string;
  bank_code: string;
  agency: string;
  account_number: string;
  account_type: string | null;
  pix_key_masked: string | null;
  pix_key_type: string | null;
  validation_status: BankValidationStatus;
  locked_for_edit: boolean;
  validated_by: string | null;
  validated_at: string | null;
  notes_gestor: string | null;
  created_at: string;
  updated_at: string;
  profile: {
    full_name: string | null;
    email: string | null;
  } | null;
  thematic_project_id: string;
  thematic_project_title: string;
}

interface ThematicBankDataGroup {
  id: string;
  title: string;
  sponsor_name: string;
  status: string;
  accounts: BankAccountWithProfile[];
}

const STATUS_CONFIG = {
  pending: {
    label: 'Pendente',
    variant: 'outline' as const,
    icon: Clock,
    color: 'text-muted-foreground',
  },
  under_review: {
    label: 'Em Análise',
    variant: 'secondary' as const,
    icon: Clock,
    color: 'text-info',
  },
  validated: {
    label: 'Validado',
    variant: 'default' as const,
    icon: CheckCircle,
    color: 'text-success',
  },
  returned: {
    label: 'Devolvido',
    variant: 'destructive' as const,
    icon: XCircle,
    color: 'text-destructive',
  },
};

export function BankDataManagement() {
  const { user } = useAuth();
  const { logAction } = useAuditLog();
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganizationContext();
  const { readBankData, loading: secureBankLoading } = useBankDataSecureRead();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sponsorFilter, setSponsorFilter] = useState<string>('all');
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [revealedData, setRevealedData] = useState<Map<string, SecureBankResponse>>(new Map());
  const [selectedAccount, setSelectedAccount] = useState<BankAccountWithProfile | null>(null);
  const [selectedAccountSecure, setSelectedAccountSecure] = useState<SecureBankResponse | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [gestorNotes, setGestorNotes] = useState('');

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['bank-accounts-management'],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      // Fetch thematic projects
      const { data: thematicProjects, error: thematicError } = await supabase
        .from('thematic_projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (thematicError) throw thematicError;

      // Fetch bank accounts
      const { data: accounts, error: accountsError } = await supabase
        .from('bank_accounts')
        .select('*')
        .order('updated_at', { ascending: false });

      if (accountsError) throw accountsError;

      // Fetch ALL active enrollments to find scholars without bank data
      const { data: allActiveEnrollments } = await supabase
        .from('enrollments')
        .select(`
          user_id,
          project:projects(thematic_project_id)
        `)
        .eq('status', 'active');

      const allActiveUserIds = [...new Set(allActiveEnrollments?.map(e => e.user_id) || [])];
      const accountUserIds = new Set(accounts?.map(a => a.user_id) || []);
      const missingBankDataUserIds = allActiveUserIds.filter(uid => !accountUserIds.has(uid));

      // Fetch profiles for missing users
      let missingScholars: { user_id: string; full_name: string | null; email: string | null; thematic_project_title: string }[] = [];
      if (missingBankDataUserIds.length > 0) {
        const { data: missingProfiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', missingBankDataUserIds);

        const missingEnrollmentMap = new Map<string, string>();
        allActiveEnrollments?.forEach(e => {
          const project = e.project as { thematic_project_id: string } | null;
          if (project?.thematic_project_id) {
            missingEnrollmentMap.set(e.user_id, project.thematic_project_id);
          }
        });

        const thematicMapTemp = new Map((thematicProjects || []).map(tp => [tp.id, tp.title]));

        missingScholars = (missingProfiles || []).map(p => ({
          user_id: p.user_id,
          full_name: p.full_name,
          email: p.email,
          thematic_project_title: thematicMapTemp.get(missingEnrollmentMap.get(p.user_id) || '') || 'Não vinculado',
        }));
      }

      const userIds = accounts?.map(a => a.user_id) || [];
      if (userIds.length === 0) return { thematicProjects: thematicProjects || [], accounts: [], missingScholars };

      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, thematic_project_id')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Fetch enrollments to get thematic project info
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select(`
          user_id,
          project:projects(thematic_project_id)
        `)
        .in('user_id', userIds)
        .eq('status', 'active');

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]));
      const enrollmentMap = new Map(
        enrollments?.map(e => {
          const project = e.project as { thematic_project_id: string } | null;
          return [e.user_id, project?.thematic_project_id || ''];
        })
      );
      const thematicMap = new Map(
        (thematicProjects || []).map(tp => [tp.id, tp])
      );
      
      const enrichedAccounts: BankAccountWithProfile[] = accounts?.map(account => {
        const profile = profileMap.get(account.user_id);
        // First try enrollment, then profile thematic_project_id
        const thematicProjectId = enrollmentMap.get(account.user_id) || profile?.thematic_project_id || '';
        const thematicProject = thematicMap.get(thematicProjectId);
        
        return {
          ...account,
          profile: profile || null,
          thematic_project_id: thematicProjectId,
          thematic_project_title: thematicProject?.title || 'Não vinculado',
        };
      }) || [];

      return { thematicProjects: thematicProjects || [], accounts: enrichedAccounts, missingScholars };
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ 
      accountId, 
      newStatus, 
      notes 
    }: { 
      accountId: string; 
      newStatus: BankValidationStatus; 
      notes?: string;
    }) => {
      const updateData: Record<string, unknown> = {
        validation_status: newStatus,
        notes_gestor: notes || null,
      };

      if (newStatus === 'under_review' || newStatus === 'validated') {
        updateData.locked_for_edit = true;
      } else if (newStatus === 'returned') {
        updateData.locked_for_edit = false;
      }

      if (newStatus === 'validated') {
        updateData.validated_by = user?.id;
        updateData.validated_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('bank_accounts')
        .update(updateData)
        .eq('id', accountId);

      if (error) throw error;

      return { accountId, newStatus, notes };
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts-management'] });
      
      const actionMap: Record<string, 'bank_data_under_review' | 'bank_data_validated' | 'bank_data_returned'> = {
        under_review: 'bank_data_under_review',
        validated: 'bank_data_validated',
        returned: 'bank_data_returned',
      };
      
      const auditAction = actionMap[data.newStatus];
      if (auditAction) {
        await logAction({
          action: auditAction,
          entityType: 'bank_account',
          entityId: data.accountId,
          details: { notes: data.notes },
        });
      }

      const messages = {
        under_review: 'Dados em análise. Edição bloqueada para o bolsista.',
        validated: 'Dados bancários validados com sucesso.',
        returned: 'Dados devolvidos. Bolsista poderá corrigir.',
      };

      toast({
        title: 'Status atualizado',
        description: messages[data.newStatus as keyof typeof messages] || 'Status atualizado com sucesso.',
      });

      setIsDetailOpen(false);
      setSelectedAccount(null);
      setGestorNotes('');
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status.',
        variant: 'destructive',
      });
      console.error('Error updating status:', error);
    },
  });

  // Get unique sponsors for filter
  const sponsors = useMemo(() => {
    return [...new Set(data?.thematicProjects?.map(p => p.sponsor_name) || [])];
  }, [data?.thematicProjects]);

  // Group accounts by thematic project and apply filters
  const filteredGroups = useMemo(() => {
    if (!data) return [];

    const searchLower = searchTerm.toLowerCase();

    // Filter accounts
    let filteredAccounts = data.accounts.filter(account => {
      const matchesSearch = (
        !searchTerm ||
        account.profile?.full_name?.toLowerCase().includes(searchLower) ||
        account.profile?.email?.toLowerCase().includes(searchLower) ||
        account.bank_name.toLowerCase().includes(searchLower)
      );
      
      const matchesStatus = statusFilter === 'all' || account.validation_status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });

    // Group by thematic project
    const groupedMap = new Map<string, BankAccountWithProfile[]>();
    filteredAccounts.forEach(account => {
      const key = account.thematic_project_id || 'unassigned';
      if (!groupedMap.has(key)) {
        groupedMap.set(key, []);
      }
      groupedMap.get(key)!.push(account);
    });

    // Build groups with thematic project info
    const groups: ThematicBankDataGroup[] = [];
    
    data.thematicProjects.forEach(tp => {
      const accounts = groupedMap.get(tp.id) || [];
      
      // Filter by sponsor
      if (sponsorFilter !== 'all' && tp.sponsor_name !== sponsorFilter) {
        return;
      }
      
      // Only include thematic projects with accounts
      if (accounts.length > 0) {
        groups.push({
          id: tp.id,
          title: tp.title,
          sponsor_name: tp.sponsor_name,
          status: tp.status,
          accounts,
        });
      }
    });

    // Add unassigned accounts group
    const unassigned = groupedMap.get('unassigned') || [];
    if (unassigned.length > 0 && sponsorFilter === 'all') {
      groups.push({
        id: 'unassigned',
        title: 'Bolsistas não vinculados a projetos',
        sponsor_name: '—',
        status: 'active',
        accounts: unassigned,
      });
    }

    return groups;
  }, [data, searchTerm, statusFilter, sponsorFilter]);

  const toggleReveal = async (id: string) => {
    if (revealedIds.has(id)) {
      // Hide
      setRevealedIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      return;
    }

    // Fetch secure data via Edge Function
    if (!currentOrganization?.id) return;
    const account = data?.accounts.find(a => a.id === id);
    if (!account) return;

    const result = await readBankData(currentOrganization.id, account.user_id);
    if (result && result.mode === 'full') {
      setRevealedData(prev => new Map(prev).set(id, result));
      setRevealedIds(prev => new Set(prev).add(id));
    } else {
      toast({
        title: 'Acesso negado',
        description: 'Você não tem permissão para ver dados completos.',
        variant: 'destructive',
      });
    }
  };

  const getAccountTypeLabel = (type: string | null) => {
    switch (type) {
      case 'checking': return 'Corrente';
      case 'savings': return 'Poupança';
      case 'Conta Corrente': return 'Corrente';
      case 'Conta Poupança': return 'Poupança';
      default: return type || '—';
    }
  };

  const openDetails = async (account: BankAccountWithProfile) => {
    setSelectedAccount(account);
    setGestorNotes(account.notes_gestor || '');
    setSelectedAccountSecure(null);
    setIsDetailOpen(true);

    // Fetch secure data for the detail dialog
    if (currentOrganization?.id) {
      const result = await readBankData(currentOrganization.id, account.user_id);
      if (result) {
        setSelectedAccountSecure(result);
      }
    }
  };

  const handleStatusChange = (newStatus: BankValidationStatus) => {
    if (!selectedAccount) return;
    
    if (newStatus === 'returned' && !gestorNotes.trim()) {
      toast({
        title: 'Observação obrigatória',
        description: 'Informe o motivo da devolução.',
        variant: 'destructive',
      });
      return;
    }

    updateStatusMutation.mutate({
      accountId: selectedAccount.id,
      newStatus,
      notes: gestorNotes,
    });
  };

  // Calculate global stats
  const globalStats = useMemo(() => {
    const allAccounts = data?.accounts || [];
    return {
      pending: allAccounts.filter(a => a.validation_status === 'pending').length,
      underReview: allAccounts.filter(a => a.validation_status === 'under_review').length,
      validated: allAccounts.filter(a => a.validation_status === 'validated').length,
    };
  }, [data?.accounts]);

  return (
    <>
      <SecurityBadge variant="banner" className="mb-4" />
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Landmark className="h-5 w-5" />
                Gestão de Dados Bancários
              </CardTitle>
              <CardDescription>
                {globalStats.pending > 0 || globalStats.underReview > 0
                  ? `${globalStats.pending} pendente(s) • ${globalStats.underReview} em análise • ${globalStats.validated} validado(s)`
                  : "Visualize e valide dados bancários por projeto temático"
                }
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                {globalStats.pending} pendentes
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                {globalStats.underReview} em análise
              </Badge>
              <Badge className="gap-1 bg-success">
                <CheckCircle className="h-3 w-3" />
                {globalStats.validated} validados
              </Badge>
              <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
                <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
                Atualizar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, e-mail, CPF ou banco..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="under_review">Em Análise</SelectItem>
                <SelectItem value="validated">Validado</SelectItem>
                <SelectItem value="returned">Devolvido</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sponsorFilter} onValueChange={setSponsorFilter}>
              <SelectTrigger>
                <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Financiador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os financiadores</SelectItem>
                {sponsors.map(sponsor => (
                  <SelectItem key={sponsor} value={sponsor}>{sponsor}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

           <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>
              Dados sensíveis são mascarados por padrão. Clique no ícone de olho para revelar ou em "Detalhes" para visualizar e validar.
            </span>
          </div>

          {/* Missing bank data indicator */}
          {(data?.missingScholars?.length ?? 0) > 0 && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-warning/10 border border-warning/30 text-sm">
              <UserX className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-foreground">
                  {data!.missingScholars!.length} bolsista(s) com bolsa ativa sem dados bancários cadastrados
                </p>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  {data!.missingScholars!.map(s => (
                    <li key={s.user_id} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-warning flex-shrink-0" />
                      <span className="font-medium text-foreground">{s.full_name || 'Sem nome'}</span>
                      <span className="text-xs">({s.email || '—'})</span>
                      <span className="text-xs italic">— {s.thematic_project_title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          {/* Thematic Project Cards */}
          <div className="space-y-4">
            {isLoading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      <Skeleton className="w-12 h-12 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-6 w-full max-w-lg" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                      <div className="flex gap-6">
                        <Skeleton className="w-16 h-16" />
                        <Skeleton className="w-16 h-16" />
                        <Skeleton className="w-16 h-16" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : filteredGroups.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border rounded-lg">
                <Landmark className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum dado bancário encontrado</p>
              </div>
            ) : (
              filteredGroups.map(group => (
                <BankDataThematicCard
                  key={group.id}
                  group={group}
                  onOpenDetails={openDetails}
                  revealedIds={revealedIds}
                  revealedData={revealedData}
                  onToggleReveal={toggleReveal}
                  secureBankLoading={secureBankLoading}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detail/Validation Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              Validação de Dados Bancários
            </DialogTitle>
            <DialogDescription>
              Revise os dados bancários do bolsista e tome uma ação.
            </DialogDescription>
          </DialogHeader>

          {selectedAccount && (
            <div className="space-y-4">
              {/* Scholar Info */}
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <h4 className="font-semibold text-sm">Dados do Bolsista</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Nome:</span>
                    <p className="font-medium">{selectedAccount.profile?.full_name || '—'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">E-mail:</span>
                    <p className="font-medium">{selectedAccount.profile?.email || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Bank Data */}
              <div className="p-4 rounded-lg border space-y-2">
                <h4 className="font-semibold text-sm">Dados Bancários</h4>
                {secureBankLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ) : selectedAccountSecure ? (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Banco:</span>
                      <p className="font-medium">
                        {selectedAccountSecure.mode === 'full' 
                          ? `${selectedAccountSecure.bank_name} (${selectedAccountSecure.bank_code})`
                          : selectedAccountSecure.masked.bank_name}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tipo:</span>
                      <p className="font-medium">
                        {getAccountTypeLabel(selectedAccountSecure.mode === 'full' 
                          ? selectedAccountSecure.account_type ?? null 
                          : selectedAccountSecure.masked.account_type)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Agência:</span>
                      <p className="font-mono">
                        {selectedAccountSecure.mode === 'full' 
                          ? selectedAccountSecure.agency 
                          : selectedAccountSecure.masked.agency}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Conta:</span>
                      <p className="font-mono">
                        {selectedAccountSecure.mode === 'full' 
                          ? selectedAccountSecure.account_number 
                          : selectedAccountSecure.masked.account_number}
                      </p>
                    </div>
                    {(selectedAccountSecure.masked.pix && selectedAccountSecure.masked.pix !== '***') && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Chave PIX:</span>
                        <p className="font-mono">
                          {selectedAccountSecure.mode === 'full' 
                            ? selectedAccountSecure.pix 
                            : selectedAccountSecure.masked.pix}
                          {selectedAccountSecure.pix_protected && (
                            <span className="ml-2 text-xs text-muted-foreground">(protegida por Vault)</span>
                          )}
                        </p>
                      </div>
                    )}
                    {selectedAccountSecure.mode === 'masked' && (
                      <div className="col-span-2 text-xs text-muted-foreground italic">
                        Dados mascarados. Apenas admin/gestor pode visualizar dados completos.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Banco:</span>
                      <p className="font-medium">{selectedAccount.bank_name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tipo:</span>
                      <p className="font-medium">{getAccountTypeLabel(selectedAccount.account_type)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Agência:</span>
                      <p className="font-mono">****</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Conta:</span>
                      <p className="font-mono">****</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Current Status */}
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
                <Info className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Status atual: <Badge variant={STATUS_CONFIG[selectedAccount.validation_status].variant}>
                    {STATUS_CONFIG[selectedAccount.validation_status].label}
                  </Badge>
                  {selectedAccount.locked_for_edit && (
                    <span className="ml-2 text-muted-foreground">(Edição bloqueada)</span>
                  )}
                </span>
              </div>

              {/* Gestor Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Observações do Gestor
                  {selectedAccount.validation_status !== 'validated' && (
                    <span className="text-muted-foreground font-normal"> (obrigatório para devolver)</span>
                  )}
                </label>
                <Textarea
                  placeholder="Informe observações ou motivo de devolução..."
                  value={gestorNotes}
                  onChange={(e) => setGestorNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {selectedAccount?.validation_status !== 'under_review' && (
              <Button
                variant="secondary"
                onClick={() => handleStatusChange('under_review')}
                disabled={updateStatusMutation.isPending}
                className="gap-2"
              >
                <Clock className="h-4 w-4" />
                Colocar em Análise
              </Button>
            )}
            
            <Button
              variant="outline"
              onClick={() => handleStatusChange('returned')}
              disabled={updateStatusMutation.isPending}
              className="gap-2 text-destructive hover:text-destructive"
            >
              <RotateCcw className="h-4 w-4" />
              Devolver para Correção
            </Button>
            
            <Button
              onClick={() => handleStatusChange('validated')}
              disabled={updateStatusMutation.isPending}
              className="gap-2 bg-success hover:bg-success/90"
            >
              <CheckCircle className="h-4 w-4" />
              Aprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
