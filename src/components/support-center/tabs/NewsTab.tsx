import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Megaphone, ChevronRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function NewsTab() {
  const [selected, setSelected] = useState<any>(null);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["support-center-news"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_posts")
        .select("*")
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  return (
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
        <div className="p-4 space-y-3">
          {posts.map((post: any) => (
            <button
              key={post.id}
              onClick={() => setSelected(post)}
              className="w-full text-left bg-card border border-border rounded-xl p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-semibold">{post.title}</h4>
                  {post.summary && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{post.summary}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-2">
                    {post.published_at
                      ? formatDistanceToNow(new Date(post.published_at), { addSuffix: true, locale: ptBR })
                      : ""}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">{selected?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {selected?.summary && (
              <p className="text-sm text-muted-foreground italic">{selected.summary}</p>
            )}
            <p className="text-sm whitespace-pre-wrap">{selected?.content}</p>
            <p className="text-xs text-muted-foreground">
              {selected?.published_at &&
                formatDistanceToNow(new Date(selected.published_at), { addSuffix: true, locale: ptBR })}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </ScrollArea>
  );
}
