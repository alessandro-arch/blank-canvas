import { useState } from "react";
import { FileText, Download, Eye, Info, Loader2, AlertCircle, Archive, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkPlans } from "@/hooks/useWorkPlans";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

function formatFileSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface WorkPlanTabProps {
  searchQuery?: string;
}

export function WorkPlanTab({ searchQuery = "" }: WorkPlanTabProps) {
  const { user } = useAuth();
  const { workPlans, loading, error, getSignedUrl } = useWorkPlans(user?.id);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleView = async (workplanId: string) => {
    setActionLoading(workplanId);
    const newTab = window.open("about:blank", "_blank", "noopener,noreferrer");
    try {
      const url = await getSignedUrl(workplanId);
      if (url && newTab) {
        newTab.location.href = url;
      } else {
        newTab?.close();
        toast.error("Não foi possível abrir o plano de trabalho");
      }
    } catch {
      newTab?.close();
      toast.error("Erro ao abrir plano de trabalho");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownload = async (workplanId: string, fileName: string) => {
    setActionLoading(`dl-${workplanId}`);
    try {
      const url = await getSignedUrl(workplanId);
      if (url) {
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        toast.error("Não foi possível baixar o plano de trabalho");
      }
    } catch {
      toast.error("Erro ao baixar plano de trabalho");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-institutional">
        <div className="flex items-center gap-3 text-destructive">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  const filtered = workPlans.filter(
    (wp) => !searchQuery || wp.file_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (workPlans.length === 0) {
    return (
      <div className="card-institutional flex flex-col items-center justify-center py-12">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <FileText className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="font-medium text-foreground mb-1">Nenhum plano de trabalho disponível</p>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          O plano de trabalho será disponibilizado aqui após ser carregado pela gestão do programa.
        </p>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="card-institutional flex flex-col items-center justify-center py-12">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <FileText className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="font-medium text-foreground mb-1">Nenhum resultado</p>
        <p className="text-sm text-muted-foreground text-center">
          Nenhum documento encontrado para "{searchQuery}".
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border">
        <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <p className="text-sm text-muted-foreground">
          Este documento está disponível para consulta a qualquer momento.
          O plano de trabalho contém os objetivos e o cronograma da sua bolsa.
        </p>
      </div>

      <div className="space-y-3">
        {filtered.map((wp) => {
          const uploadDate = format(new Date(wp.uploaded_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
          const isActive = wp.status === "active";

          return (
            <div
              key={wp.id}
              className="card-institutional"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg border bg-card border-border hover:bg-muted/30 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-medium text-foreground">{wp.file_name}</p>
                    <Badge
                      variant={isActive ? "default" : "secondary"}
                      className={isActive ? "bg-success/10 text-success border-success/20" : ""}
                    >
                      {isActive ? (
                        <><CheckCircle className="w-3 h-3 mr-1" />Ativo</>
                      ) : (
                        <><Archive className="w-3 h-3 mr-1" />Arquivado</>
                      )}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span>Plano de Trabalho</span>
                    {wp.file_size && (
                      <>
                        <span>•</span>
                        <span>{formatFileSize(wp.file_size)}</span>
                      </>
                    )}
                    <span>•</span>
                    <span>Enviado em {uploadDate}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-primary hover:text-primary"
                    onClick={() => handleView(wp.id)}
                    disabled={actionLoading === wp.id}
                  >
                    {actionLoading === wp.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">Visualizar</span>
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleDownload(wp.id, wp.file_name)}
                    disabled={actionLoading === `dl-${wp.id}`}
                  >
                    {actionLoading === `dl-${wp.id}` ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">Baixar</span>
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
