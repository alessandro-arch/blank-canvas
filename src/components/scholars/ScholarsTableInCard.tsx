import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreHorizontal, Eye, Edit, Trash2, UserX, ShieldAlert, Users, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useUserRole } from '@/hooks/useUserRole';
import { useAdminMasterMode } from '@/contexts/AdminMasterModeContext';
import { getModalityLabel } from '@/lib/modality-labels';
import { BulkRemovalDialog } from '@/components/dashboard/BulkRemovalDialog';
import { AdminEditScholarDialog } from '@/components/admin/AdminEditScholarDialog';
import { UploadGrantTermDialog } from './UploadGrantTermDialog';
import type { ScholarWithProject, EnrollmentStatus } from './types';

interface ScholarsTableInCardProps {
  scholars: ScholarWithProject[];
  onRefresh: () => void;
}

const enrollmentStatusConfig: Record<EnrollmentStatus, { label: string; className: string }> = {
  active: { label: 'Ativo', className: 'bg-success/10 text-success' },
  suspended: { label: 'Suspenso', className: 'bg-warning/10 text-warning' },
  completed: { label: 'Concluído', className: 'bg-info/10 text-info' },
  cancelled: { label: 'Cancelado', className: 'bg-destructive/10 text-destructive' },
};

function StatusBadge({ status, config }: { status: string; config: { label: string; className: string } }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", config.className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {config.label}
    </span>
  );
}

export function ScholarsTableInCard({ scholars, onRefresh }: ScholarsTableInCardProps) {
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const { isAdminMasterMode } = useAdminMasterMode();
  
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [adminEditDialogOpen, setAdminEditDialogOpen] = useState(false);
  const [selectedScholarForEdit, setSelectedScholarForEdit] = useState<ScholarWithProject | null>(null);
  const [grantTermDialogOpen, setGrantTermDialogOpen] = useState(false);
  const [selectedScholarForGrantTerm, setSelectedScholarForGrantTerm] = useState<ScholarWithProject | null>(null);

  const getInitials = (name: string | null) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleRemove = (userId: string) => {
    setSelectedUserIds([userId]);
    setBulkDialogOpen(true);
  };

  if (scholars.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Users className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground">Nenhum bolsista vinculado</p>
            <p className="text-sm text-muted-foreground">
              Este projeto temático ainda não possui bolsistas atribuídos.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="table-institutional">
          <thead>
            <tr>
              <th>Bolsista</th>
              <th>Subprojeto</th>
              <th>Modalidade</th>
              <th>Status</th>
              <th>Parcelas</th>
              <th>Pendências</th>
              <th className="w-12">Ações</th>
            </tr>
          </thead>
          <tbody>
            {scholars.map((scholar) => (
              <tr 
                key={scholar.userId}
                className={cn(!scholar.isActive && "opacity-60")}
              >
                <td>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-primary">
                        {getInitials(scholar.fullName)}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-foreground block">
                        {scholar.fullName || 'Sem nome'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {scholar.email}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="text-muted-foreground">
                  {scholar.projectTitle ? (
                    <div>
                      <span className="block">{scholar.projectTitle}</span>
                      {scholar.projectCode && (
                        <span className="text-xs opacity-70">{scholar.projectCode}</span>
                      )}
                    </div>
                  ) : (
                    <span className="italic">Sem subprojeto</span>
                  )}
                </td>
                <td className="text-muted-foreground">
                  {scholar.modality ? getModalityLabel(scholar.modality) : '—'}
                </td>
                <td>
                  {!scholar.isActive ? (
                    <Badge variant="destructive" className="gap-1">
                      <UserX className="w-3 h-3" />
                      Desativado
                    </Badge>
                  ) : scholar.enrollmentStatus ? (
                    <StatusBadge 
                      status={scholar.enrollmentStatus} 
                      config={enrollmentStatusConfig[scholar.enrollmentStatus]} 
                    />
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Sem Vínculo
                    </Badge>
                  )}
                </td>
                <td>
                  {scholar.totalInstallments > 0 ? (
                    <span className="text-sm font-medium text-foreground">
                      {scholar.paidInstallments}
                      <span className="text-muted-foreground font-normal">/{scholar.totalInstallments}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    {scholar.pendingReports > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {scholar.pendingReports} relatório(s)
                      </Badge>
                    )}
                    {scholar.pendingPayments > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {scholar.pendingPayments} pagamento(s)
                      </Badge>
                    )}
                    {scholar.pendingReports === 0 && scholar.pendingPayments === 0 && (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </div>
                </td>
                <td>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1.5 rounded hover:bg-muted transition-colors">
                        <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover">
                      <DropdownMenuItem 
                        className="gap-2"
                        onClick={() => navigate(`/admin/bolsista/${scholar.userId}`)}
                      >
                        <Eye className="w-4 h-4" />
                        Ver perfil
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="gap-2"
                        onClick={() => navigate(`/admin/bolsista/${scholar.userId}`)}
                      >
                        <Edit className="w-4 h-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="gap-2"
                        onClick={() => {
                          setSelectedScholarForGrantTerm(scholar);
                          setGrantTermDialogOpen(true);
                        }}
                      >
                        <FileText className="w-4 h-4" />
                        Termo de Outorga
                      </DropdownMenuItem>
                      {isAdmin && isAdminMasterMode && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="gap-2 text-destructive focus:text-destructive"
                            onClick={() => {
                              setSelectedScholarForEdit(scholar);
                              setAdminEditDialogOpen(true);
                            }}
                          >
                            <ShieldAlert className="w-4 h-4" />
                            Editar Perfil (Admin)
                          </DropdownMenuItem>
                        </>
                      )}
                      {isAdmin && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="gap-2 text-destructive focus:text-destructive"
                            onClick={() => handleRemove(scholar.userId)}
                          >
                            <Trash2 className="w-4 h-4" />
                            Remover
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bulk Removal Dialog */}
      <BulkRemovalDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        selectedUserIds={selectedUserIds}
        onComplete={() => {
          setSelectedUserIds([]);
          onRefresh();
        }}
      />

      {/* Admin Edit Scholar Dialog */}
      <AdminEditScholarDialog
        open={adminEditDialogOpen}
        onOpenChange={setAdminEditDialogOpen}
        scholar={selectedScholarForEdit ? {
          userId: selectedScholarForEdit.userId,
          fullName: selectedScholarForEdit.fullName,
          email: selectedScholarForEdit.email,
        } : null}
        onSuccess={onRefresh}
      />

      {/* Upload Grant Term Dialog */}
      <UploadGrantTermDialog
        open={grantTermDialogOpen}
        onOpenChange={setGrantTermDialogOpen}
        scholarUserId={selectedScholarForGrantTerm?.userId || ""}
        scholarName={selectedScholarForGrantTerm?.fullName || "Bolsista"}
        onSuccess={onRefresh}
      />
    </>
  );
}
