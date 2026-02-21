import { useState } from "react";
import { Sparkles, FileText, AlertTriangle, BarChart3, Scale, Loader2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type AnalysisType = "summary" | "risks" | "indicators" | "opinion";

interface MonthlyReportAIPanelProps {
  reportId: string;
  onInsertToFeedback?: (text: string) => void;
}

const analysisOptions: { type: AnalysisType; label: string; icon: React.ElementType; description: string }[] = [
  { type: "summary", label: "Resumo executivo", icon: FileText, description: "Síntese das atividades e resultados" },
  { type: "risks", label: "Análise de riscos", icon: AlertTriangle, description: "Riscos e inconsistências identificados" },
  { type: "indicators", label: "Indicadores", icon: BarChart3, description: "Métricas de produtividade e aderência" },
  { type: "opinion", label: "Rascunho de parecer", icon: Scale, description: "Sugestão de parecer técnico" },
];

export function MonthlyReportAIPanel({ reportId, onInsertToFeedback }: MonthlyReportAIPanelProps) {
  const [loading, setLoading] = useState<AnalysisType | null>(null);
  const [results, setResults] = useState<Record<AnalysisType, string>>({
    summary: "",
    risks: "",
    indicators: "",
    opinion: "",
  });
  const [copied, setCopied] = useState<AnalysisType | null>(null);

  const handleAnalyze = async (type: AnalysisType) => {
    setLoading(type);
    try {
      const { data, error } = await supabase.functions.invoke("ai-analyze-report", {
        body: { report_id: reportId, type },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResults(prev => ({ ...prev, [type]: data.text || "" }));
      toast.success(`${analysisOptions.find(o => o.type === type)?.label} gerado com sucesso`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar análise de IA");
    } finally {
      setLoading(null);
    }
  };

  const handleCopy = async (type: AnalysisType) => {
    await navigator.clipboard.writeText(results[type]);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
    toast.success("Copiado!");
  };

  const handleInsert = (type: AnalysisType) => {
    if (onInsertToFeedback) {
      onInsertToFeedback(results[type]);
      toast.success("Texto inserido no campo de parecer");
    }
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4 text-primary" />
          Sugestões da IA
          <Badge variant="outline" className="text-[10px] font-normal ml-auto">Beta</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2">
          {analysisOptions.map(({ type, label, icon: Icon }) => (
            <Button
              key={type}
              variant={results[type] ? "secondary" : "outline"}
              size="sm"
              className="justify-start gap-2 h-9 text-xs"
              onClick={() => handleAnalyze(type)}
              disabled={loading !== null}
            >
              {loading === type ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Icon className="h-3.5 w-3.5" />
              )}
              {label}
            </Button>
          ))}
        </div>

        {/* Results */}
        {Object.entries(results).map(([type, text]) => {
          if (!text) return null;
          const opt = analysisOptions.find(o => o.type === type)!;
          const Icon = opt.icon;
          return (
            <div key={type} className="space-y-2">
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium">{opt.label}</span>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleCopy(type as AnalysisType)}
                    title="Copiar"
                  >
                    {copied === type ? (
                      <Check className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                  {onInsertToFeedback && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] px-2"
                      onClick={() => handleInsert(type as AnalysisType)}
                    >
                      Inserir no parecer
                    </Button>
                  )}
                </div>
              </div>
              <ScrollArea className="max-h-48">
                <div className="text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed p-2 bg-background rounded border">
                  {text}
                </div>
              </ScrollArea>
              <p className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                <Sparkles className="h-2.5 w-2.5" /> Gerado por IA — requer validação do gestor
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
