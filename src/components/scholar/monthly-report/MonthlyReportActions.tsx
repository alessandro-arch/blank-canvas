import { Button } from "@/components/ui/button";
import { Save, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  isDraft: boolean;
  saving: boolean;
  lastSavedAt: Date | null;
  onSave: () => void;
}

export function MonthlyReportActions({ isDraft, saving, lastSavedAt, onSave }: Props) {
  if (!isDraft) return null;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Button onClick={onSave} disabled={saving} variant="outline" size="sm" className="gap-2">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Salvar rascunho
      </Button>
      {lastSavedAt && (
        <span className="text-xs text-muted-foreground">
          Salvo às {format(lastSavedAt, "HH:mm", { locale: ptBR })}
        </span>
      )}
    </div>
  );
}
