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
import { Loader2, Plus, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const formSchema = z.object({
  code: z.string().min(1, 'Código é obrigatório'),
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

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  thematicProjectId: string;
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  onSuccess,
  thematicProjectId,
}: CreateProjectDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [codeExists, setCodeExists] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: '',
      title: '',
      orientador: '',
      modalidade_bolsa: '',
      valor_mensal: 0,
      start_date: '',
      end_date: '',
      coordenador_tecnico_icca: '',
      observacoes: '',
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset();
      setCodeExists(false);
    }
  }, [open, form]);

  // Check if code already exists
  const checkCodeExists = async (code: string) => {
    if (!code) {
      setCodeExists(false);
      return;
    }

    const { data } = await supabase
      .from('projects')
      .select('id')
      .eq('code', code)
      .maybeSingle();

    setCodeExists(!!data);
  };

  const onSubmit = async (values: FormValues) => {
    if (!user) return;
    if (codeExists) {
      toast({
        title: 'Código já existe',
        description: 'Já existe um subprojeto com este código. Use outro código ou edite o existente.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const projectData = {
        code: values.code,
        title: values.title,
        orientador: values.orientador,
        thematic_project_id: thematicProjectId,
        modalidade_bolsa: values.modalidade_bolsa,
        valor_mensal: values.valor_mensal,
        start_date: values.start_date,
        end_date: values.end_date,
        coordenador_tecnico_icca: values.coordenador_tecnico_icca || null,
        observacoes: values.observacoes || null,
        status: 'active' as const,
      };

      const { data: newProject, error: insertError } = await supabase
        .from('projects')
        .insert(projectData)
        .select()
        .single();

      if (insertError) throw insertError;

      // Log audit using secure RPC function
      await supabase.rpc('insert_audit_log', {
        p_action: 'subproject_created',
        p_entity_type: 'project',
        p_entity_id: newProject.id,
        p_new_value: projectData,
        p_details: {
          project_code: values.code,
          thematic_project_id: thematicProjectId,
        },
        p_user_agent: navigator.userAgent,
      });

      toast({
        title: 'Subprojeto criado',
        description: `O subprojeto "${values.code}" foi criado com sucesso.`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating subproject:', error);
      toast({
        title: 'Erro ao criar subprojeto',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Novo Subprojeto
          </DialogTitle>
          <DialogDescription>
            Cadastre um novo subprojeto vinculado ao Projeto Temático. O código deve ser único.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código *</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Ex: 006-2026TOM"
                        onBlur={(e) => checkCodeExists(e.target.value)}
                      />
                    </FormControl>
                    {codeExists && (
                      <Alert variant="destructive" className="py-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Este código já está em uso
                        </AlertDescription>
                      </Alert>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="modalidade_bolsa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modalidade da Bolsa *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: Cientista Sênior" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Título do subprojeto" />
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
                    <FormLabel>Orientador *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nome do orientador" />
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
                    <FormLabel>Coordenador Técnico</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nome do coordenador (opcional)" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="valor_mensal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor Mensal (R$) *</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      min="0" 
                      {...field} 
                      placeholder="Ex: 5500.00"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Início *</FormLabel>
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
                    <FormLabel>Data de Término *</FormLabel>
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
              <Button type="submit" disabled={isLoading || codeExists}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar Subprojeto
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
