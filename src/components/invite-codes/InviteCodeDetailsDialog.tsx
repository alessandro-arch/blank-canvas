import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Ticket, 
  Copy, 
  Calendar, 
  Users, 
  Building2, 
  FolderOpen,
  Clock,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

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

interface InviteCodeUse {
  id: string;
  used_by: string;
  used_by_email: string;
  used_at: string;
}

interface InviteCodeDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inviteCode: InviteCode;
  project?: ThematicProject;
}

export function InviteCodeDetailsDialog({
  open,
  onOpenChange,
  inviteCode,
  project,
}: InviteCodeDetailsDialogProps) {
  // Fetch usage history
  const { data: usageHistory, isLoading: loadingHistory } = useQuery({
    queryKey: ['invite-code-uses', inviteCode.id],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invite_code_uses')
        .select('*')
        .eq('invite_code_id', inviteCode.id)
        .order('used_at', { ascending: false });

      if (error) throw error;
      return data as InviteCodeUse[];
    },
  });

  // Fetch creator info
  const { data: creator } = useQuery({
    queryKey: ['invite-code-creator', inviteCode.created_by],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('user_id', inviteCode.created_by)
        .single();

      if (error) return null;
      return data;
    },
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

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(inviteCode.code);
    toast.success('Código copiado!');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" />
            Detalhes do Código
          </DialogTitle>
          <DialogDescription>
            Informações completas sobre o código de convite.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Code Display */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Código</p>
              <code className="text-xl font-mono font-bold">{inviteCode.code}</code>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(inviteCode.status as InviteCodeStatus)}
              <Button variant="outline" size="icon" onClick={handleCopyCode}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Project Info */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <FolderOpen className="h-3 w-3" />
              Projeto Temático
            </p>
            <p className="text-sm font-medium">
              Desenvolvimento e a aplicação de métodos quimiométricos para a análise multivariada de dados clínicos e instrumentais
            </p>
            <p className="text-xs text-muted-foreground">Financiador: LABORATÓRIO TOMMASI</p>
          </div>

          <Separator />

          {/* Usage Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" />
                Usos
              </p>
              <p className="text-lg font-semibold">
                {inviteCode.used_count}
                <span className="text-sm font-normal text-muted-foreground">
                  /{inviteCode.max_uses ?? '∞'}
                </span>
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Validade
              </p>
              <p className="text-sm font-medium">
                {inviteCode.expires_at 
                  ? format(new Date(inviteCode.expires_at), 'dd/MM/yyyy', { locale: ptBR })
                  : 'Sem validade'
                }
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Criado em
              </p>
              <p className="text-sm font-medium">
                {format(new Date(inviteCode.created_at), "dd/MM/yy", { locale: ptBR })}
              </p>
            </div>
          </div>

          {/* Creator */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Criado por</p>
            <p className="text-sm">{creator?.full_name || creator?.email || '—'}</p>
          </div>

          <Separator />

          {/* Usage History */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Histórico de Uso</h4>
              <Button variant="ghost" size="sm" asChild>
                <Link to={`/trilha-auditoria?entity_type=invite_code&entity_id=${inviteCode.id}`}>
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Ver logs
                </Link>
              </Button>
            </div>
            
            <ScrollArea className="h-[150px] rounded-lg border">
              {loadingHistory ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : usageHistory?.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Nenhum uso registrado ainda.
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {usageHistory?.map(use => (
                    <div 
                      key={use.id} 
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                    >
                      <span className="text-sm">{use.used_by_email}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(use.used_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
