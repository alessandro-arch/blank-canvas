import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ImagePlus, Upload, Link, X } from "lucide-react";
import { RichTextEditor } from "./RichTextEditor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CreateNewsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateNewsDialog({ open, onOpenChange, onCreated }: CreateNewsDialogProps) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationContext();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Apenas arquivos de imagem são permitidos");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 5MB");
      return;
    }

    // Validate dimensions before uploading
    const checkDimensions = (): Promise<{ width: number; height: number }> =>
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.onerror = () => resolve({ width: 0, height: 0 });
        img.src = URL.createObjectURL(file);
      });

    setUploading(true);
    try {
      const { width, height } = await checkDimensions();

      if (width > 0 && height > 0) {
        const ratio = width / height;
        const idealRatio = 1200 / 630;
        const ratioDiff = Math.abs(ratio - idealRatio) / idealRatio;

        if (width < 800 || height < 400) {
          toast.warning(
            `Imagem pequena (${width}×${height}px). Recomendado: 1200×630px para melhor qualidade.`,
            { duration: 5000 }
          );
        } else if (ratioDiff > 0.15) {
          toast.warning(
            `Proporção diferente do recomendado (${width}×${height}px). Ideal: 16:9 (ex: 1200×630px). A imagem será recortada automaticamente.`,
            { duration: 5000 }
          );
        }
      }

      const ext = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("news-images")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("news-images")
        .getPublicUrl(fileName);

      setCoverImageUrl(urlData.publicUrl);
      setUploadedPreview(urlData.publicUrl);
      toast.success("Imagem enviada com sucesso");
    } catch (err: any) {
      toast.error("Erro ao enviar imagem: " + (err.message || "Erro desconhecido"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const clearCoverImage = () => {
    setCoverImageUrl("");
    setUploadedPreview(null);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim() || !user) return;

    setSending(true);
    try {
      const { error } = await supabase.from("news_posts").insert({
        title: title.trim(),
        summary: summary.trim() || null,
        content: content.trim(),
        cover_image_url: coverImageUrl.trim() || null,
        created_by: user.id,
        organization_id: currentOrganization?.id || null,
        is_published: true,
        published_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast.success("Publicação criada com sucesso");
      setTitle("");
      setSummary("");
      setCoverImageUrl("");
      setUploadedPreview(null);
      setContent("");
      onCreated();
    } catch (err: any) {
      toast.error("Erro ao criar publicação: " + (err.message || "Erro desconhecido"));
    } finally {
      setSending(false);
    }
  };

  const currentPreview = coverImageUrl || uploadedPreview;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Publicação</DialogTitle>
          <DialogDescription>Crie uma notícia com formatação rica para sua organização.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="news-title">Título *</Label>
            <Input
              id="news-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título da publicação"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="news-summary">Resumo</Label>
            <Input
              id="news-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Breve resumo (opcional)"
            />
          </div>

          {/* Cover image section */}
          <div className="space-y-2">
            <Label>
              <span className="flex items-center gap-1.5">
                <ImagePlus className="h-4 w-4" />
                Imagem de capa (opcional)
              </span>
            </Label>

            {currentPreview ? (
              <div className="relative rounded-lg overflow-hidden h-36 bg-muted group">
                <img
                  src={currentPreview}
                  alt="Preview capa"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <button
                  type="button"
                  onClick={clearCoverImage}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 hover:bg-background text-foreground shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Tabs defaultValue="upload" className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-9">
                  <TabsTrigger value="upload" className="text-xs gap-1.5">
                    <Upload className="h-3.5 w-3.5" />
                    Upload
                  </TabsTrigger>
                  <TabsTrigger value="url" className="text-xs gap-1.5">
                    <Link className="h-3.5 w-3.5" />
                    URL
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="mt-2">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Enviando...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          Clique para selecionar uma imagem
                        </span>
                        <span className="text-[10px] text-muted-foreground/70">
                          Tamanho recomendado: 1200 × 630px (16:9) · Máx. 5MB · JPG, PNG ou WebP
                        </span>
                      </>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </TabsContent>

                <TabsContent value="url" className="mt-2">
                  <Input
                    value={coverImageUrl}
                    onChange={(e) => setCoverImageUrl(e.target.value)}
                    placeholder="https://exemplo.com/imagem.jpg"
                  />
                </TabsContent>
              </Tabs>
            )}
          </div>

          <div className="space-y-2">
            <Label>Conteúdo *</Label>
            <RichTextEditor
              content={content}
              onChange={setContent}
              placeholder="Escreva o conteúdo completo da publicação..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={sending || !title.trim() || !content.trim()}>
            {sending && <Loader2 className="w-4 h-4 animate-spin" />}
            Publicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
