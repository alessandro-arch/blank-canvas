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
  Building2, 
  ChevronDown, 
  Users, 
  Briefcase, 
  DollarSign,
  FileText,
  AlertCircle,
  Clock
} from 'lucide-react';
import { SubprojectsTable } from './SubprojectsTable';
import type { ThematicProjectWithStats, SubprojectWithScholar } from './types';

interface ThematicProjectCardProps {
  project: ThematicProjectWithStats;
  subprojects: SubprojectWithScholar[];
  selectedMonth: string;
  onRefresh: () => void;
}

export function ThematicProjectCard({ 
  project, 
  subprojects,
  selectedMonth,
  onRefresh 
}: ThematicProjectCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-success text-success-foreground">Ativo</Badge>;
      case 'archived':
        return <Badge variant="outline">Arquivado</Badge>;
      case 'closed':
        return <Badge variant="secondary">Encerrado</Badge>;
      case 'paused':
        return <Badge variant="secondary">Pausado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Calculate KPIs
  const activeSubprojects = subprojects.filter(s => s.status === 'active').length;
  const assignedScholars = subprojects.filter(s => s.scholar_name).length;
  const awaitingAssignment = subprojects.filter(s => !s.scholar_name && s.status === 'active').length;
  const totalMonthlyValue = subprojects
    .filter(s => s.status === 'active')
    .reduce((sum, s) => sum + (s.valor_mensal || 0), 0);
  
  // Report and payment stats from subprojects
  const pendingReports = subprojects.reduce((sum, s) => sum + (s.pending_reports || 0), 0);
  const blockedPayments = subprojects.reduce((sum, s) => sum + (s.blocked_payments || 0), 0);
  const releasedPayments = subprojects
    .filter(s => s.status === 'active')
    .reduce((sum, s) => sum + (s.released_amount || 0), 0);

  return (
    <Card className="overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-start gap-4">
              {/* Icon and Status */}
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              
              {/* Main Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {getStatusBadge(project.status)}
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">
                    Projeto Temático
                  </span>
                </div>
                <h3 className="font-semibold text-foreground text-lg leading-tight line-clamp-2">
                  {project.title}
                </h3>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-4 w-4" />
                    <span>{project.sponsor_name}</span>
                  </div>
                </div>
              </div>

              {/* KPIs */}
              <div className="hidden lg:flex items-center gap-6">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground">
                    <Briefcase className="h-4 w-4" />
                  </div>
                  <p className="text-xl font-semibold text-foreground">{activeSubprojects}</p>
                  <p className="text-xs text-muted-foreground">Subprojetos</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground">
                    <Users className="h-4 w-4" />
                  </div>
                  <p className="text-xl font-semibold text-foreground">{assignedScholars}</p>
                  <p className="text-xs text-muted-foreground">Bolsistas</p>
                </div>
                {awaitingAssignment > 0 && (
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-warning">
                      <Clock className="h-4 w-4" />
                    </div>
                    <p className="text-xl font-semibold text-warning">{awaitingAssignment}</p>
                    <p className="text-xs text-muted-foreground">Aguardando</p>
                  </div>
                )}
                {pendingReports > 0 && (
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-warning">
                      <FileText className="h-4 w-4" />
                    </div>
                    <p className="text-xl font-semibold text-warning">{pendingReports}</p>
                    <p className="text-xs text-muted-foreground">Relatórios</p>
                  </div>
                )}
                {blockedPayments > 0 && (
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-destructive">
                      <AlertCircle className="h-4 w-4" />
                    </div>
                    <p className="text-xl font-semibold text-destructive">{blockedPayments}</p>
                    <p className="text-xs text-muted-foreground">Bloqueados</p>
                  </div>
                )}
                <div className="text-center border-l pl-6">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <p className="text-lg font-semibold text-foreground">{formatCurrency(totalMonthlyValue)}</p>
                  <p className="text-xs text-muted-foreground">Previsto/Mês</p>
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
                <p className="text-lg font-semibold">{activeSubprojects}</p>
                <p className="text-xs text-muted-foreground">Subprojetos</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold">{assignedScholars}</p>
                <p className="text-xs text-muted-foreground">Bolsistas</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-warning">{awaitingAssignment}</p>
                <p className="text-xs text-muted-foreground">Aguardando</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold">{formatCurrency(totalMonthlyValue)}</p>
                <p className="text-xs text-muted-foreground">Mensal</p>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Summary Stats Bar */}
            <div className="flex flex-wrap gap-4 p-4 bg-muted/30 rounded-lg text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Total Previsto:</span>
                <span className="font-semibold">{formatCurrency(totalMonthlyValue)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Total Liberado:</span>
                <span className="font-semibold text-success">{formatCurrency(releasedPayments)}</span>
              </div>
              {pendingReports > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Relatórios Pendentes:</span>
                  <Badge variant="secondary">{pendingReports}</Badge>
                </div>
              )}
              {blockedPayments > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Pagamentos Bloqueados:</span>
                  <Badge variant="destructive">{blockedPayments}</Badge>
                </div>
              )}
            </div>

            {/* Subprojects Table */}
            <SubprojectsTable 
              subprojects={subprojects}
              thematicProjectId={project.id}
              selectedMonth={selectedMonth}
              onRefresh={onRefresh}
            />
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
