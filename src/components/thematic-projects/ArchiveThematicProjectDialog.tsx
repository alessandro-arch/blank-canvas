import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
import { Loader2, Archive } from 'lucide-react';

interface ThematicProject {
  id: string;
  title: string;
  sponsor_name: string;
  status: string;
}

interface ArchiveThematicProjectDialogProps {
  project: ThematicProject;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ArchiveThematicProjectDialog({
  project,
  open,
  onOpenChange,
  onSuccess,
}: ArchiveThematicProjectDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleArchive = async () => {
    setIsSubmitting(true);

    try {
      // First, archive all subprojects
      const { error: subprojectsError } = await supabase
        .from('projects')
        .update({ status: 'archived' })
        .eq('thematic_project_id', project.id);

      if (subprojectsError) throw subprojectsError;

      // Then archive the thematic project
      const { error } = await supabase
        .from('thematic_projects')
        .update({ status: 'archived' })
        .eq('id', project.id);

      if (error) throw error;

      toast.success('Projeto Temático arquivado com sucesso!');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error archiving thematic project:', error);
      toast.error('Erro ao arquivar Projeto Temático');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-destructive" />
            Arquivar Projeto Temático
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Você está prestes a arquivar o Projeto Temático:
            </p>
            <p className="font-medium text-foreground">
              "{project.title}"
            </p>
            <p>
              <strong className="text-destructive">Atenção:</strong> Esta ação também arquivará todos os subprojetos vinculados a este projeto temático.
            </p>
            <p>
              Projetos arquivados podem ser reativados posteriormente por um Administrador Master.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleArchive}
            disabled={isSubmitting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Arquivar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
