import { useState, useEffect } from "react";
import { Sparkles, Loader2, Copy, Check, Maximize2, AlertTriangle, ChevronDown, ChevronUp, ClipboardPaste } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Types
interface AIParecerOutput {
  parecer: {
    titulo: string;
    identificacao: { bolsista: string; instituicao: string; nivel: string; projeto: string; periodo: string };
    sumario: string[];
    avaliacao_tecnica: { secao: string; texto: string }[];
    metricas: {
      aderencia_plano_0a5: number;
      evidencia_verificabilidade_0a5: number;
      progresso_vs_historico_0a5: number;
      qualidade_tecnica_clareza_0a5: number;
    };
    evidencias: string[];
    lacunas: string[];
    riscos_pendencias: string[];
    perguntas_ao_bolsista: string[];
    decisao_sugerida: "aprovar" | "aprovar_com_ressalvas" | "devolver";
    justificativa_decisao: string;
  };
  indicadores: Record<string, unknown>;
  analise_riscos: { riscos: string[]; mitigacoes: string[] };
  resumo_executivo: { texto: string };
  _parse_error?: boolean;
}

interface MonthlyReportAIPanelProps {
  reportId: string;
  projectId?: string;
  reportStatus?: string;
  onInsertToFeedback?: (text: string) => void;
  readOnly?: boolean;
}

const METRIC_LABELS: Record<string, string> = {
  aderencia_plano_0a5: "Aderência ao Plano de Trabalho",
  evidencia_verificabilidade_0a5: "Evidência e Verificabilidade",
  progresso_vs_historico_0a5: "Progresso vs Histórico",
  qualidade_tecnica_clareza_0a5: "Qualidade Técnica e Clareza",
};

