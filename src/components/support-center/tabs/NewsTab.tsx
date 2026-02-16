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
  cover_image_url: string | null;
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

  // ─── Detail view (blog-style like Tess) ───
  if (selected) {
    return (
      <div className="flex flex-col h-full">
        {/* Header bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-10">
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

        <ScrollArea className="flex-1">
          {/* Hero cover image */}
          {selected.cover_image_url && (
            <div className="relative w-full h-48 sm:h-56 overflow-hidden bg-muted">
              <img
                src={selected.cover_image_url}
                alt={selected.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
            </div>
          )}

          {/* Article content */}
          <div className="px-5 py-5 space-y-4">
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

            {/* Rich HTML content */}
            <div
              className="news-article-content text-sm leading-relaxed
                [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-5 [&_h2]:mb-2
                [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1.5
                [&_p]:mb-3
                [&_blockquote]:border-l-2 [&_blockquote]:border-primary/30 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_blockquote]:my-3
                [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3
                [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3
                [&_li]:mb-1
                [&_a]:text-primary [&_a]:underline
                [&_img]:rounded-lg [&_img]:max-w-full [&_img]:my-4
                [&_hr]:my-4 [&_hr]:border-border
                [&_strong]:font-semibold
                [&_em]:italic"
              dangerouslySetInnerHTML={{ __html: selected.content }}
            />
          </div>
        </ScrollArea>
      </div>
    );
  }

  // ─── List view (card feed with cover images) ───
  return (
    <div className="flex flex-col h-full">
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
                className="w-full text-left bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-all group"
              >
                {/* Cover image or accent bar */}
                {post.cover_image_url ? (
                  <div className="relative w-full h-36 overflow-hidden bg-muted">
                    <img
                      src={post.cover_image_url}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  </div>
                ) : (
                  <div className="h-1.5 bg-gradient-to-r from-primary/60 to-primary/20" />
                )}

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
