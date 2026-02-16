import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Mail, Send, ChevronRight, Loader2, Check, ChevronsUpDown, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import { useUserRole } from "@/hooks/useUserRole";

export function MessagesTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["support-center-messages", user?.id, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("messages")
        .select("*")
        .or(`recipient_id.eq.${user!.id},sender_id.eq.${user!.id}`)
        .order("created_at", { ascending: false })
        .limit(20);

      if (statusFilter === "read") query = query.eq("read", true);
      if (statusFilter === "unread") query = query.eq("read", false);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("messages").update({ read: true, read_at: new Date().toISOString() }).eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-center-messages"] });
      queryClient.invalidateQueries({ queryKey: ["unread-messages-count"] });
    },
  });

  const filtered = messages.filter((m: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return m.subject?.toLowerCase().includes(s) || m.body?.toLowerCase().includes(s);
  });

  const handleOpenMessage = (msg: any) => {
    setSelectedMessage(msg);
    if (!msg.read && msg.recipient_id === user?.id) {
      markReadMutation.mutate(msg.id);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="p-3 border-b border-border space-y-2">
        <div className="flex gap-2">
          <Input
            placeholder="Buscar mensagens..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-sm h-9"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-28 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="unread">Não lidas</SelectItem>
              <SelectItem value="read">Lidas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Messages list */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Mail className="w-10 h-10 mb-2 opacity-40" />
            <p className="text-sm">Nenhuma mensagem</p>
          </div>
        ) : (
          filtered.map((msg: any) => (
            <button
              key={msg.id}
              onClick={() => handleOpenMessage(msg)}
              className={cn(
                "w-full text-left px-4 py-3 border-b border-border hover:bg-muted/50 transition-colors",
                !msg.read && msg.recipient_id === user?.id && "bg-primary/5"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {!msg.read && msg.recipient_id === user?.id && (
                      <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                    )}
                    <p className={cn("text-sm truncate", !msg.read && msg.recipient_id === user?.id && "font-semibold")}>
                      {msg.subject}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{msg.body}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {msg.type && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {msg.type === "SYSTEM" ? "Sistema" : msg.type === "GESTOR" ? "Gestor" : msg.type}
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
              </div>
            </button>
          ))
        )}
      </ScrollArea>

      {/* CTA */}
      <div className="p-3 border-t border-border">
        <Button
          onClick={() => setComposerOpen(true)}
          className="w-full gap-2"
        >
          <Send className="w-4 h-4" />
          Nova mensagem
        </Button>
      </div>

      {/* Message detail */}
      <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">{selectedMessage?.subject}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {selectedMessage?.type && (
                <Badge variant="outline" className="text-[10px]">{selectedMessage.type}</Badge>
              )}
              <span>
                {selectedMessage?.created_at &&
                  formatDistanceToNow(new Date(selectedMessage.created_at), { addSuffix: true, locale: ptBR })}
              </span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{selectedMessage?.body}</p>
            {selectedMessage?.link_url && (
              <a
                href={selectedMessage.link_url}
                className="text-sm text-primary underline"
                target="_blank"
                rel="noopener"
              >
                Ver detalhes
              </a>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Composer */}
      <ComposeDialog open={composerOpen} onOpenChange={setComposerOpen} />
    </div>
  );
}

function ComposeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganizationContext();
  const { role } = useUserRole();
  const isManagerOrAdmin = role === "manager" || role === "admin";

  const orgId = currentOrganization?.id;

  const [recipientId, setRecipientId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [recipientSearchOpen, setRecipientSearchOpen] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState("");

  // Fetch recipients scoped to org
  const { data: recipients = [] } = useQuery({
    queryKey: ["compose-recipients", orgId],
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
      return (data || []).filter((p: any) => p.user_id !== user?.id);
    },
    enabled: open && isManagerOrAdmin,
  });

  const filteredRecipients = useMemo(() => {
    if (!recipientSearch) return recipients;
    const s = recipientSearch.toLowerCase();
    return recipients.filter((p: any) =>
      p.full_name?.toLowerCase().includes(s) || p.email?.toLowerCase().includes(s)
    );
  }, [recipients, recipientSearch]);

  const selectedRecipient = recipients.find((r: any) => r.user_id === recipientId);

  const resetForm = () => {
    setRecipientId("");
    setSubject("");
    setBody("");
    setLinkUrl("");
    setRecipientSearch("");
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error("Preencha assunto e mensagem.");
      return;
    }

    setSending(true);
    try {
      if (isManagerOrAdmin && recipientId) {
        // Send via edge function for managers/admins
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
        const emailNote = response.data?.email_sent === false ? " (e-mail não enviado)" : "";
        toast.success(`Mensagem enviada!${emailNote}`);
      } else {
        // Scholar: send as support message
        const { error } = await supabase.from("messages").insert({
          recipient_id: user!.id,
          sender_id: user!.id,
          subject,
          body,
          type: "GESTOR",
          event_type: "SUPPORT",
          organization_id: orgId || null,
          link_url: linkUrl || null,
        });
        if (error) throw error;
        toast.success("Mensagem enviada.");
      }

      resetForm();
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["support-center-messages"] });
      queryClient.invalidateQueries({ queryKey: ["unread-messages-count"] });
    } catch (e: any) {
      console.error("Erro ao enviar:", e);
      toast.error("Erro ao enviar mensagem.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Nova Mensagem
          </DialogTitle>
          <DialogDescription>
            {isManagerOrAdmin
              ? "Envie uma mensagem para um membro da organização."
              : "Envie uma mensagem de suporte."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {/* Recipient autocomplete for managers/admins */}
          {isManagerOrAdmin && (
            <div className="space-y-1.5">
              <Label>Destinatário *</Label>
              <Popover open={recipientSearchOpen} onOpenChange={setRecipientSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={recipientSearchOpen}
                    className="w-full justify-between font-normal h-9 text-sm"
                  >
                    {selectedRecipient
                      ? (selectedRecipient.full_name || selectedRecipient.email || "Sem nome")
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
                        {filteredRecipients.map((r: any) => (
                          <CommandItem
                            key={r.user_id}
                            value={r.user_id}
                            onSelect={() => {
                              setRecipientId(r.user_id);
                              setRecipientSearchOpen(false);
                              setRecipientSearch("");
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", recipientId === r.user_id ? "opacity-100" : "opacity-0")} />
                            <div className="flex flex-col">
                              <span className="text-sm">{r.full_name || "Sem nome"}</span>
                              {r.email && <span className="text-xs text-muted-foreground">{r.email}</span>}
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

          <div className="space-y-1.5">
            <Label>Assunto *</Label>
            <Input
              placeholder="Assunto"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={200}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Mensagem *</Label>
            <Textarea
              placeholder="Escreva sua mensagem..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              maxLength={5000}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5" />
              Link (opcional)
            </Label>
            <Input
              placeholder="https://..."
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              type="url"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSend} disabled={sending || (isManagerOrAdmin && !recipientId)}>
            {sending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
