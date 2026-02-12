import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  title: z.string().min(10, 'O título deve ter pelo menos 10 caracteres'),
  sponsor_name: z.string().min(2, 'O financiador é obrigatório'),
  observations: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ThematicProject {
  id: string;
  title: string;
  sponsor_name: string;
  status: string;
  start_date?: string | null;
  end_date?: string | null;
  observations?: string | null;
}

interface EditThematicProjectDialogProps {
  project: ThematicProject;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditThematicProjectDialog({
  project,
  open,
  onOpenChange,
  onSuccess,
}: EditThematicProjectDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: project.title,
      sponsor_name: project.sponsor_name,
      observations: project.observations || '',
    },
  });

  // Update form when project changes
  useEffect(() => {
    form.reset({
      title: project.title,
      sponsor_name: project.sponsor_name,
      observations: project.observations || '',
    });
  }, [project, form]);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('thematic_projects')
        .update({
          title: data.title,
          sponsor_name: data.sponsor_name,
          observations: data.observations || null,
        })
        .eq('id', project.id);

      if (error) throw error;

      toast.success('Projeto Temático atualizado com sucesso!');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error updating thematic project:', error);
      toast.error('Erro ao atualizar Projeto Temático');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Projeto Temático</DialogTitle>
          <DialogDescription>
            Atualize as informações do projeto temático.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título do Projeto Temático *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ex: Desenvolvimento e aplicação de métodos..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sponsor_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Financiador *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: LABORATÓRIO TOMMASI" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="observations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observações adicionais..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
