import { useState } from "react";
import { FileText, Download, Eye, CheckCircle, Clock, Info, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useGrantTerm } from "@/hooks/useGrantTerm";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function formatFileSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface GrantTermTabProps {
  searchQuery?: string;
}

export function GrantTermTab({ searchQuery = "" }: GrantTermTabProps) {
  const { user } = useAuth();
  const { grantTerm, loading, error } = useGrantTerm(user?.id);
  const [viewLoading, setViewLoading] = useState(false);

  const handleView = async () => {
    if (!grantTerm) return;
    const newWindow = window.open("about:blank", "_blank");
    setViewLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from("grant-terms")
        .createSignedUrl(grantTerm.fileUrl, 900);
      if (error) throw error;
      if (data?.signedUrl) {
        if (newWindow) {
          newWindow.location.href = data.signedUrl;
        } else {
          toast.error("Permita pop-ups no navegador para visualizar o arquivo");
        }
      } else {
        newWindow?.close();
        toast.error("Link de acesso não disponível");
      }
    } catch (err) {
      console.error("Error opening grant term:", err);
      newWindow?.close();
      toast.error("Erro ao abrir o termo de outorga");
    } finally {
      setViewLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!grantTerm) return;
    try {
      const { data, error } = await supabase.storage
        .from("grant-terms")
        .createSignedUrl(grantTerm.fileUrl, 900);
      if (error) throw error;
      if (data?.signedUrl) {
        const link = document.createElement("a");
        link.href = data.signedUrl;
        link.download = grantTerm.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        toast.error("Link de acesso não disponível");
      }
    } catch (err) {
      console.error("Error downloading grant term:", err);
      toast.error("Erro ao baixar o termo de outorga");
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

  if (!grantTerm) {
    return (
      <div className="card-institutional flex flex-col items-center justify-center py-12">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <FileText className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="font-medium text-foreground mb-1">Nenhum termo disponível</p>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          O termo de outorga será disponibilizado aqui após ser carregado pela gestão do programa.
        </p>
      </div>
    );
  }

  // Filter by search
  if (searchQuery && !grantTerm.fileName.toLowerCase().includes(searchQuery.toLowerCase())) {
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

  const signedDate = format(new Date(grantTerm.signedAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="space-y-4">
      {/* Info message */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border">
        <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <p className="text-sm text-muted-foreground">
          Este documento está disponível para consulta a qualquer momento. 
          Guarde uma cópia para seus registros pessoais.
        </p>
      </div>

      {/* Document Card */}
      <div className="card-institutional">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg border bg-card border-border hover:bg-muted/30 transition-colors">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-muted-foreground" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className="font-medium text-foreground">{grantTerm.fileName}</p>
              <span className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                "bg-success/10 text-success"
              )}>
                <CheckCircle className="w-3 h-3" />
                Assinado
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>Termo de Outorga</span>
              {grantTerm.fileSize && (
                <>
                  <span>•</span>
                  <span>{formatFileSize(grantTerm.fileSize)}</span>
                </>
              )}
              <span>•</span>
              <span>Assinado em {signedDate}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-1.5 text-primary hover:text-primary"
              onClick={handleView}
              disabled={viewLoading}
            >
              {viewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
              <span className="hidden sm:inline">Visualizar</span>
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              className="gap-1.5"
              onClick={handleDownload}
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Baixar</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
