import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Send, FileText } from "lucide-react";

interface ComposeMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedRecipientId?: string;
  preselectedRecipientName?: string;
}

export function ComposeMessageDialog({ open, onOpenChange, preselectedRecipientId, preselectedRecipientName }: ComposeMessageDialogProps) {
  const queryClient = useQueryClient();
  const [recipientId, setRecipientId] = useState(preselectedRecipientId || "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");

  // Fetch scholars for recipient selection
  const { data: scholars = [] } = useQuery({
    queryKey: ["scholars-for-messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .order("full_name");
      if (error) throw error;
      return data || [];
    },
    enabled: open && !preselectedRecipientId,
  });

  // Fetch message templates
  const { data: templates = [] } = useQuery({
    queryKey: ["message-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_templates")
        .select("*")
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const sendMessage = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const response = await supabase.functions.invoke("send-message-email", {
        body: { recipient_id: recipientId, subject, body },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      const emailNote = data?.email_sent === false ? " (e-mail não enviado)" : "";
      toast.success(`Mensagem enviada com sucesso!${emailNote}`);
      queryClient.invalidateQueries({ queryKey: ["sent-messages"] });
      resetForm();
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error sending message:", error);
      toast.error("Erro ao enviar mensagem. Tente novamente.");
    },
  });

  const resetForm = () => {
    if (!preselectedRecipientId) setRecipientId("");
    setSubject("");
    setBody("");
    setSelectedTemplate("");
  };

  const applyTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find((t: any) => t.id === templateId);
    if (template) {
      setSubject(template.subject);
      // Only set body if it's not a placeholder like {{body}}
      const templateBody = template.body;
      if (templateBody && !templateBody.trim().startsWith('{{')) {
        setBody(templateBody);
      } else {
        setBody("");
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientId || !subject.trim() || !body.trim()) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    sendMessage.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Nova Mensagem
          </DialogTitle>
          <DialogDescription>
            Envie uma mensagem para o bolsista. Ele receberá no sistema e por e-mail.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Template Selector */}
          {templates.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                Template (opcional)
              </Label>
              <Select value={selectedTemplate} onValueChange={applyTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Recipient */}
          {preselectedRecipientId ? (
            <div className="space-y-2">
              <Label>Destinatário</Label>
              <Input value={preselectedRecipientName || "Bolsista selecionado"} disabled />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Destinatário *</Label>
              <Select value={recipientId} onValueChange={setRecipientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o bolsista..." />
                </SelectTrigger>
                <SelectContent>
                  {scholars.map((s: any) => (
                    <SelectItem key={s.user_id} value={s.user_id}>
                      {s.full_name || s.email || "Sem nome"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Subject */}
          <div className="space-y-2">
            <Label>Assunto *</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Assunto da mensagem"
              maxLength={200}
            />
          </div>

          {/* Body */}
          <div className="space-y-2">
            <Label>Mensagem *</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Escreva sua mensagem..."
              rows={8}
              maxLength={5000}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={sendMessage.isPending}>
              {sendMessage.isPending ? "Enviando..." : "Enviar Mensagem"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
