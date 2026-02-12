import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Plus, FileCode } from "lucide-react";
import { toast } from "sonner";
import { ComposeMessageDialog } from "@/components/messages/ComposeMessageDialog";
import { MessageMetricsCards } from "@/components/messages/MessageMetricsCards";
import { MessageFiltersBar, DEFAULT_FILTERS, type MessageFilters } from "@/components/messages/MessageFiltersBar";
import { MessagesTable } from "@/components/messages/MessagesTable";
import { MessageDetailDrawer } from "@/components/messages/MessageDetailDrawer";
import { DeleteMessageDialog } from "@/components/messages/DeleteMessageDialog";
import { ResendMessageDialog } from "@/components/messages/ResendMessageDialog";
import { EmailTemplateEditorDrawer } from "@/components/messages/EmailTemplateEditorDrawer";
import { useAuditLog } from "@/hooks/useAuditLog";

export interface EnrichedMessage {
  id: string;
  sender_id: string | null;
  recipient_id: string;
  subject: string;
  body: string;
  read: boolean;
  read_at: string | null;
  created_at: string;
  organization_id: string | null;
  type: string;
  event_type: string | null;
  link_url: string | null;
  email_status: string | null;
  email_error: string | null;
  campaign_code: string | null;
  provider: string | null;
  provider_message_id: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  deleted_at: string | null;
  recipient_name: string | null;
  recipient_email: string | null;
}

const PAGE_SIZE = 20;

