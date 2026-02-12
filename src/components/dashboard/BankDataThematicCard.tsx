import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Building2, 
  ChevronDown, 
  Landmark,
  CheckCircle,
  Clock,
  XCircle,
  User,
  Eye,
  EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BankAccountWithProfile {
  id: string;
  user_id: string;
  bank_name: string;
  bank_code: string;
  agency: string;
  account_number: string;
  account_type: string | null;
  pix_key: string | null;
  pix_key_type: string | null;
  validation_status: 'pending' | 'under_review' | 'validated' | 'returned';
  locked_for_edit: boolean;
  validated_by: string | null;
  validated_at: string | null;
  notes_gestor: string | null;
  created_at: string;
  updated_at: string;
  profile: {
    full_name: string | null;
    email: string | null;
    cpf: string | null;
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

interface BankDataThematicCardProps {
  group: ThematicBankDataGroup;
  onOpenDetails: (account: BankAccountWithProfile) => void;
  revealedIds: Set<string>;
  onToggleReveal: (id: string) => void;
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

export function BankDataThematicCard({ 
  group, 
  onOpenDetails, 
  revealedIds, 
  onToggleReveal 
}: BankDataThematicCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Calculate KPIs
  const totalAccounts = group.accounts.length;
  const pendingAccounts = group.accounts.filter(a => a.validation_status === 'pending');
  const underReviewAccounts = group.accounts.filter(a => a.validation_status === 'under_review');
  const validatedAccounts = group.accounts.filter(a => a.validation_status === 'validated');
  const returnedAccounts = group.accounts.filter(a => a.validation_status === 'returned');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-success text-success-foreground">Ativo</Badge>;
      case 'archived':
        return <Badge variant="outline">Arquivado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const maskValue = (value: string, revealed: boolean) => {
    if (revealed) return value;
    if (value.length <= 4) return '****';
    return value.slice(0, 2) + '****' + value.slice(-2);
  };

  const maskCPF = (cpf: string | null, revealed: boolean) => {
    if (!cpf) return '—';
    if (revealed) return cpf;
    return cpf.replace(/(\d{3})\.(\d{3})\.(\d{3})-(\d{2})/, '***.$2.***-**');
  };

  return (
    <Card className="overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="w-12 h-12 rounded-lg bg-info/10 flex items-center justify-center flex-shrink-0">
                <Landmark className="h-6 w-6 text-info" />
              </div>
              
              {/* Main Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {getStatusBadge(group.status)}
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">
                    Projeto Temático
                  </span>
                </div>
                <h3 className="font-semibold text-foreground text-lg leading-tight line-clamp-2">
                  {group.title}
                </h3>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-4 w-4" />
                    <span>{group.sponsor_name}</span>
                  </div>
                </div>
              </div>

              {/* KPIs */}
              <div className="hidden lg:flex items-center gap-6">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                  </div>
                  <p className="text-xl font-semibold text-muted-foreground">{pendingAccounts.length}</p>
                  <p className="text-xs text-muted-foreground">Pendentes</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-info">
                    <Clock className="h-4 w-4" />
                  </div>
                  <p className="text-xl font-semibold text-info">{underReviewAccounts.length}</p>
                  <p className="text-xs text-muted-foreground">Em Análise</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-success">
                    <CheckCircle className="h-4 w-4" />
                  </div>
                  <p className="text-xl font-semibold text-success">{validatedAccounts.length}</p>
                  <p className="text-xs text-muted-foreground">Validados</p>
                </div>
                {returnedAccounts.length > 0 && (
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-destructive">
                      <XCircle className="h-4 w-4" />
                    </div>
                    <p className="text-xl font-semibold text-destructive">{returnedAccounts.length}</p>
                    <p className="text-xs text-muted-foreground">Devolvidos</p>
                  </div>
                )}
                <div className="text-center border-l pl-6">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground">
                    <Landmark className="h-4 w-4" />
                  </div>
                  <p className="text-xl font-semibold text-foreground">{totalAccounts}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>

              {/* Expand Button */}
              <Button variant="ghost" size="icon" className="ml-2">
                <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </Button>
            </div>

            {/* Mobile KPIs */}
            <div className="lg:hidden grid grid-cols-4 gap-2 mt-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-lg font-semibold text-muted-foreground">{pendingAccounts.length}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-info">{underReviewAccounts.length}</p>
                <p className="text-xs text-muted-foreground">Em Análise</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-success">{validatedAccounts.length}</p>
                <p className="text-xs text-muted-foreground">Validados</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold">{totalAccounts}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Summary Stats Bar */}
            <div className="flex flex-wrap gap-4 p-4 bg-muted/30 rounded-lg text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Pendentes:</span>
                <Badge variant="outline">{pendingAccounts.length}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Em Análise:</span>
                <Badge variant="secondary">{underReviewAccounts.length}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Validados:</span>
                <Badge className="bg-success">{validatedAccounts.length}</Badge>
              </div>
              {returnedAccounts.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Devolvidos:</span>
                  <Badge variant="destructive">{returnedAccounts.length}</Badge>
                </div>
              )}
            </div>

            {/* Bank Accounts Table */}
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bolsista</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Banco</TableHead>
                    <TableHead>Agência</TableHead>
                    <TableHead>Conta</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[120px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.accounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhum dado bancário encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    group.accounts.map((account) => {
                      const isRevealed = revealedIds.has(account.id);
                      const statusCfg = STATUS_CONFIG[account.validation_status];
                      const StatusIcon = statusCfg.icon;

                      return (
                        <TableRow key={account.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                <User className="w-4 h-4 text-muted-foreground" />
                              </div>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {account.profile?.full_name || 'Nome não informado'}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {account.profile?.email || '—'}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {maskCPF(account.profile?.cpf || null, isRevealed)}
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{account.bank_name}</span>
                          </TableCell>
                          <TableCell className="font-mono">
                            {maskValue(account.agency, isRevealed)}
                          </TableCell>
                          <TableCell className="font-mono">
                            {maskValue(account.account_number, isRevealed)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusCfg.variant} className="gap-1">
                              <StatusIcon className={`h-3 w-3 ${statusCfg.color}`} />
                              {statusCfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => onToggleReveal(account.id)}
                                    >
                                      {isRevealed ? (
                                        <EyeOff className="h-4 w-4" />
                                      ) : (
                                        <Eye className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {isRevealed ? 'Ocultar dados' : 'Revelar dados'}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onOpenDetails(account)}
                              >
                                Detalhes
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
