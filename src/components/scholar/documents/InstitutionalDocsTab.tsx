import { FileText, Download, Eye, Loader2, BookOpen, FileSpreadsheet, File, Calendar, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInstitutionalDocuments, InstitutionalDocument, DocumentType } from "@/hooks/useInstitutionalDocuments";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const typeConfig: Record<DocumentType, { label: string; icon: typeof BookOpen; className: string }> = {
  manual: { label: "Manual", icon: BookOpen, className: "bg-primary/10 text-primary" },
  template: { label: "Template", icon: FileSpreadsheet, className: "bg-success/10 text-success" },
  termo: { label: "Termo", icon: File, className: "bg-info/10 text-info" },
};

function formatFileSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface InstitutionalDocsTabProps {
  searchQuery?: string;
}

export function InstitutionalDocsTab({ searchQuery = "" }: InstitutionalDocsTabProps) {
  const { data: documents, isLoading } = useInstitutionalDocuments();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const filtered = (documents ?? []).filter((doc) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      doc.title.toLowerCase().includes(q) ||
      doc.description?.toLowerCase().includes(q)
    );
  });

  if (filtered.length === 0) {
    return (
      <div className="card-institutional flex flex-col items-center justify-center py-12">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <FileText className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="font-medium text-foreground mb-1">
          {searchQuery ? "Nenhum resultado" : "Nenhum documento disponível"}
        </p>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          {searchQuery
            ? `Nenhum documento encontrado para "${searchQuery}".`
            : "Manuais, templates e documentos institucionais serão exibidos aqui quando disponíveis."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filtered.map((doc) => {
        const config = typeConfig[doc.type];
        const Icon = config.icon;

        const getSignedDocUrl = async (fileUrl: string) => {
          // If it's a legacy full URL, extract the path
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
          const url = await getSignedDocUrl(doc.file_url);
          if (url) window.open(url, "_blank");
        };
        const handleDownload = async () => {
          const url = await getSignedDocUrl(doc.file_url);
          if (url) {
            const link = window.document.createElement("a");
            link.href = url;
            link.download = doc.file_name;
            link.click();
          }
        };

        return (
          <div key={doc.id} className="card-stat flex flex-col h-full">
            <div className="flex items-start gap-3 mb-3">
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", config.className)}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium", config.className)}>
                  {config.label}
                </span>
                <h4 className="font-medium text-foreground mt-1.5 line-clamp-2 leading-snug">
                  {doc.title}
                </h4>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-4 flex-1 line-clamp-2">
              {doc.description || "Sem descrição"}
            </p>

            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4 pb-4 border-b border-border">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>{format(new Date(doc.updated_at), "dd/MM/yyyy", { locale: ptBR })}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5" />
                <span>{formatFileSize(doc.file_size)}</span>
              </div>
            </div>

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
      })}
    </div>
  );
}
