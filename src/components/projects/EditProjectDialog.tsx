import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type ProjectStatus = Database['public']['Enums']['project_status'];

interface Project {
  id: string;
  code: string;
  title: string;
  orientador: string;
  thematic_project_id: string;
  modalidade_bolsa: string | null;
  valor_mensal: number;
  start_date: string;
  end_date: string;
  coordenador_tecnico_icca: string | null;
  observacoes?: string | null;
  status: ProjectStatus;
}

interface EditProjectDialogProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const formSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  orientador: z.string().min(1, 'Orientador é obrigatório'),
  modalidade_bolsa: z.string().min(1, 'Modalidade da bolsa é obrigatória'),
  valor_mensal: z.coerce.number().positive('Valor deve ser positivo'),
  start_date: z.string().min(1, 'Data de início é obrigatória'),
  end_date: z.string().min(1, 'Data de término é obrigatória'),
  coordenador_tecnico_icca: z.string().optional(),
  observacoes: z.string().optional(),
}).refine(data => new Date(data.start_date) < new Date(data.end_date), {
  message: 'Data de início deve ser anterior à data de término',
  path: ['end_date'],
});

type FormValues = z.infer<typeof formSchema>;

export function EditProjectDialog({
  project,
  open,
  onOpenChange,
  onSuccess,
}: EditProjectDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: project.title,
      orientador: project.orientador,
      modalidade_bolsa: project.modalidade_bolsa || '',
      valor_mensal: project.valor_mensal,
      start_date: project.start_date,
      end_date: project.end_date,
      coordenador_tecnico_icca: project.coordenador_tecnico_icca || '',
      observacoes: project.observacoes || '',
    },
  });

  // Reset form when project changes
  useEffect(() => {
    if (open) {
      form.reset({
        title: project.title,
        orientador: project.orientador,
        modalidade_bolsa: project.modalidade_bolsa || '',
        valor_mensal: project.valor_mensal,
        start_date: project.start_date,
        end_date: project.end_date,
        coordenador_tecnico_icca: project.coordenador_tecnico_icca || '',
        observacoes: project.observacoes || '',
      });
    }
  }, [open, project, form]);

  const onSubmit = async (values: FormValues) => {
    if (!user) return;

    setIsLoading(true);

    try {
      // Prepare previous and new values for audit
      const previousValue = {
        title: project.title,
        orientador: project.orientador,
        modalidade_bolsa: project.modalidade_bolsa,
        valor_mensal: project.valor_mensal,
        start_date: project.start_date,
        end_date: project.end_date,
        coordenador_tecnico_icca: project.coordenador_tecnico_icca,
        observacoes: project.observacoes,
      };

      const newValue = {
        title: values.title,
        orientador: values.orientador,
        modalidade_bolsa: values.modalidade_bolsa,
        valor_mensal: values.valor_mensal,
        start_date: values.start_date,
        end_date: values.end_date,
        coordenador_tecnico_icca: values.coordenador_tecnico_icca || null,
        observacoes: values.observacoes || null,
      };

      // Update project
      const { error: updateError } = await supabase
        .from('projects')
        .update(newValue)
        .eq('id', project.id);

      if (updateError) throw updateError;

      // Log audit using secure RPC function
      await supabase.rpc('insert_audit_log', {
        p_action: 'subproject_updated',
        p_entity_type: 'project',
        p_entity_id: project.id,
        p_previous_value: previousValue,
        p_new_value: newValue,
        p_details: {
          project_code: project.code,
          changes: Object.keys(newValue).filter(
            key => JSON.stringify(previousValue[key as keyof typeof previousValue]) !== 
                   JSON.stringify(newValue[key as keyof typeof newValue])
          ),
        },
        p_user_agent: navigator.userAgent,
      });

      toast({
        title: 'Subprojeto atualizado',
        description: `O subprojeto "${project.code}" foi atualizado com sucesso.`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating subproject:', error);
      toast({
        title: 'Erro ao atualizar subprojeto',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Subprojeto</DialogTitle>
          <DialogDescription>
            Altere os dados do subprojeto <span className="font-mono">{project.code}</span>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="orientador"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Orientador</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="coordenador_tecnico_icca"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Coordenador Técnico (opcional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="modalidade_bolsa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modalidade da Bolsa</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="valor_mensal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Mensal (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Início</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Término</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Observações adicionais sobre o subprojeto (opcional)"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
