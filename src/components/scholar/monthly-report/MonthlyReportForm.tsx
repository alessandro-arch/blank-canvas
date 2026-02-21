import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Plus, X, AlertCircle } from "lucide-react";
import { MonthlyReportStatusBadge } from "./MonthlyReportStatusBadge";
import { MonthlyReportActions } from "./MonthlyReportActions";
import type { MonthlyReportPayload, MonthlyReportStatus } from "@/hooks/useMonthlyReport";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

interface Props {
  payload: MonthlyReportPayload;
  status: MonthlyReportStatus;
  loading: boolean;
  saving: boolean;
  lastSavedAt: Date | null;
  isDraft: boolean;
  isReadOnly: boolean;
  submittedAt: string | null;
  returnReason: string | null;
  periodYear: number;
  periodMonth: number;
  pdfUrl: string | null;
  onUpdate: (partial: Partial<MonthlyReportPayload>) => void;
  onSave: () => void;
  onSubmit: () => void;
  onReopen: () => void;
}

export function MonthlyReportForm({
  payload, status, loading, saving, lastSavedAt,
  isDraft, isReadOnly, submittedAt, returnReason,
  periodYear, periodMonth, pdfUrl,
  onUpdate, onSave, onSubmit, onReopen,
}: Props) {
  const [newEntrega, setNewEntrega] = useState("");

  if (loading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent className="space-y-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  const monthLabel = format(new Date(periodYear, periodMonth - 1), "MMMM yyyy", { locale: ptBR });

  const addEntrega = () => {
    if (!newEntrega.trim()) return;
    onUpdate({ entregas: [...payload.entregas, newEntrega.trim()] });
    setNewEntrega("");
  };

  const removeEntrega = (idx: number) => {
    onUpdate({ entregas: payload.entregas.filter((_, i) => i !== idx) });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">
              Relatório Mensal — {monthLabel}
            </CardTitle>
            <MonthlyReportStatusBadge status={status} />
          </div>
          <MonthlyReportActions
            isDraft={isDraft}
            saving={saving}
            lastSavedAt={lastSavedAt}
            status={status}
            pdfUrl={pdfUrl}
            onSave={onSave}
            onSubmit={onSubmit}
            onReopen={onReopen}
          />
        </div>

        {status === "returned" && returnReason && (
          <div className="mt-3 p-3 rounded-md bg-destructive/10 border border-destructive/20 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">Devolvido para correção</p>
              <p className="text-sm text-muted-foreground mt-1">{returnReason}</p>
            </div>
          </div>
        )}

        {submittedAt && status !== "draft" && (
          <p className="text-xs text-muted-foreground mt-2">
            Enviado em {format(new Date(submittedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Atividades Realizadas */}
        <div className="space-y-2">
          <Label htmlFor="atividades">Atividades Realizadas *</Label>
          <Textarea
            id="atividades"
            placeholder="Descreva as atividades realizadas no período..."
            value={payload.atividades_realizadas}
            onChange={e => onUpdate({ atividades_realizadas: e.target.value })}
            disabled={isReadOnly}
            rows={4}
          />
        </div>

        {/* Resultados Alcançados */}
        <div className="space-y-2">
          <Label htmlFor="resultados">Resultados Alcançados *</Label>
          <Textarea
            id="resultados"
            placeholder="Descreva os resultados obtidos..."
            value={payload.resultados_alcancados}
            onChange={e => onUpdate({ resultados_alcancados: e.target.value })}
            disabled={isReadOnly}
            rows={4}
          />
        </div>

        {/* Dificuldades */}
        <div className="space-y-2">
          <Label htmlFor="dificuldades">Dificuldades Encontradas</Label>
          <Textarea
            id="dificuldades"
            placeholder="Relate dificuldades, se houver..."
            value={payload.dificuldades_encontradas}
            onChange={e => onUpdate({ dificuldades_encontradas: e.target.value })}
            disabled={isReadOnly}
            rows={3}
          />
        </div>

        {/* Próximos Passos */}
        <div className="space-y-2">
          <Label htmlFor="proximos">Próximos Passos</Label>
          <Textarea
            id="proximos"
            placeholder="Quais as próximas etapas planejadas..."
            value={payload.proximos_passos}
            onChange={e => onUpdate({ proximos_passos: e.target.value })}
            disabled={isReadOnly}
            rows={3}
          />
        </div>

        {/* Horas Dedicadas */}
        <div className="space-y-2">
          <Label htmlFor="horas">Horas Dedicadas</Label>
          <Input
            id="horas"
            type="number"
            min={0}
            max={744}
            placeholder="Ex: 40"
            value={payload.horas_dedicadas ?? ""}
            onChange={e => onUpdate({ horas_dedicadas: e.target.value ? Number(e.target.value) : null })}
            disabled={isReadOnly}
            className="w-32"
          />
        </div>

        {/* Entregas */}
        <div className="space-y-2">
          <Label>Entregas</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {payload.entregas.map((item, idx) => (
              <span key={idx} className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm">
                {item}
                {!isReadOnly && (
                  <button onClick={() => removeEntrega(idx)} className="ml-1 hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}
          </div>
          {!isReadOnly && (
            <div className="flex gap-2">
              <Input
                placeholder="Adicionar entrega..."
                value={newEntrega}
                onChange={e => setNewEntrega(e.target.value)}
                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addEntrega())}
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={addEntrega} disabled={!newEntrega.trim()}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Observações */}
        <div className="space-y-2">
          <Label htmlFor="observacoes">Observações</Label>
          <Textarea
            id="observacoes"
            placeholder="Observações adicionais..."
            value={payload.observacoes}
            onChange={e => onUpdate({ observacoes: e.target.value })}
            disabled={isReadOnly}
            rows={2}
          />
        </div>
      </CardContent>
    </Card>
  );
}
