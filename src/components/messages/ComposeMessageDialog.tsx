import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { Send, FileText, Check, ChevronsUpDown, Link as LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrganizationContext } from "@/contexts/OrganizationContext";

interface ComposeMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedRecipientId?: string;
  preselectedRecipientName?: string;
}

export function ComposeMessageDialog({ open, onOpenChange, preselectedRecipientId, preselectedRecipientName }: ComposeMessageDialogProps) {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganizationContext();
  const [recipientId, setRecipientId] = useState(preselectedRecipientId || "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [recipientSearchOpen, setRecipientSearchOpen] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState("");

  const orgId = currentOrganization?.id;

  // Fetch profiles scoped to current organization
  const { data: scholars = [] } = useQuery({
    queryKey: ["scholars-for-messages", orgId],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .order("full_name");
      if (orgId) {
        query = query.eq("organization_id", orgId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: open && !preselectedRecipientId,
  });

  // Fetch message templates scoped to org
  const { data: templates = [] } = useQuery({
    queryKey: ["message-templates", orgId],
    queryFn: async () => {
      let query = supabase.from("message_templates").select("*").order("name");
      if (orgId) {
        query = query.or(`organization_id.eq.${orgId},organization_id.is.null`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const filteredScholars = useMemo(() => {
    if (!recipientSearch) return scholars;
    const s = recipientSearch.toLowerCase();
    return scholars.filter((p: any) =>
      p.full_name?.toLowerCase().includes(s) || p.email?.toLowerCase().includes(s)
    );
  }, [scholars, recipientSearch]);

  const selectedScholar = scholars.find((s: any) => s.user_id === recipientId);

  const sendMessage = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const response = await supabase.functions.invoke("send-message-email", {
        body: {
          recipient_id: recipientId,
          subject,
          body,
          link_url: linkUrl || undefined,
          organization_id: orgId || undefined,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      const emailNote = data?.email_sent === false ? " (e-mail não enviado)" : "";
      toast.success(`Mensagem enviada com sucesso!${emailNote}`);
      queryClient.invalidateQueries({ queryKey: ["sent-messages"] });
      queryClient.invalidateQueries({ queryKey: ["support-center-messages"] });
      queryClient.invalidateQueries({ queryKey: ["unread-messages-count"] });
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
    setLinkUrl("");
    setSelectedTemplate("");
    setRecipientSearch("");
  };

  const applyTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find((t: any) => t.id === templateId);
    if (template) {
      setSubject(template.subject);
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
            Envie uma mensagem para um membro da organização. Ele receberá no sistema e por e-mail.
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

          {/* Recipient with autocomplete */}
          {preselectedRecipientId ? (
            <div className="space-y-2">
              <Label>Destinatário</Label>
              <Input value={preselectedRecipientName || "Bolsista selecionado"} disabled />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Destinatário *</Label>
              <Popover open={recipientSearchOpen} onOpenChange={setRecipientSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={recipientSearchOpen}
                    className="w-full justify-between font-normal"
                  >
                    {selectedScholar
                      ? (selectedScholar.full_name || selectedScholar.email || "Sem nome")
                      : "Buscar destinatário..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Buscar por nome ou e-mail..."
                      value={recipientSearch}
                      onValueChange={setRecipientSearch}
                    />
                    <CommandList>
                      <CommandEmpty>Nenhum destinatário encontrado.</CommandEmpty>
                      <CommandGroup>
                        {filteredScholars.map((s: any) => (
                          <CommandItem
                            key={s.user_id}
                            value={s.user_id}
                            onSelect={() => {
                              setRecipientId(s.user_id);
                              setRecipientSearchOpen(false);
                              setRecipientSearch("");
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", recipientId === s.user_id ? "opacity-100" : "opacity-0")} />
                            <div className="flex flex-col">
                              <span className="text-sm">{s.full_name || "Sem nome"}</span>
                              {s.email && <span className="text-xs text-muted-foreground">{s.email}</span>}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
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
              rows={6}
              maxLength={5000}
            />
          </div>

          {/* Link URL (optional) */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <LinkIcon className="w-4 h-4" />
              Link (opcional)
            </Label>
            <Input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://..."
              type="url"
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
