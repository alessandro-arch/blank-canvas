import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Trash2, AlertTriangle, Archive } from 'lucide-react';
import { useAuditLog } from '@/hooks/useAuditLog';

interface ThematicProject {
  id: string;
  title: string;
  sponsor_name: string;
  status: string;
}

interface DeleteThematicProjectDialogProps {
  project: ThematicProject;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DeleteThematicProjectDialog({
  project,
  open,
  onOpenChange,
  onSuccess,
}: DeleteThematicProjectDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [hasDependencies, setHasDependencies] = useState(false);
  const [subprojectsCount, setSubprojectsCount] = useState(0);
  const [isChecking, setIsChecking] = useState(true);
  const { logAction } = useAuditLog();

  useEffect(() => {
    if (open) {
      checkDependencies();
    }
  }, [open, project.id]);

  const checkDependencies = async () => {
    setIsChecking(true);
    try {
      const { count, error } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('thematic_project_id', project.id);

      if (error) throw error;

      const hasSubprojects = (count ?? 0) > 0;
      setHasDependencies(hasSubprojects);
      setSubprojectsCount(count ?? 0);
    } catch (error) {
      console.error('Error checking dependencies:', error);
      toast.error('Erro ao verificar dependências');
    } finally {
      setIsChecking(false);
    }
  };

  const handleDelete = async () => {
    if (hasDependencies) {
      toast.error('Não é possível excluir um Projeto Temático com subprojetos vinculados');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('thematic_projects')
        .delete()
        .eq('id', project.id);

      if (error) throw error;

      // Log the action
      await logAction({
        action: 'delete_thematic_project',
        entityType: 'thematic_project',
        entityId: project.id,
        previousValue: {
          title: project.title,
          sponsor_name: project.sponsor_name,
          status: project.status,
        },
        details: {
          reason: 'Exclusão manual pelo Administrador Master',
        },
      });

      toast.success('Projeto Temático excluído com sucesso!');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error deleting thematic project:', error);
      toast.error('Erro ao excluir Projeto Temático');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async () => {
    setIsArchiving(true);
    try {
      // Archive all subprojects first
      const { error: subError } = await supabase
        .from('projects')
        .update({ status: 'archived' })
        .eq('thematic_project_id', project.id);
      if (subError) throw subError;

      // Archive the thematic project
      const { error } = await supabase
        .from('thematic_projects')
        .update({ status: 'archived' })
        .eq('id', project.id);
      if (error) throw error;

      await logAction({
        action: 'archive_thematic_project',
        entityType: 'thematic_project',
        entityId: project.id,
        previousValue: { status: project.status },
        newValue: { status: 'archived' },
        details: { reason: 'Arquivamento via dialog de exclusão (dependências existentes)' },
      });

      toast.success('Projeto Temático e subprojetos arquivados com sucesso!');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error archiving thematic project:', error);
      toast.error('Erro ao arquivar Projeto Temático');
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Excluir Projeto Temático
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            {isChecking ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Verificando dependências...
              </div>
            ) : hasDependencies ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                  <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-destructive">
                      Exclusão não permitida
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Este Projeto Temático possui <strong>{subprojectsCount} subprojeto(s)</strong> vinculado(s).
                    </p>
                  </div>
                </div>
                <p className="text-sm">
140:                   Para excluir, remova primeiro todos os subprojetos. Ou use a opção abaixo para <strong>arquivar</strong> o projeto e preservar o histórico.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p>
                  Você está prestes a excluir permanentemente o Projeto Temático:
                </p>
                <p className="font-medium text-foreground">
                  "{project.title}"
                </p>
                <p className="text-sm">
                  Financiador: <strong>{project.sponsor_name}</strong>
                </p>
                <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                  <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">
                    <strong>Atenção:</strong> Esta ação é irreversível e será registrada na Trilha de Auditoria.
                  </p>
                </div>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel disabled={isSubmitting || isArchiving}>
            {hasDependencies ? 'Fechar' : 'Cancelar'}
          </AlertDialogCancel>
          {hasDependencies && !isChecking && (
            <Button
              onClick={handleArchive}
              disabled={isArchiving}
              className="gap-2"
              variant="default"
            >
              {isArchiving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
              Arquivar Projeto e Subprojetos
            </Button>
          )}
          {!hasDependencies && !isChecking && (
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir Permanentemente
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
