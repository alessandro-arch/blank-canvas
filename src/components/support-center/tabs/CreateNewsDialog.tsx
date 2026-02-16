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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

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
        created_by: user.id,
        organization_id: currentOrganization?.id || null,
        is_published: true,
        published_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast.success("Publicação criada com sucesso");
      setTitle("");
      setSummary("");
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Publicação</DialogTitle>
          <DialogDescription>Crie uma nova notícia para sua organização.</DialogDescription>
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
            <Label htmlFor="news-content">Conteúdo *</Label>
            <Textarea
              id="news-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Escreva o conteúdo completo da publicação..."
              rows={8}
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
