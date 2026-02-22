import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Paperclip, Plus, X, FileText, Image, Download, Eye, Loader2, Info } from "lucide-react";
import { useReportAttachments, type ReportAttachment } from "@/hooks/useReportAttachments";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Props {
  reportId: string | null;
  isEditable: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ type }: { type: string }) {
  if (type === "pdf") return <FileText className="w-4 h-4 text-red-500" />;
  return <Image className="w-4 h-4 text-blue-500" />;
}

export function ReportAttachmentsSection({ reportId, isEditable }: Props) {
  const {
    attachments, loading, uploading, uploadAttachment,
    removeAttachment, getSignedUrl, canAddMore,
  } = useReportAttachments(reportId, isEditable);

  const [caption, setCaption] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!reportId) return null;

  // Don't render section if read-only and no attachments
  if (!isEditable && attachments.length === 0 && !loading) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    await uploadAttachment(selectedFile, caption);
    setSelectedFile(null);
    setCaption("");
    setShowForm(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleView = async (att: ReportAttachment) => {
    setViewingId(att.id);
    const url = await getSignedUrl(att.file_path);
    if (url) window.open(url, "_blank");
    setViewingId(null);
  };

  const handleDownload = async (att: ReportAttachment) => {
    const url = await getSignedUrl(att.file_path);
    if (url) {
      const a = document.createElement("a");
      a.href = url;
      a.download = att.file_name;
      a.click();
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-primary" />
          <CardTitle className="text-sm font-medium">
            Anexos de Resultados
            <span className="text-muted-foreground font-normal ml-1">(opcional)</span>
          </CardTitle>
          <span className="text-xs text-muted-foreground ml-auto">
            {attachments.length}/5
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isEditable && (
          <Alert className="border-muted bg-muted/30">
            <Info className="w-3.5 h-3.5" />
            <AlertDescription className="text-xs text-muted-foreground">
              Anexe resultados relevantes como gráficos, tabelas, fotos de atividades ou evidências documentais.
              Recomendado: 1 PDF com figuras principais. Máx. 2 MB por arquivo.
            </AlertDescription>
          </Alert>
        )}

        {/* Existing attachments */}
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Carregando anexos...
          </div>
        ) : (
          attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-start gap-3 p-2.5 rounded-md border bg-card hover:bg-accent/30 transition-colors"
            >
              <div className="mt-0.5 shrink-0">
                <FileIcon type={att.file_type} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{att.file_name}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{att.caption}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {formatFileSize(att.file_size_bytes)} · {att.file_type.toUpperCase()}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleView(att)}
                  disabled={viewingId === att.id}
                  title="Visualizar"
                >
                  {viewingId === att.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleDownload(att)}
                  title="Baixar"
                >
                  <Download className="w-3.5 h-3.5" />
                </Button>
                {isEditable && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => removeAttachment(att.id, att.file_path)}
                    title="Remover"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}

        {/* Upload form */}
        {isEditable && canAddMore && (
          <>
            {!showForm ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setShowForm(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Adicionar anexo
              </Button>
            ) : (
              <div className="space-y-3 p-3 rounded-md border border-dashed bg-muted/20">
                <div>
                  <Label className="text-xs">Arquivo (PDF, PNG ou JPEG — máx. 2 MB)</Label>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileSelect}
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">
                    Legenda *
                    <span className="text-muted-foreground font-normal ml-1">
                      ({caption.length}/400)
                    </span>
                  </Label>
                  <Input
                    placeholder="Descreva brevemente o conteúdo deste anexo..."
                    value={caption}
                    onChange={(e) => setCaption(e.target.value.slice(0, 400))}
                    className="mt-1"
                    maxLength={400}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleUpload}
                    disabled={!selectedFile || !caption.trim() || uploading}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      "Enviar"
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowForm(false);
                      setSelectedFile(null);
                      setCaption("");
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
