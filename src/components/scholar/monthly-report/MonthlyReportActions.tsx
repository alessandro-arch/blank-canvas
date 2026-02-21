import { Button } from "@/components/ui/button";
import { Save, Loader2, Send, RotateCcw, Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { MonthlyReportStatus } from "@/hooks/useMonthlyReport";

interface Props {
  isDraft: boolean;
  saving: boolean;
  lastSavedAt: Date | null;
  status: MonthlyReportStatus;
  pdfUrl: string | null;
  onSave: () => void;
  onSubmit: () => void;
  onReopen: () => void;
}

export function MonthlyReportActions({
  isDraft, saving, lastSavedAt, status, pdfUrl,
  onSave, onSubmit, onReopen,
}: Props) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {isDraft && (
        <>
          <Button onClick={onSave} disabled={saving} variant="outline" size="sm" className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar rascunho
          </Button>
          <Button onClick={onSubmit} variant="default" size="sm" className="gap-2">
            <Send className="w-4 h-4" />
            Enviar relatório
          </Button>
        </>
      )}

      {status === "returned" && !isDraft && (
        <Button onClick={onReopen} variant="outline" size="sm" className="gap-2">
          <RotateCcw className="w-4 h-4" />
          Reabrir para correção
        </Button>
      )}

      {pdfUrl && (
        <Button variant="outline" size="sm" className="gap-2" asChild>
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
            <Download className="w-4 h-4" />
            Baixar PDF
          </a>
        </Button>
      )}

      {lastSavedAt && isDraft && (
        <span className="text-xs text-muted-foreground">
          Salvo às {format(lastSavedAt, "HH:mm", { locale: ptBR })}
        </span>
      )}
    </div>
  );
}
