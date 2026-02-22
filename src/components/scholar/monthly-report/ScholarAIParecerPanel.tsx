import { useState, useEffect } from "react";
import { Sparkles, Maximize2, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

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

interface Props {
  reportId: string;
}

export function ScholarAIParecerPanel({ reportId }: Props) {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<AIParecerOutput | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("monthly_report_ai_outputs")
        .select("payload")
        .eq("report_id", reportId)
        .maybeSingle();

      if (data?.payload) {
        setResult(data.payload as unknown as AIParecerOutput);
      }
      setLoading(false);
    };
    fetch();
  }, [reportId]);

  if (loading) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            Parecer IA
          </CardTitle>
        </CardHeader>
        <CardContent><Skeleton className="h-20 w-full" /></CardContent>
      </Card>
    );
  }

  if (!result) return null;

  const parecer = result.parecer;
  const decisao = parecer?.decisao_sugerida;
  const decisionCfg = decisao ? DECISION_CONFIG[decisao] : null;

  const renderContent = (fullscreen = false) => {
    if (!parecer) return null;

    if (result._parse_error) {
      return (
        <div className="p-4 text-sm text-foreground/80 whitespace-pre-wrap">
          <Alert variant="destructive" className="mb-3">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Erro ao processar resposta da IA.</AlertDescription>
          </Alert>
        </div>
      );
    }

    const textSize = fullscreen ? "text-sm" : "text-xs";

    return (
      <div className={`space-y-4 ${textSize}`}>
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

        {parecer.sumario?.length > 0 && (
          <div className="space-y-1.5">
            <p className="font-semibold text-foreground">Sumário</p>
            <ul className="space-y-1 pl-4">
              {parecer.sumario.map((s, i) => <li key={i} className="list-disc text-foreground/80">{s}</li>)}
            </ul>
          </div>
        )}

        {parecer.avaliacao_tecnica?.map((sec, i) => (
          <div key={i} className="space-y-1">
            <p className="font-semibold text-foreground">{sec.secao}</p>
            <p className="text-foreground/80 leading-relaxed">{sec.texto}</p>
          </div>
        ))}

        <Separator />

        {parecer.metricas && (
          <div className="space-y-2">
            <p className="font-semibold text-foreground">Métricas</p>
            <div className="grid gap-3">
              {Object.entries(parecer.metricas).map(([key, value]) => (
                <MetricBar key={key} label={METRIC_LABELS[key] || key} value={Number(value) || 0} />
              ))}
            </div>
          </div>
        )}

        <Separator />

        <ListSection title="Evidências encontradas" items={parecer.evidencias} icon="✅" />
        <ListSection title="Lacunas / Faltas de evidência" items={parecer.lacunas} icon="⚠️" />
        <ListSection title="Riscos e pendências" items={parecer.riscos_pendencias} icon="🔴" />
        <ListSection title="Perguntas ao bolsista" items={parecer.perguntas_ao_bolsista} icon="❓" />

        <Separator />

        {decisao && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-foreground">Decisão sugerida:</p>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${decisionCfg?.className || ""}`}>
                {decisionCfg?.label || decisao}
              </span>
            </div>
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="text-foreground/80 leading-relaxed">{parecer.justificativa_decisao}</p>
            </div>
          </div>
        )}

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
        <CardHeader className="pb-3 cursor-pointer" onClick={() => setCollapsed(!collapsed)}>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            Parecer da Avaliação (IA)
            <Badge variant="outline" className="text-[10px] font-normal ml-auto">Somente leitura</Badge>
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </CardTitle>
        </CardHeader>
        {!collapsed && (
          <CardContent className="space-y-3">
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => setExpanded(true)}>
                <Maximize2 className="h-3 w-3" /> Expandir
              </Button>
            </div>

            {renderContent(false)}

            <p className="text-[10px] text-muted-foreground italic flex items-center gap-1">
              <Sparkles className="h-2.5 w-2.5" /> Gerado por IA — sujeito a validação do gestor
            </p>
          </CardContent>
        )}
      </Card>

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-3 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Parecer da Avaliação (IA)
              <Badge variant="outline" className="text-[10px] font-normal ml-2">Somente leitura</Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
            {renderContent(true)}
          </div>
          <div className="px-6 py-3 border-t shrink-0">
            <p className="text-[10px] text-muted-foreground italic flex items-center gap-1">
              <Sparkles className="h-2.5 w-2.5" /> Gerado por IA — sujeito a validação do gestor
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
