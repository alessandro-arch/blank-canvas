import { FileText, Mail, FolderOpen, LifeBuoy, Newspaper, ChevronRight } from "lucide-react";
import { useSupportCenter } from "@/contexts/SupportCenterContext";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function HomeTab() {
  const { user } = useAuth();
  const { setActiveTab } = useSupportCenter();

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "Usuário";

  const { data: recentNews = [] } = useQuery({
    queryKey: ["support-center-news-preview"],
    queryFn: async () => {
      const { data } = await supabase
        .from("news_posts")
        .select("id, title, published_at")
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(3);
      return data || [];
    },
  });

  const { data: pendingReports = 0 } = useQuery({
    queryKey: ["support-center-pending-reports", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("status", "under_review");
      return count || 0;
    },
    enabled: !!user?.id,
  });

  return (
    <div className="p-4 space-y-4">
      {/* Greeting */}
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-5">
        <h3 className="text-xl font-bold text-foreground">
          Olá, {firstName} 👋
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Como podemos ajudar hoje?
        </p>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Pendências */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <FileText className="w-4 h-4 text-warning" />
            Pendências
          </div>
          <p className="text-xs text-muted-foreground">
            {pendingReports > 0
              ? `${pendingReports} relatório(s) em análise`
              : "Nenhuma pendência"}
          </p>
        </div>

        {/* Suporte */}
        <button
          onClick={() => setActiveTab("messages")}
          className="bg-card border border-border rounded-lg p-4 space-y-2 text-left hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            <LifeBuoy className="w-4 h-4 text-info" />
            Suporte
          </div>
          <p className="text-xs text-muted-foreground">
            Enviar mensagem
          </p>
        </button>
      </div>

      {/* Atalhos */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground">Atalhos</h4>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab("messages")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-xs font-medium hover:bg-muted/80 transition-colors"
          >
            <Mail className="w-3.5 h-3.5" /> Mensagens
          </button>
          <button
            onClick={() => setActiveTab("news")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-xs font-medium hover:bg-muted/80 transition-colors"
          >
            <Newspaper className="w-3.5 h-3.5" /> Novidades
          </button>
          <button
            onClick={() => setActiveTab("help")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-xs font-medium hover:bg-muted/80 transition-colors"
          >
            <FolderOpen className="w-3.5 h-3.5" /> Ajuda
          </button>
        </div>
      </div>

      {/* Recent news */}
      {recentNews.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground">Atualizações</h4>
          <div className="space-y-1">
            {recentNews.map((news: any) => (
              <button
                key={news.id}
                onClick={() => setActiveTab("news")}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-card border border-border hover:bg-muted/50 transition-colors text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{news.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {news.published_at
                      ? formatDistanceToNow(new Date(news.published_at), { addSuffix: true, locale: ptBR })
                      : ""}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
