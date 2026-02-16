import { useState } from "react";
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
import { Loader2, ImagePlus } from "lucide-react";
import { RichTextEditor } from "./RichTextEditor";

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
      setContent("");
      onCreated();
    } catch (err: any) {
      toast.error("Erro ao criar publicação: " + (err.message || "Erro desconhecido"));
    } finally {
      setSending(false);
    }
  };

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

          <div className="space-y-2">
            <Label htmlFor="news-cover">
              <span className="flex items-center gap-1.5">
                <ImagePlus className="h-4 w-4" />
                URL da imagem de capa
              </span>
            </Label>
            <Input
              id="news-cover"
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              placeholder="https://exemplo.com/imagem.jpg (opcional)"
            />
            {coverImageUrl && (
              <div className="relative rounded-lg overflow-hidden h-32 bg-muted">
                <img
                  src={coverImageUrl}
                  alt="Preview capa"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
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