const DECISION_CONFIG = {
  aprovar: { label: "Aprovar", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" },
  aprovar_com_ressalvas: { label: "Aprovar com Ressalvas", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  devolver: { label: "Devolver", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
};

function MetricBar({ label, value }: { label: string; value: number }) {
  const pct = Math.min(Math.max((value / 5) * 100, 0), 100);
  const color = value >= 4 ? "bg-emerald-500" : value >= 3 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}/5</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ListSection({ title, items, icon }: { title: string; items: string[]; icon: string }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-foreground">{icon} {title}</p>
      <ul className="space-y-1 pl-4">
        {items.map((item, i) => (
          <li key={i} className="text-xs text-foreground/80 list-disc">{item}</li>
        ))}
      </ul>
    </div>
  );
}

function buildPlainTextParecer(data: AIParecerOutput): string {
  const p = data.parecer;
  const lines: string[] = [];
  lines.push(p.titulo || "Parecer Tecnico");
  lines.push("");
  if (p.identificacao) {
    lines.push(`Bolsista: ${p.identificacao.bolsista}`);
    lines.push(`Projeto: ${p.identificacao.projeto}`);
    lines.push(`Periodo: ${p.identificacao.periodo}`);
    lines.push("");
  }
  if (p.sumario?.length) {
    lines.push("Sumario:");
    p.sumario.forEach(s => lines.push(`- ${s}`));
    lines.push("");
  }
  if (p.avaliacao_tecnica?.length) {
    p.avaliacao_tecnica.forEach(a => {
      lines.push(`${a.secao}:`);
      lines.push(a.texto);
      lines.push("");
    });
  }
  if (p.metricas) {
    lines.push("Metricas:");
    Object.entries(p.metricas).forEach(([k, v]) => {
      lines.push(`- ${METRIC_LABELS[k] || k}: ${v}/5`);
    });
    lines.push("");
  }
  if (p.decisao_sugerida) {
    const label = DECISION_CONFIG[p.decisao_sugerida]?.label || p.decisao_sugerida;
    lines.push(`Decisao sugerida: ${label}`);
    lines.push(p.justificativa_decisao || "");
  }
  return lines.join("\n");
}

export function MonthlyReportAIPanel({ reportId, reportStatus, onInsertToFeedback, readOnly }: MonthlyReportAIPanelProps) {
  const [loading, setLoading] = useState(false);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [result, setResult] = useState<AIParecerOutput | null>(null);
  const [savedResult, setSavedResult] = useState<AIParecerOutput | null>(null);
  const [hasWorkPlan, setHasWorkPlan] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Load saved parecer from monthly_report_ai_outputs when reportId changes
  useEffect(() => {
    // Reset state
    setResult(null);
    setSavedResult(null);
    setCollapsed(false);
    setExpanded(false);

    if (!reportId) return;

    let cancelled = false;
    const fetchSaved = async () => {
      setLoadingSaved(true);
      try {
        const { data, error } = await supabase
          .from("monthly_report_ai_outputs")
          .select("payload")
          .eq("report_id", reportId)
          .maybeSingle();
        
        if (cancelled) return;
        console.log("[MonthlyReportAIPanel] fetchSaved for", reportId, "found:", !!data?.payload, "error:", error?.message);
        
        if (data?.payload) {
          const saved = data.payload as unknown as AIParecerOutput;
          setSavedResult(saved);
          // Auto-display saved parecer for decided reports
          if (reportStatus === "approved" || reportStatus === "returned") {
            setResult(saved);
          }
        }
      } catch (err) {
        console.warn("[MonthlyReportAIPanel] Error loading saved parecer:", err);
      } finally {
        if (!cancelled) setLoadingSaved(false);
      }
    };
    fetchSaved();
    return () => { cancelled = true; };
  }, [reportId, reportStatus]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-evaluate-monthly-report", {
        body: { report_id: reportId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResult(data.data as AIParecerOutput);
      setHasWorkPlan(data.has_work_plan ?? null);
      toast.success("Parecer completo gerado com sucesso");
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar parecer de IA");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(buildPlainTextParecer(result));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Parecer copiado!");
  };

  const handleInsert = () => {
    if (!result || !onInsertToFeedback) return;
    const text = result.parecer?.justificativa_decisao || buildPlainTextParecer(result);
    onInsertToFeedback(text);
    toast.success("Texto inserido no campo de parecer");
  };

  const parecer = result?.parecer;
  const decisao = parecer?.decisao_sugerida;
  const decisionCfg = decisao ? DECISION_CONFIG[decisao] : null;

  const renderContent = (fullscreen = false) => {
    if (!result || !parecer) return null;

    if (result._parse_error) {
      return (
        <div className="p-4 text-sm text-foreground/80 whitespace-pre-wrap">
          <Alert variant="destructive" className="mb-3">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Erro ao processar resposta da IA. Exibindo texto bruto.</AlertDescription>
          </Alert>
          {parecer.justificativa_decisao || "Sem conteudo"}
        </div>
      );
    }

    const textSize = fullscreen ? "text-sm" : "text-xs";

    return (
      <div className={`space-y-4 ${textSize}`}>
        {/* Identification */}
        {parecer.identificacao && (
          <div className="rounded-md border bg-muted/30 p-3 space-y-1">
            <p className="font-semibold text-foreground">{parecer.identificacao.bolsista}</p>
            <p className="text-muted-foreground">{parecer.identificacao.projeto}</p>
            <div className="flex gap-3 text-muted-foreground">
              <span>{parecer.identificacao.instituicao}</span>
              <span>{parecer.identificacao.nivel}</span>
              <span>{parecer.identificacao.periodo}</span>
            </div>
          </div>
        )}

        {/* Work plan warning */}
        {hasWorkPlan === false && (
          <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-400">
              Plano de Trabalho nao encontrado. Analise de aderencia limitada.
            </AlertDescription>
          </Alert>
        )}

        {/* Summary */}
        {parecer.sumario?.length > 0 && (
          <div className="space-y-1.5">
            <p className="font-semibold text-foreground">Sumario</p>
            <ul className="space-y-1 pl-4">
              {parecer.sumario.map((s, i) => <li key={i} className="list-disc text-foreground/80">{s}</li>)}
            </ul>
          </div>
        )}

        {/* Technical evaluation sections */}
        {parecer.avaliacao_tecnica?.map((sec, i) => (
          <div key={i} className="space-y-1">
            <p className="font-semibold text-foreground">{sec.secao}</p>
            <p className="text-foreground/80 leading-relaxed">{sec.texto}</p>
          </div>
        ))}

        <Separator />

        {/* Metrics */}
        {parecer.metricas && (
          <div className="space-y-2">
            <p className="font-semibold text-foreground">Metricas</p>
            <div className="grid gap-3">
              {Object.entries(parecer.metricas).map(([key, value]) => (
                <MetricBar key={key} label={METRIC_LABELS[key] || key} value={Number(value) || 0} />
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Lists */}
        <ListSection title="Evidencias encontradas" items={parecer.evidencias} icon="✅" />
        <ListSection title="Lacunas / Faltas de evidencia" items={parecer.lacunas} icon="⚠️" />
        <ListSection title="Riscos e pendencias" items={parecer.riscos_pendencias} icon="🔴" />
        <ListSection title="Perguntas ao bolsista" items={parecer.perguntas_ao_bolsista} icon="❓" />

        <Separator />

        {/* Decision */}
        {decisao && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-foreground">Decisao sugerida:</p>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${decisionCfg?.className || ""}`}>
                {decisionCfg?.label || decisao}
              </span>
            </div>
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="text-foreground/80 leading-relaxed">{parecer.justificativa_decisao}</p>
            </div>
          </div>
        )}

        {/* Executive summary */}
        {result.resumo_executivo?.texto && (
          <div className="space-y-1">
            <p className="font-semibold text-foreground">Resumo executivo</p>
            <p className="text-foreground/80 leading-relaxed">{result.resumo_executivo.texto}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3 cursor-pointer" onClick={() => result && setCollapsed(!collapsed)}>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            Parecer IA
            <Badge variant="outline" className="text-[10px] font-normal ml-auto">Beta</Badge>
            {result && (collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />)}
          </CardTitle>
        </CardHeader>
        {!collapsed && (
          <CardContent className="space-y-3">
            {!result && !loadingSaved && (
              <>
                {savedResult ? (
                  <Button
                    onClick={() => setResult(savedResult)}
                    className="w-full gap-2"
                    size="sm"
                    variant="outline"
                  >
                    <Sparkles className="h-4 w-4" />
                    Ver Parecer Salvo
                  </Button>
                ) : !readOnly ? (
                  <Button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="w-full gap-2"
                    size="sm"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {loading ? "Gerando parecer completo..." : "Gerar Parecer Completo"}
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">Nenhum parecer disponível para este relatório.</p>
                )}
              </>
            )}

            {loadingSaved && !result && (
              <div className="space-y-2">
                <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
                <div className="h-4 w-1/2 rounded bg-muted animate-pulse" />
              </div>
            )}

            {result && (
              <>
                {/* Action bar */}
                <div className="flex items-center gap-1 flex-wrap">
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => setExpanded(true)}>
                    <Maximize2 className="h-3 w-3" /> Expandir
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={handleCopy}>
                    {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    Copiar
                  </Button>
                  {onInsertToFeedback && (
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={handleInsert}>
                      <ClipboardPaste className="h-3 w-3" /> Inserir no parecer
                    </Button>
                  )}
                  {!readOnly && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 ml-auto" onClick={handleGenerate} disabled={loading}>
                      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      Regenerar
                    </Button>
                  )}
                </div>

                {renderContent(false)}

                <p className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                  <Sparkles className="h-2.5 w-2.5" /> Gerado por IA — requer validacao do gestor
                </p>
              </>
            )}
          </CardContent>
        )}
      </Card>

      {/* Fullscreen Dialog */}
      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-3 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Parecer Tecnico IA
              <Badge variant="outline" className="text-[10px] font-normal ml-2">Beta</Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2 px-6 pb-3 shrink-0 border-b">
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={handleCopy}>
              {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
              Copiar
            </Button>
            {onInsertToFeedback && (
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={handleInsert}>
                <ClipboardPaste className="h-3 w-3" /> Inserir no parecer
              </Button>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
            {renderContent(true)}
          </div>
          <div className="px-6 py-3 border-t shrink-0">
            <p className="text-[10px] text-muted-foreground italic flex items-center gap-1">
              <Sparkles className="h-2.5 w-2.5" /> Gerado por IA — requer validacao do gestor
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
