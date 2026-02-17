import { useState } from "react";
import { Eye, Edit, UserPlus, Archive, FileText, User, MoreHorizontal, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getModalityLabel } from "@/lib/modality-labels";
import type { SubprojectWithScholar } from "./types";

interface SubprojectMobileCardProps {
  project: SubprojectWithScholar;
  onView: (p: SubprojectWithScholar) => void;
  onEdit: (p: SubprojectWithScholar) => void;
  onArchive: (p: SubprojectWithScholar) => void;
  onAssign: (p: SubprojectWithScholar) => void;
  onGeneratePdf: (p: SubprojectWithScholar) => void;
  generatingPdfFor: string | null;
  hasManagerAccess: boolean;
  isAdmin: boolean;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

function getStatusBadge(status: string) {
  switch (status) {
    case "active":
      return <Badge className="bg-success text-success-foreground">Ativo</Badge>;
    case "inactive":
      return <Badge variant="secondary">Inativo</Badge>;
    case "archived":
      return <Badge variant="outline">Arquivado</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getPaymentStatusBadge(status: string | null) {
  if (!status) return null;
  switch (status) {
    case "paid":
      return <Badge className="bg-success text-success-foreground text-[10px]">Pago</Badge>;
    case "eligible":
      return <Badge className="bg-primary text-primary-foreground text-[10px]">Liberado</Badge>;
    case "pending":
      return <Badge variant="secondary" className="text-[10px]">Pendente</Badge>;
    case "cancelled":
      return <Badge variant="destructive" className="text-[10px]">Bloqueado</Badge>;
    default:
      return null;
  }
}

export function SubprojectMobileCard({
  project,
  onView,
  onEdit,
  onArchive,
  onAssign,
  onGeneratePdf,
  generatingPdfFor,
  hasManagerAccess,
  isAdmin,
}: SubprojectMobileCardProps) {
  return (
    <div className="p-4 border rounded-lg bg-card space-y-3">
      {/* Header: code + status */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-muted-foreground">{project.code}</span>
            {getStatusBadge(project.status)}
          </div>
          <p className="font-medium text-sm truncate">{project.title}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="min-w-[44px] min-h-[44px] flex-shrink-0">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView(project)}>
              <Eye className="h-4 w-4 mr-2" />
              Ver detalhes
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onGeneratePdf(project)}
              disabled={generatingPdfFor === project.id}
            >
              {generatingPdfFor === project.id ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Gerar PDF
            </DropdownMenuItem>
            {hasManagerAccess && (
              <>
                <DropdownMenuItem onClick={() => onEdit(project)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                {!project.scholar_name && (
                  <DropdownMenuItem onClick={() => onAssign(project)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Atribuir bolsista
                  </DropdownMenuItem>
                )}
                {project.status === "active" && isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onArchive(project)} className="text-destructive">
                      <Archive className="h-4 w-4 mr-2" />
                      Arquivar
                    </DropdownMenuItem>
                  </>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Scholar */}
      <div className="flex items-center gap-2">
        {project.scholar_name ? (
          <>
            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm truncate">{project.scholar_name}</span>
          </>
        ) : (
          <Badge variant="outline" className="border-warning text-warning text-xs">
            Aguardando atribuição
          </Badge>
        )}
      </div>

      {/* Details row */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-muted-foreground">Valor</p>
          <p className="font-semibold font-mono">{formatCurrency(project.valor_mensal)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Modalidade</p>
          <p>{project.modalidade_bolsa ? getModalityLabel(project.modalidade_bolsa) : "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Vigência</p>
          <p>
            {format(new Date(project.start_date), "dd/MM/yy", { locale: ptBR })} –{" "}
            {format(new Date(project.end_date), "dd/MM/yy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {getPaymentStatusBadge(project.payment_status)}
        </div>
      </div>

      {/* Quick action */}
      <Button variant="outline" size="sm" className="w-full min-h-[44px] text-sm" onClick={() => onView(project)}>
        <Eye className="w-4 h-4 mr-1.5" />
        Ver detalhes
      </Button>
    </div>
  );
}
