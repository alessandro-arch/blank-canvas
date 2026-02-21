import { FileText, Book, FileCheck, Eye, Download, AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { ErrorState, EmptyState, LoadingSkeleton } from "@/components/ui/MobileStateDisplays";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useInstitutionalDocuments, useDeleteInstitutionalDocument, InstitutionalDocument, DocumentType } from "@/hooks/useInstitutionalDocuments";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { EditDocumentDialog } from "./EditDocumentDialog";

const typeConfig: Record<DocumentType, { label: string; icon: typeof FileText; className: string }> = {
  manual: { 
    label: "Manual", 
    icon: Book, 
    className: "bg-info/10 text-info" 
  },
  template: { 
    label: "Template", 
    icon: FileText, 
    className: "bg-primary/10 text-primary" 
  },
  termo: { 
    label: "Termo", 
    icon: FileCheck, 
    className: "bg-success/10 text-success" 
  },
};

function formatFileSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentCard({ document, isAdmin, canEdit }: { document: InstitutionalDocument; isAdmin: boolean; canEdit: boolean }) {
  const config = typeConfig[document.type];
  const Icon = config.icon;
  const deleteMutation = useDeleteInstitutionalDocument();

  const getSignedDocUrl = async (fileUrl: string) => {
    let storagePath = fileUrl;
    if (fileUrl.startsWith("http")) {
      const parts = fileUrl.split("/institutional-documents/");
      storagePath = parts.length > 1 ? parts[1] : fileUrl;
    }
    const { data, error } = await supabase.storage
      .from("institutional-documents")
      .createSignedUrl(storagePath, 3600);
    if (error || !data?.signedUrl) {
      toast.error("Erro ao gerar link de acesso");
      return null;
    }
    return data.signedUrl;
  };

  const handleView = async () => {
    const url = await getSignedDocUrl(document.file_url);
    if (url) window.open(url, "_blank");
  };

  const handleDownload = async () => {
    const url = await getSignedDocUrl(document.file_url);
    if (url) {
      const link = window.document.createElement("a");
      link.href = url;
      link.download = document.file_name;
      link.click();
    }
  };

  const handleDelete = () => {
    deleteMutation.mutate(document);
  };

  return (
    <div className="card-stat flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", config.className)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <span className={cn("inline-block px-2 py-0.5 rounded text-xs font-medium mb-1", config.className)}>
            {config.label}
          </span>
          <h3 className="font-semibold text-foreground leading-tight">{document.title}</h3>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {canEdit && <EditDocumentDialog document={document} />}
          {isAdmin && (
            <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir documento</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir o documento "{document.title}"? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground mb-4 flex-1 line-clamp-2">
        {document.description || "Sem descrição"}
      </p>

      {/* Meta info */}
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-4 pb-4 border-b border-border">
        <span>Atualizado: {format(new Date(document.updated_at), "dd/MM/yyyy", { locale: ptBR })}</span>
        <span>{formatFileSize(document.file_size)}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={handleView}>
          <Eye className="w-4 h-4" />
          Visualizar
        </Button>
        <Button variant="default" size="sm" className="flex-1 gap-1.5" onClick={handleDownload}>
          <Download className="w-4 h-4" />
          Baixar
        </Button>
      </div>
    </div>
  );
}

interface DocumentsGridProps {
  searchQuery?: string;
  typeFilter?: string;
  sortOrder?: string;
}

export function DocumentsGrid({ searchQuery = "", typeFilter = "todos", sortOrder = "recentes" }: DocumentsGridProps) {
  const { data: documents, isLoading, error: queryError, refetch } = useInstitutionalDocuments();
  const { isAdmin, isManager } = useUserRole();
  const canEdit = isAdmin || isManager;

  // Filter and sort documents
  const filteredDocuments = documents?.filter((doc) => {
    const matchesSearch = !searchQuery || 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === "todos" || doc.type === typeFilter;
    
    return matchesSearch && matchesType;
  }).sort((a, b) => {
    switch (sortOrder) {
      case "antigos":
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case "nome":
        return a.title.localeCompare(b.title);
      case "tamanho":
        return (b.file_size || 0) - (a.file_size || 0);
      case "recentes":
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  if (queryError) {
    return (
      <ErrorState
        message="Não foi possível carregar os documentos."
        onRetry={() => refetch()}
      />
    );
  }

  if (isLoading) {
    return <LoadingSkeleton rows={4} variant="card" />;
  }

  return (
    <div className="space-y-6">
      {/* Documents Grid or Empty State */}
      {!filteredDocuments || filteredDocuments.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-7 h-7 text-muted-foreground" />}
          title="Nenhum documento disponível"
          description={
            searchQuery || typeFilter !== "todos"
              ? "Nenhum documento encontrado com os filtros aplicados."
              : "Os documentos serão exibidos aqui após serem carregados pelo administrador."
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDocuments.map((document) => (
            <DocumentCard key={document.id} document={document} isAdmin={isAdmin} canEdit={canEdit} />
          ))}
        </div>
      )}

      {/* Important Notice */}
      <div className="card-institutional bg-warning/5 border-warning/20">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-warning" />
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-1">Importante</h4>
            <p className="text-sm text-muted-foreground">
              Sempre utilize a <strong className="text-foreground">versão mais recente</strong> dos documentos disponibilizados. 
              Documentos desatualizados podem conter informações incorretas ou procedimentos que não são mais válidos. 
              Verifique a data de atualização antes de utilizar qualquer documento.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
