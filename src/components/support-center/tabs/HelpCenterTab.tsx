import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, ChevronRight, Loader2, HelpCircle, ArrowLeft } from "lucide-react";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

export function HelpCenterTab() {
  const [search, setSearch] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<any>(null);

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["support-center-help"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("help_articles")
        .select("*")
        .eq("is_published", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const categories = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    articles.forEach((a: any) => {
      if (!grouped[a.category]) grouped[a.category] = [];
      grouped[a.category].push(a);
    });
    return grouped;
  }, [articles]);

  const filtered = useMemo(() => {
    if (!search) return categories;
    const s = search.toLowerCase();
    const result: Record<string, any[]> = {};
    Object.entries(categories).forEach(([cat, items]) => {
      const matched = items.filter(
        (a: any) =>
          a.title.toLowerCase().includes(s) ||
          a.content.toLowerCase().includes(s) ||
          a.category.toLowerCase().includes(s)
      );
      if (matched.length > 0) result[cat] = matched;
    });
    return result;
  }, [categories, search]);

  if (selectedArticle) {
    return (
      <div className="p-4 space-y-4">
        <button
          onClick={() => setSelectedArticle(null)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
        <h3 className="text-base font-semibold">{selectedArticle.title}</h3>
        <p className="text-sm whitespace-pre-wrap">{selectedArticle.content}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : Object.keys(filtered).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <HelpCircle className="w-10 h-10 mb-2 opacity-40" />
            <p className="text-sm">Nenhum artigo encontrado</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {Object.entries(filtered).map(([category, items]) => (
              <div key={category}>
                {(items as any[]).map((article: any) => (
                  <button
                    key={article.id}
                    onClick={() => setSelectedArticle(article)}
                    className="w-full text-left px-4 py-4 hover:bg-muted/50 transition-colors border-b border-border last:border-0"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{article.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {article.content.substring(0, 100)}...
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