export default function AdminMessages() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  const [composeOpen, setComposeOpen] = useState(false);
  const [filters, setFilters] = useState<MessageFilters>(DEFAULT_FILTERS);
  const [groupByCampaign, setGroupByCampaign] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedMessage, setSelectedMessage] = useState<EnrichedMessage | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EnrichedMessage | null>(null);
  const [resendTarget, setResendTarget] = useState<EnrichedMessage | null>(null);
  const [templateEditorOpen, setTemplateEditorOpen] = useState(false);

  // Fetch all messages (org-scoped via RLS)
  const { data: rawMessages = [], isLoading, dataUpdatedAt } = useQuery({
    queryKey: ["admin-messages-v2", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch recipient profiles in a single query
      const recipientIds = [...new Set((data || []).map((m) => m.recipient_id))];
      let profileMap = new Map<string, { full_name: string | null; email: string | null }>();
      if (recipientIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", recipientIds);
        profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
      }

      return (data || []).map((m) => ({
        ...m,
        campaign_code: (m as any).campaign_code || null,
        provider: (m as any).provider || null,
        provider_message_id: (m as any).provider_message_id || null,
        sent_at: (m as any).sent_at || null,
        delivered_at: (m as any).delivered_at || null,
        deleted_at: (m as any).deleted_at || null,
        recipient_name: profileMap.get(m.recipient_id)?.full_name || null,
        recipient_email: profileMap.get(m.recipient_id)?.email || null,
      })) as EnrichedMessage[];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Apply filters + search client-side
  const filteredMessages = useMemo(() => {
    let result = rawMessages;

    // Search
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (m) =>
          m.subject.toLowerCase().includes(q) ||
          m.body.toLowerCase().includes(q) ||
          (m.recipient_name?.toLowerCase().includes(q)) ||
          (m.recipient_email?.toLowerCase().includes(q))
      );
    }

    // Status
    if (filters.status !== "all") {
      result = result.filter((m) => {
        switch (filters.status) {
          case "delivered": return m.email_status === "sent" && !m.read;
          case "read": return m.read;
          case "unread": return !m.read && m.email_status !== "failed";
          case "failed": return m.email_status === "failed" || !!m.email_error;
          default: return true;
        }
      });
    }

    // Type
    if (filters.type !== "all") {
      result = result.filter((m) => {
        switch (filters.type) {
          case "manual": return m.type === "GESTOR";
          case "system": return m.type === "SYSTEM";
          case "reminder": return m.event_type === "monthly_reminder";
          default: return true;
        }
      });
    }

    // Event type
    if (filters.eventType !== "all") {
      result = result.filter((m) => m.event_type === filters.eventType || (!m.event_type && filters.eventType === "general"));
    }

    // Sort
    switch (filters.sortBy) {
      case "oldest":
        result = [...result].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case "unread_first":
        result = [...result].sort((a, b) => (a.read === b.read ? 0 : a.read ? 1 : -1));
        break;
      case "errors_first":
        result = [...result].sort((a, b) => {
          const aFailed = a.email_status === "failed" || !!a.email_error ? 0 : 1;
          const bFailed = b.email_status === "failed" || !!b.email_error ? 0 : 1;
          return aFailed - bFailed;
        });
        break;
      default: // newest - already sorted from query
        break;
    }

    return result;
  }, [rawMessages, filters]);

  // Metrics
  const metrics = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const total = filteredMessages.length;
    const unread = filteredMessages.filter((m) => !m.read && m.email_status !== "failed").length;
    const failed = filteredMessages.filter((m) => m.email_status === "failed" || !!m.email_error).length;
    const sentThisMonth = filteredMessages.filter((m) => m.sent_at && new Date(m.sent_at) >= monthStart).length;
    const delivered = filteredMessages.filter((m) => m.email_status === "sent" || m.read).length;
    const readCount = filteredMessages.filter((m) => m.read).length;
    const readRate = delivered > 0 ? Math.round((readCount / delivered) * 100) : 0;

    return { total, unread, failed, sentThisMonth, readRate };
  }, [filteredMessages]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredMessages.length / PAGE_SIZE));
  const pagedMessages = filteredMessages.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Soft delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from("messages")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", messageId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mensagem excluída com sucesso.");
      queryClient.invalidateQueries({ queryKey: ["admin-messages-v2"] });
      setDeleteTarget(null);
    },
    onError: () => toast.error("Erro ao excluir mensagem."),
  });

  // Resend mutation (creates new message via edge function)
  const resendMutation = useMutation({
    mutationFn: async (msg: EnrichedMessage) => {
      const response = await supabase.functions.invoke("send-message-email", {
        body: { recipient_id: msg.recipient_id, subject: msg.subject, body: msg.body },
      });
      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      toast.success("Mensagem reenviada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["admin-messages-v2"] });
      setResendTarget(null);
    },
    onError: () => toast.error("Erro ao reenviar mensagem."),
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await logAction({
      action: "bulk_delete" as any,
      entityType: "user" as any,
      entityId: deleteTarget.id,
      details: { action: "delete_message", subject: deleteTarget.subject },
    });
    deleteMutation.mutate(deleteTarget.id);
  };

  const handleResend = () => {
    if (!resendTarget) return;
    resendMutation.mutate(resendTarget);
  };

  const handleView = (msg: EnrichedMessage) => {
    setSelectedMessage(msg);
    setDrawerOpen(true);
  };

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Page header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Mensagens</h1>
                <p className="text-muted-foreground text-sm">
                  Gerencie comunicações com bolsistas (manual e automáticas).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setTemplateEditorOpen(true)}>
                  <FileCode className="w-4 h-4 mr-2" />
                  Templates
                </Button>
                <Button onClick={() => setComposeOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Mensagem
                </Button>
              </div>
            </div>


            {/* Filters */}
            <MessageFiltersBar
              filters={filters}
              onChange={(f) => { setFilters(f); setPage(1); }}
              onClear={() => { setFilters(DEFAULT_FILTERS); setPage(1); }}
            />

            {/* Table */}
            <MessagesTable
              messages={pagedMessages}
              loading={isLoading}
              groupByCampaign={groupByCampaign}
              onToggleGroup={setGroupByCampaign}
              onView={handleView}
              onResend={(msg) => setResendTarget(msg)}
              onDelete={(msg) => setDeleteTarget(msg)}
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        </main>
        <Footer />
      </div>

      {/* Compose */}
      <ComposeMessageDialog open={composeOpen} onOpenChange={setComposeOpen} />

      {/* Detail Drawer */}
      <MessageDetailDrawer
        message={selectedMessage}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelectedMessage(null); }}
        onResend={(msg) => { setDrawerOpen(false); setResendTarget(msg); }}
      />

      {/* Delete Dialog */}
      <DeleteMessageDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
        subject={deleteTarget?.subject || ""}
      />

      {/* Resend Dialog */}
      <ResendMessageDialog
        open={!!resendTarget}
        onOpenChange={(v) => { if (!v) setResendTarget(null); }}
        onConfirm={handleResend}
        loading={resendMutation.isPending}
        subject={resendTarget?.subject || ""}
        isFailed={resendTarget?.email_status === "failed" || !!resendTarget?.email_error}
      />

      {/* Template Editor */}
      <EmailTemplateEditorDrawer
        open={templateEditorOpen}
        onClose={() => setTemplateEditorOpen(false)}
      />
    </div>
  );
}
