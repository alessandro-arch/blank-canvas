import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Edit, Archive, Trash2, AlertTriangle, FileText, Eye, Upload, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { EditProjectDialog } from './EditProjectDialog';
import { ArchiveProjectDialog } from './ArchiveProjectDialog';
import { DeleteProjectDialog } from './DeleteProjectDialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useWorkPlanByProject } from '@/hooks/useWorkPlans';
import { UploadWorkPlanDialog } from '@/components/scholars/UploadWorkPlanDialog';
import { PdfViewerDialog } from '@/components/ui/PdfViewerDialog';
import { toast } from 'sonner';

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
  created_at: string;
  updated_at: string;
}

interface ProjectDetailsDialogProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  onProjectUpdated: () => void;
}

export function ProjectDetailsDialog({
  project,
  open,
  onOpenChange,
  onClose,
  onProjectUpdated,
}: ProjectDetailsDialogProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workPlanDialogOpen, setWorkPlanDialogOpen] = useState(false);
  const [wpViewLoading, setWpViewLoading] = useState(false);
  const [wpPdfUrl, setWpPdfUrl] = useState<string | null>(null);
  const [wpPdfViewerOpen, setWpPdfViewerOpen] = useState(false);

  // Get enrollment to find scholar_user_id
  const { data: enrollmentData } = useQuery({
    queryKey: ['project-enrollment', project.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('enrollments')
        .select('user_id')
        .eq('project_id', project.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: open,
  });

  // Get thematic project for org_id
  const { data: thematicData } = useQuery({
    queryKey: ['project-thematic', project.thematic_project_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('thematic_projects')
        .select('organization_id')
        .eq('id', project.thematic_project_id)
        .single();
      return data;
    },
    enabled: open,
  });

  const scholarUserId = enrollmentData?.user_id;
  const orgId = thematicData?.organization_id;

  const { activeWorkPlan, refetch: refetchWorkPlan } = useWorkPlanByProject(
    project.id,
    scholarUserId || undefined
  );

  const handleViewWorkPlan = async () => {
    if (!activeWorkPlan) return;
    setWpViewLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-workplan-signed-url", {
        body: { workplan_id: activeWorkPlan.id },
      });
      if (error) throw error;
      if (data?.signedUrl) {
        setWpPdfUrl(data.signedUrl);
        setWpPdfViewerOpen(true);
      } else {
        toast.error("Não foi possível abrir o plano de trabalho");
      }
    } catch {
      toast.error("Erro ao abrir plano de trabalho");
    } finally {
      setWpViewLoading(false);
    }
  };

  // Check for dependencies (enrollments, payments, reports)
  const { data: dependencies } = useQuery({
    queryKey: ['project-dependencies', project.id],
    queryFn: async () => {
      // Check enrollments
      const { count: enrollmentCount } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', project.id);

      // Get user_ids from enrollments to check payments and reports
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('id, user_id')
        .eq('project_id', project.id);

      let paymentCount = 0;
      let reportCount = 0;

      if (enrollments && enrollments.length > 0) {
        const enrollmentIds = enrollments.map(e => e.id);
        const userIds = enrollments.map(e => e.user_id);

        // Check payments linked to these enrollments
        const { count: pCount } = await supabase
          .from('payments')
          .select('*', { count: 'exact', head: true })
          .in('enrollment_id', enrollmentIds);
        paymentCount = pCount ?? 0;

        // Check reports from users with enrollments in this project
        const { count: rCount } = await supabase
          .from('reports')
          .select('*', { count: 'exact', head: true })
          .in('user_id', userIds);
        reportCount = rCount ?? 0;
      }

      return {
        enrollments: enrollmentCount ?? 0,
        payments: paymentCount,
        reports: reportCount,
        hasDependencies: (enrollmentCount ?? 0) > 0 || paymentCount > 0 || reportCount > 0,
      };
    },
    enabled: open,
  });

  const getStatusBadge = (status: ProjectStatus) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-success text-success-foreground">Ativo</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inativo</Badge>;
      case 'archived':
        return <Badge variant="outline">Arquivado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleProjectUpdated = () => {
    onProjectUpdated();
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <span className="font-mono text-muted-foreground">{project.code}</span>
                  {getStatusBadge(project.status)}
                </DialogTitle>
                <DialogDescription className="text-lg font-medium mt-1">
                  {project.title}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="details" className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Detalhes</TabsTrigger>
              <TabsTrigger value="workplan">Plano de Trabalho</TabsTrigger>
              <TabsTrigger value="actions">Ações</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Bolsista</p>
                  <p className="font-medium">{project.orientador}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Orientador</p>
                  <p className="font-medium">{project.coordenador_tecnico_icca || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Modalidade da Bolsa</p>
                  <p className="font-medium">{project.modalidade_bolsa || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor Mensal</p>
                  <p className="font-medium font-mono">{formatCurrency(project.valor_mensal)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data de Início</p>
                  <p className="font-medium">
                    {format(new Date(project.start_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data de Término</p>
                  <p className="font-medium">
                    {format(new Date(project.end_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>

              {project.observacoes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Observações</p>
                    <p className="text-sm">{project.observacoes}</p>
                  </div>
                </>
              )}

              <Separator />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Criado em</p>
                  <p>{format(new Date(project.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Última atualização</p>
                  <p>{format(new Date(project.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                </div>
              </div>

              {dependencies && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium mb-2">Vínculos e Dependências</p>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="p-2 rounded-lg bg-muted/50 text-center">
                        <p className="text-2xl font-bold">{dependencies.enrollments}</p>
                        <p className="text-muted-foreground">Vínculo(s)</p>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/50 text-center">
                        <p className="text-2xl font-bold">{dependencies.payments}</p>
                        <p className="text-muted-foreground">Pagamento(s)</p>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/50 text-center">
                        <p className="text-2xl font-bold">{dependencies.reports}</p>
                        <p className="text-muted-foreground">Relatório(s)</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            {/* Work Plan Tab */}
            <TabsContent value="workplan" className="space-y-4 mt-4">
              {!scholarUserId ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Nenhum bolsista vinculado a este subprojeto.</p>
                  <p className="text-xs mt-1">Vincule um bolsista para gerenciar o plano de trabalho.</p>
                </div>
              ) : (
                <>
                  {activeWorkPlan ? (
                    <div className="p-4 rounded-lg border bg-card space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{activeWorkPlan.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Enviado em {format(new Date(activeWorkPlan.uploaded_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            {activeWorkPlan.file_size && ` • ${(activeWorkPlan.file_size / 1024 / 1024).toFixed(1)} MB`}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleViewWorkPlan}
                          disabled={wpViewLoading}
                        >
                          {wpViewLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />}
                          Visualizar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setWorkPlanDialogOpen(true)}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Substituir
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                      <p className="text-sm text-muted-foreground mb-3">Nenhum plano de trabalho enviado.</p>
                      <Button onClick={() => setWorkPlanDialogOpen(true)} size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        Enviar Plano de Trabalho
                      </Button>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="actions" className="space-y-4 mt-4">
              {/* Edit button */}
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <p className="font-medium">Editar Subprojeto</p>
                  <p className="text-sm text-muted-foreground">
                    Alterar título, valores, datas e outros campos
                  </p>
                </div>
                <Button onClick={() => setEditDialogOpen(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </div>

              {/* Archive button */}
              {project.status !== 'archived' && (
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <p className="font-medium">Arquivar Subprojeto</p>
                    <p className="text-sm text-muted-foreground">
                      Impede novos vínculos, mantém histórico para consulta
                    </p>
                  </div>
                  <Button variant="secondary" onClick={() => setArchiveDialogOpen(true)}>
                    <Archive className="h-4 w-4 mr-2" />
                    Arquivar
                  </Button>
                </div>
              )}

              {/* Reactivate button for archived projects */}
              {project.status === 'archived' && (
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <p className="font-medium">Reativar Subprojeto</p>
                    <p className="text-sm text-muted-foreground">
                      Tornar o subprojeto ativo novamente para novos vínculos
                    </p>
                  </div>
                  <Button variant="secondary" onClick={() => setArchiveDialogOpen(true)}>
                    <Archive className="h-4 w-4 mr-2" />
                    Reativar
                  </Button>
                </div>
              )}

              {/* Delete button */}
              <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                <div>
                  <p className="font-medium text-destructive">Excluir Subprojeto</p>
                  <p className="text-sm text-muted-foreground">
                    {dependencies?.hasDependencies
                      ? 'Não é possível excluir - existem vínculos, pagamentos ou relatórios'
                      : 'Remover permanentemente o subprojeto do sistema'}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={dependencies?.hasDependencies}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
              </div>

              {dependencies?.hasDependencies && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30">
                  <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Exclusão bloqueada</p>
                    <p className="text-muted-foreground">
                      Este subprojeto possui {dependencies.enrollments} vínculo(s), {dependencies.payments} pagamento(s) 
                      e {dependencies.reports} relatório(s). Use a opção "Arquivar" para desativá-lo mantendo o histórico.
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <EditProjectDialog
        project={project}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={handleProjectUpdated}
      />

      <ArchiveProjectDialog
        project={project}
        open={archiveDialogOpen}
        onOpenChange={setArchiveDialogOpen}
        onSuccess={handleProjectUpdated}
      />

      <DeleteProjectDialog
        project={project}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onSuccess={handleProjectUpdated}
        hasDependencies={dependencies?.hasDependencies ?? false}
      />

      {scholarUserId && orgId && (
        <UploadWorkPlanDialog
          open={workPlanDialogOpen}
          onOpenChange={setWorkPlanDialogOpen}
          projectId={project.id}
          organizationId={orgId}
          scholarUserId={scholarUserId}
          scholarName={project.orientador}
          existingPlan={activeWorkPlan ? { id: activeWorkPlan.id, fileName: activeWorkPlan.file_name } : null}
          onSuccess={() => refetchWorkPlan()}
        />
      )}

      {wpPdfUrl && (
        <PdfViewerDialog
          open={wpPdfViewerOpen}
          onOpenChange={setWpPdfViewerOpen}
          title={activeWorkPlan?.file_name || "Plano de Trabalho"}
          pdfUrl={wpPdfUrl}
        />
      )}
    </>
  );
}
