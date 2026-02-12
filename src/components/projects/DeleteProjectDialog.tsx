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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Trash2, AlertTriangle } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type ProjectStatus = Database['public']['Enums']['project_status'];

interface Project {
  id: string;
  code: string;
  title: string;
  status: ProjectStatus;
}

interface DeleteProjectDialogProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  hasDependencies: boolean;
}

export function DeleteProjectDialog({
  project,
  open,
  onOpenChange,
  onSuccess,
  hasDependencies,
}: DeleteProjectDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [confirmCode, setConfirmCode] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();

  const isConfirmValid = confirmCode === project.code;

  const handleDelete = async () => {
    if (!user || !isConfirmValid || hasDependencies) return;

    setIsLoading(true);

    try {
      // Log audit BEFORE deletion using secure RPC function
      await supabase.rpc("insert_audit_log", {
        p_action: 'project_deleted',
        p_entity_type: 'project',
        p_entity_id: project.id,
        p_previous_value: {
          code: project.code,
          title: project.title,
          status: project.status,
        },
        p_new_value: null,
        p_details: {
          project_code: project.code,
          project_title: project.title,
          deletion_reason: 'User requested deletion',
        },
        p_user_agent: navigator.userAgent,
      });

      // Delete project
      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id);

      if (deleteError) throw deleteError;

      toast({
        title: 'Projeto excluído',
        description: `O projeto "${project.code}" foi removido permanentemente.`,
      });

      setConfirmCode('');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting project:', error);
      const errorRef = `ERR-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      toast({
        title: 'Erro ao excluir projeto',
        description: `${error instanceof Error ? error.message : 'Erro desconhecido'}. Ref: ${errorRef}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setConfirmCode(''); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Excluir Projeto
          </DialogTitle>
          <DialogDescription>
            Esta ação é <strong>permanente e irreversível</strong>. O projeto será removido 
            completamente do sistema.
          </DialogDescription>
        </DialogHeader>

        {hasDependencies ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Este projeto possui vínculos, pagamentos ou relatórios associados e não pode ser excluído. 
              Use a opção "Arquivar" para desativá-lo mantendo o histórico.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4 py-4">
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <p className="text-sm font-medium">{project.title}</p>
              <p className="text-sm text-muted-foreground">Código: {project.code}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-code">
                Digite o código do projeto <span className="font-mono font-bold">{project.code}</span> para confirmar
              </Label>
              <Input
                id="confirm-code"
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value)}
                placeholder={project.code}
                autoComplete="off"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmValid || isLoading || hasDependencies}
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir Permanentemente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
