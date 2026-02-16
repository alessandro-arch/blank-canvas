import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Mail, Send, ChevronRight, Filter, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast({ title: "Preencha assunto e mensagem.", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      // For MVP, send as support message to self (system inbox)
      const { error } = await supabase.from("messages").insert({
        recipient_id: user!.id,
        sender_id: user!.id,
        subject,
        body,
        type: "GESTOR",
        event_type: "SUPPORT",
      });
      if (error) throw error;
      toast({ title: "Mensagem enviada." });
      setSubject("");
      setBody("");
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["support-center-messages"] });
    } catch (e: any) {
      toast({ title: "Erro ao enviar.", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Mensagem</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Assunto"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <Textarea
            placeholder="Escreva sua mensagem..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
