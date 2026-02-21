import { useState } from 'react';
import { PdfViewerDialog } from '@/components/ui/PdfViewerDialog';
import { EmptyState, ErrorState, LoadingSkeleton } from '@/components/ui/MobileStateDisplays';
import { useQueryClient } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MoreHorizontal, 
  Eye, 
  Edit, 
  UserPlus, 
  Archive,
  FileCheck,
  FileX,
  DollarSign,
  User,
  FileText,
  Loader2,
  Ban
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { ProjectDetailsDialog } from './ProjectDetailsDialog';
import { EditProjectDialog } from './EditProjectDialog';
import { ArchiveProjectDialog } from './ArchiveProjectDialog';
import { AssignScholarToProjectDialog } from './AssignScholarToProjectDialog';
import { CancelScholarshipDialog } from './CancelScholarshipDialog';
import { ReplaceScholarDialog } from './ReplaceScholarDialog';
import type { SubprojectWithScholar, Project } from './types';
import { useUserRole } from '@/hooks/useUserRole';
import { getModalityLabel } from '@/lib/modality-labels';
import { supabase } from '@/integrations/supabase/client';
import { tracedInvokeWithPolling, friendlyError } from '@/lib/logger';
import { useIsMobile } from '@/hooks/use-mobile';
import { SubprojectMobileCard } from './SubprojectMobileCard';


interface SubprojectsTableProps {
  subprojects: SubprojectWithScholar[];
  thematicProjectId: string;
  selectedMonth: string;
  onRefresh: () => void;
  isLoading?: boolean;
  error?: Error | null;
}

