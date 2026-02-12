import { FileText, Download, Eye, BookOpen, FileSpreadsheet, File, Calendar, HardDrive, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useInstitutionalDocuments, InstitutionalDocument, DocumentType } from "@/hooks/useInstitutionalDocuments";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const typeConfig: Record<DocumentType, { label: string; icon: typeof BookOpen; className: string }> = {
  manual: {
    label: "Manual",
    icon: BookOpen,
    className: "bg-primary/10 text-primary",
  },
  template: {
    label: "Template",
    icon: FileSpreadsheet,
    className: "bg-success/10 text-success",
  },
  termo: {
    label: "Termo",
    icon: File,
    className: "bg-info/10 text-info",
  },
};

function formatFileSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentTypeBadge({ type }: { type: DocumentType }) {
  const config = typeConfig[type];
  
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium", config.className)}>
      {config.label}
    </span>
  );
}

function DocumentCard({ document }: { document: InstitutionalDocument }) {
  const config = typeConfig[document.type];
  const Icon = config.icon;

  const handleView = () => {
    window.open(document.file_url, "_blank");
  };

  const handleDownload = () => {
    const link = window.document.createElement("a");
    link.href = document.file_url;
    link.download = document.file_name;
    link.click();
  };

  return (
    <div className="card-stat flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", config.className)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <DocumentTypeBadge type={document.type} />
          <h4 className="font-medium text-foreground mt-1.5 line-clamp-2 leading-snug">
            {document.title}
          </h4>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground mb-4 flex-1 line-clamp-2">
        {document.description || "Sem descrição"}
      </p>

      {/* Metadata */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4 pb-4 border-b border-border">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          <span>{format(new Date(document.updated_at), "dd/MM/yyyy", { locale: ptBR })}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <HardDrive className="w-3.5 h-3.5" />
          <span>{formatFileSize(document.file_size)}</span>
        </div>
        <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
          {document.file_name.endsWith(".docx") || document.file_name.endsWith(".doc") ? "WORD" : "PDF"}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="flex-1 gap-1.5 text-primary hover:text-primary" onClick={handleView}>
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

export function DocumentsSection() {
  const { data: documents, isLoading } = useInstitutionalDocuments();

  return (
    <div className="mb-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
          <FileText className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Anexos e Documentos</h3>
          <p className="text-sm text-muted-foreground">
            Manuais, templates e documentos institucionais
          </p>
        </div>
      </div>

      {/* Documents Grid or Empty State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !documents || documents.length === 0 ? (
        <div className="card-institutional flex flex-col items-center justify-center py-12">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <FileText className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="font-medium text-foreground mb-1">Nenhum documento disponível</p>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Manuais, templates e documentos institucionais serão exibidos aqui quando disponíveis.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <DocumentCard key={doc.id} document={doc} />
          ))}
        </div>
      )}
    </div>
  );
}
