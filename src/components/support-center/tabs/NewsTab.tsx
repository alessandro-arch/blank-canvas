import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Megaphone, ChevronRight, Loader2, Plus, ArrowLeft, X, Calendar } from "lucide-react";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useUserRole } from "@/hooks/useUserRole";
import { CreateNewsDialog } from "./CreateNewsDialog";

interface NewsPost {
  id: string;
  title: string;
  summary: string | null;
  content: string;
  published_at: string | null;
  is_published: boolean;
  created_at: string;
}

export function NewsTab() {
  const [selected, setSelected] = useState<NewsPost | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const { hasManagerAccess } = useUserRole();

  const { data: posts = [], isLoading, refetch } = useQuery({
    queryKey: ["support-center-news"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_posts")
        .select("*")
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as NewsPost[];
    },
  });

  // Detail view (blog-style)
  if (selected) {
    return (
      <div className="flex flex-col h-full">
        {/* Detail header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <button
            onClick={() => setSelected(null)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h3 className="text-sm font-semibold truncate flex-1">{selected.title}</h3>
          <button
            onClick={() => setSelected(null)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Blog content */}
        <ScrollArea className="flex-1">
          <div className="p-5 space-y-4">
            <h1 className="text-xl font-bold leading-tight">{selected.title}</h1>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              {selected.published_at
                ? formatDistanceToNow(new Date(selected.published_at), { addSuffix: true, locale: ptBR })
                : ""}
            </div>

            {selected.summary && (
              <p className="text-sm text-muted-foreground italic border-l-2 border-primary/30 pl-3">
                {selected.summary}
              </p>
            )}

            <div className="text-sm leading-relaxed whitespace-pre-wrap">
              {selected.content}
            </div>
          </div>
        </ScrollArea>
      </div>
    );
  }

  // List view
  return (
    <div className="flex flex-col h-full">
      {/* Header with create button */}
      {hasManagerAccess && (
        <div className="px-4 pt-3 pb-1 flex justify-end">
          <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5">
            <Plus className="w-4 h-4" />
            Nova publicação
          </Button>
        </div>
      )}

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Megaphone className="w-10 h-10 mb-2 opacity-40" />
            <p className="text-sm">Nenhuma novidade</p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {posts.map((post) => (
              <button
                key={post.id}
                onClick={() => setSelected(post)}
                className="w-full text-left bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow group"
              >
                {/* Card header accent */}
                <div className="h-1.5 bg-gradient-to-r from-primary/60 to-primary/20" />

                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <h4 className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors">
                        {post.title}
                      </h4>
                      {post.summary && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {post.summary}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {post.published_at
                          ? formatDistanceToNow(new Date(post.published_at), { addSuffix: true, locale: ptBR })
                          : ""}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1 group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>

      {showCreate && (
        <CreateNewsDialog
          open={showCreate}
          onOpenChange={setShowCreate}
          onCreated={() => {
            refetch();
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
}