export function SubprojectsTable({ 
  subprojects, 
  thematicProjectId,
  selectedMonth,
  onRefresh,
  isLoading = false,
  error = null,
}: SubprojectsTableProps) {
  const queryClient = useQueryClient();
  const { hasManagerAccess, isAdmin } = useUserRole();
  const isMobile = useIsMobile();
  
  const [selectedProject, setSelectedProject] = useState<SubprojectWithScholar | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [cancelScholarshipOpen, setCancelScholarshipOpen] = useState(false);
  const [replaceScholarOpen, setReplaceScholarOpen] = useState(false);
  const [generatingPdfFor, setGeneratingPdfFor] = useState<string | null>(null);
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [pdfViewerUrl, setPdfViewerUrl] = useState<string | null>(null);
  const [pdfViewerTitle, setPdfViewerTitle] = useState('');

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
      case 'inactive':
        return <Badge variant="secondary">Inativo</Badge>;
      case 'archived':
        return <Badge variant="outline">Arquivado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getReportStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="outline" className="text-muted-foreground">—</Badge>;
    
    switch (status) {
      case 'approved':
        return <Badge className="bg-success text-success-foreground">Aprovado</Badge>;
      case 'under_review':
        return <Badge variant="secondary">Em análise</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Recusado</Badge>;
      case 'pending':
        return <Badge variant="outline" className="border-warning text-warning">Pendente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="outline" className="text-muted-foreground">—</Badge>;
    
    switch (status) {
      case 'paid':
        return <Badge className="bg-success text-success-foreground">Pago</Badge>;
      case 'eligible':
        return <Badge className="bg-primary text-primary-foreground">Liberado</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pendente</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Bloqueado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleViewProject = (project: SubprojectWithScholar) => {
    setSelectedProject(project);
    setDetailsDialogOpen(true);
  };

  const handleEditProject = (project: SubprojectWithScholar) => {
    setSelectedProject(project);
    setEditDialogOpen(true);
  };

  const handleArchiveProject = (project: SubprojectWithScholar) => {
    setSelectedProject(project);
    setArchiveDialogOpen(true);
  };

  const handleAssignScholar = (project: SubprojectWithScholar) => {
    setSelectedProject(project);
    setAssignDialogOpen(true);
  };

  const handleCancelScholarship = (project: SubprojectWithScholar) => {
    setSelectedProject(project);
    setCancelScholarshipOpen(true);
  };

  const handleReplaceScholar = (project: SubprojectWithScholar) => {
    setSelectedProject(project);
    setReplaceScholarOpen(true);
  };

  const handleProjectUpdated = () => {
    onRefresh();
    queryClient.invalidateQueries({ queryKey: ['projects-management'] });
  };

  const handleGeneratePdf = async (project: SubprojectWithScholar) => {
    if (generatingPdfFor) return;
    setGeneratingPdfFor(project.id);

    const toastId = toast.loading('Gerando relatório PDF...');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const { data } = await tracedInvokeWithPolling<{ signedUrl: string }>(
        'generate-scholarship-pdf',
        { bolsa_id: project.id },
        'SubprojectsTable',
      );

      toast.dismiss(toastId);
      toast.success('Relatório pronto!');
      setPdfViewerUrl(data.signedUrl);
      setPdfViewerTitle('Relatório do Subprojeto');
      setPdfViewerOpen(true);
    } catch (err: any) {
      console.error('PDF generation error:', err);
      toast.error(friendlyError(err, 'Erro ao gerar relatório PDF'), { id: toastId });
    } finally {
      setGeneratingPdfFor(null);
    }
  };

  // Convert SubprojectWithScholar to Project for dialogs
  const getProjectForDialog = (subproject: SubprojectWithScholar): Project => ({
    id: subproject.id,
    code: subproject.code,
    title: subproject.title,
    orientador: subproject.orientador,
    thematic_project_id: subproject.thematic_project_id,
    modalidade_bolsa: subproject.modalidade_bolsa,
    valor_mensal: subproject.valor_mensal,
    start_date: subproject.start_date,
    end_date: subproject.end_date,
    coordenador_tecnico_icca: subproject.coordenador_tecnico_icca,
    observacoes: subproject.observacoes,
    status: subproject.status,
    created_at: subproject.created_at,
    updated_at: subproject.updated_at,
  });

  if (error) {
    return (
      <ErrorState
        message="Não foi possível carregar os subprojetos."
        onRetry={onRefresh}
      />
    );
  }

  if (isLoading) {
    return isMobile ? (
      <LoadingSkeleton rows={3} variant="card" />
    ) : (
      <div className="p-6 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-4 items-center">
            <div className="flex-1 space-y-1">
              <div className="h-4 w-40 bg-muted animate-pulse rounded" />
              <div className="h-3 w-24 bg-muted animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (subprojects.length === 0) {
    return (
      <EmptyState
        title="Nenhum subprojeto cadastrado"
        description="Este projeto temático ainda não possui subprojetos cadastrados."
      />
    );
  }

  return (
    <>
      {/* Mobile: card list */}
      {isMobile ? (
        <div className="space-y-3">
          {subprojects.map((project) => (
            <SubprojectMobileCard
              key={project.id}
              project={project}
              onView={handleViewProject}
              onEdit={handleEditProject}
              onArchive={handleArchiveProject}
              onAssign={handleAssignScholar}
              onGeneratePdf={handleGeneratePdf}
              generatingPdfFor={generatingPdfFor}
              hasManagerAccess={hasManagerAccess}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      ) : (
        /* Desktop: full table */
        <div className="rounded-lg border overflow-auto max-h-[500px]">
          <Table className="min-w-[1100px]">
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead className="w-[100px]">Código</TableHead>
                <TableHead>Subprojeto</TableHead>
                <TableHead>Bolsista</TableHead>
                <TableHead>Modalidade</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Vigência</TableHead>
                <TableHead>Relatório</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[60px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subprojects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-mono text-xs">{project.code}</TableCell>
                  <TableCell className="font-medium max-w-[180px] truncate" title={project.title}>
                    {project.title}
                  </TableCell>
                  <TableCell>
                    {project.scholar_name ? (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{project.scholar_name}</p>
                          {project.scholar_email && (
                            <p className="truncate text-xs text-muted-foreground">{project.scholar_email}</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <Badge variant="outline" className="border-warning text-warning">
                        Aguardando atribuição
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {project.modalidade_bolsa ? getModalityLabel(project.modalidade_bolsa) : '—'}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatCurrency(project.valor_mensal)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(project.start_date), 'dd/MM/yy', { locale: ptBR })} - {format(new Date(project.end_date), 'dd/MM/yy', { locale: ptBR })}
                  </TableCell>
                  <TableCell>{getReportStatusBadge(project.report_status)}</TableCell>
                  <TableCell>{getPaymentStatusBadge(project.payment_status)}</TableCell>
                  <TableCell>{getStatusBadge(project.status)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewProject(project)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleGeneratePdf(project)}
                          disabled={generatingPdfFor === project.id}
                        >
                          {generatingPdfFor === project.id ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <FileText className="h-4 w-4 mr-2" />
                          )}
                          {generatingPdfFor === project.id ? 'Gerando...' : 'Gerar PDF'}
                        </DropdownMenuItem>
                        {hasManagerAccess && (
                          <>
                            <DropdownMenuItem onClick={() => handleEditProject(project)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar subprojeto
                            </DropdownMenuItem>
                            {!project.scholar_name && (
                              <DropdownMenuItem onClick={() => handleAssignScholar(project)}>
                                <UserPlus className="h-4 w-4 mr-2" />
                                Atribuir bolsista
                              </DropdownMenuItem>
                            )}
                            {/* Cancel scholarship */}
                            {project.enrollment_id && project.enrollment_status === 'active' && (
                              <DropdownMenuItem 
                                onClick={() => handleCancelScholarship(project)}
                                className="text-destructive"
                              >
                                <Ban className="h-4 w-4 mr-2" />
                                Cancelar bolsa
                              </DropdownMenuItem>
                            )}
                            {/* Replace scholar */}
                            {project.enrollment_id && project.enrollment_status === 'cancelled' && !project.enrollment_replaced_by && (
                              <DropdownMenuItem onClick={() => handleReplaceScholar(project)}>
                                <UserPlus className="h-4 w-4 mr-2" />
                                Indicar substituto
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {project.status === 'active' && isAdmin && (
                              <DropdownMenuItem 
                                onClick={() => handleArchiveProject(project)}
                                className="text-destructive"
                              >
                                <Archive className="h-4 w-4 mr-2" />
                                Arquivar
                              </DropdownMenuItem>
                            )}
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialogs */}
      {selectedProject && (
        <>
          <ProjectDetailsDialog
            project={getProjectForDialog(selectedProject)}
            open={detailsDialogOpen}
            onOpenChange={setDetailsDialogOpen}
            onClose={() => setDetailsDialogOpen(false)}
            onProjectUpdated={handleProjectUpdated}
          />
          
          <EditProjectDialog
            project={getProjectForDialog(selectedProject)}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            onSuccess={handleProjectUpdated}
          />
          
          <ArchiveProjectDialog
            project={getProjectForDialog(selectedProject)}
            open={archiveDialogOpen}
            onOpenChange={setArchiveDialogOpen}
            onSuccess={handleProjectUpdated}
          />
          
          <AssignScholarToProjectDialog
            project={getProjectForDialog(selectedProject)}
            open={assignDialogOpen}
            onOpenChange={setAssignDialogOpen}
            onSuccess={handleProjectUpdated}
          />

          {/* Cancel Scholarship Dialog */}
          {selectedProject?.enrollment_id && (
            <CancelScholarshipDialog
              open={cancelScholarshipOpen}
              onOpenChange={setCancelScholarshipOpen}
              enrollmentId={selectedProject.enrollment_id}
              scholarName={selectedProject.scholar_name || 'Bolsista'}
              projectCode={selectedProject.code}
              projectTitle={selectedProject.title}
              totalInstallments={selectedProject.enrollment_total_installments || 0}
              paidInstallments={selectedProject.enrollment_paid_installments || 0}
              monthlyAmount={selectedProject.valor_mensal}
              onSuccess={handleProjectUpdated}
            />
          )}

          {/* Replace Scholar Dialog */}
          {selectedProject?.enrollment_id && (
            <ReplaceScholarDialog
              open={replaceScholarOpen}
              onOpenChange={setReplaceScholarOpen}
              enrollmentId={selectedProject.enrollment_id}
              previousScholarName={selectedProject.scholar_name || 'Bolsista'}
              projectCode={selectedProject.code}
              projectTitle={selectedProject.title}
              totalInstallments={selectedProject.enrollment_total_installments || 0}
              paidInstallments={selectedProject.enrollment_paid_installments || 0}
              monthlyAmount={selectedProject.valor_mensal}
              projectEndDate={selectedProject.end_date}
              onSuccess={handleProjectUpdated}
            />
          )}
        </>
      )}

      <PdfViewerDialog
        open={pdfViewerOpen}
        onOpenChange={setPdfViewerOpen}
        title={pdfViewerTitle}
        pdfUrl={pdfViewerUrl}
      />
    </>
  );
}
