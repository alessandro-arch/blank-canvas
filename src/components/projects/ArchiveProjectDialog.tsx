import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Archive, RotateCcw } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type ProjectStatus = Database['public']['Enums']['project_status'];

interface Project {
  id: string;
  code: string;
  title: string;
  status: ProjectStatus;
}

interface ArchiveProjectDialogProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ArchiveProjectDialog({
  project,
  open,
  onOpenChange,
  onSuccess,
}: ArchiveProjectDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [confirmWord, setConfirmWord] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();

  const isArchived = project.status === 'archived';
  const targetStatus: ProjectStatus = isArchived ? 'active' : 'archived';
  const actionWord = isArchived ? 'REATIVAR' : 'ARQUIVAR';
  const actionLabel = isArchived ? 'Reativar' : 'Arquivar';

  const isConfirmValid = confirmWord.toUpperCase() === actionWord;

  const handleAction = async () => {
    if (!user || !isConfirmValid) return;

    setIsLoading(true);

    try {
      const previousStatus = project.status;

      // Update project status
      const { error: updateError } = await supabase
        .from('projects')
        .update({ status: targetStatus })
        .eq('id', project.id);

      if (updateError) throw updateError;

      // Log audit using secure RPC function
      await supabase.rpc("insert_audit_log", {
        p_action: isArchived ? 'project_reactivated' : 'project_archived',
        p_entity_type: 'project',
        p_entity_id: project.id,
        p_previous_value: { status: previousStatus },
        p_new_value: { status: targetStatus },
        p_details: {
          project_code: project.code,
          project_title: project.title,
        },
        p_user_agent: navigator.userAgent,
      });

      toast({
        title: isArchived ? 'Projeto reativado' : 'Projeto arquivado',
        description: `O projeto "${project.code}" foi ${isArchived ? 'reativado' : 'arquivado'} com sucesso.`,
      });

      setConfirmWord('');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error archiving/reactivating project:', error);
      toast({
        title: `Erro ao ${actionLabel.toLowerCase()} projeto`,
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setConfirmWord(''); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isArchived ? <RotateCcw className="h-5 w-5" /> : <Archive className="h-5 w-5" />}
            {actionLabel} Projeto
          </DialogTitle>
          <DialogDescription>
            {isArchived ? (
              <>
                Ao reativar o projeto <span className="font-mono font-medium">{project.code}</span>, 
                ele voltará a aceitar novos vínculos de bolsistas.
              </>
            ) : (
              <>
                Ao arquivar o projeto <span className="font-mono font-medium">{project.code}</span>, 
                ele não aceitará novos vínculos, mas todo o histórico será mantido para consulta.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-sm font-medium">{project.title}</p>
            <p className="text-sm text-muted-foreground">Código: {project.code}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">
              Digite <span className="font-mono font-bold">{actionWord}</span> para confirmar
            </Label>
            <Input
              id="confirm"
              value={confirmWord}
              onChange={(e) => setConfirmWord(e.target.value)}
              placeholder={actionWord}
              autoComplete="off"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant={isArchived ? 'default' : 'secondary'}
            onClick={handleAction}
            disabled={!isConfirmValid || isLoading}
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isArchived ? <RotateCcw className="h-4 w-4 mr-2" /> : <Archive className="h-4 w-4 mr-2" />}
            {actionLabel} Projeto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
