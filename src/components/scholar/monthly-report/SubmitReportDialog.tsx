import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Send } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  submitting: boolean;
}

export function SubmitReportDialog({ open, onOpenChange, onConfirm, submitting }: Props) {
  const [accepted, setAccepted] = useState(false);

  const handleConfirm = async () => {
    await onConfirm();
    setAccepted(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!submitting) { onOpenChange(v); setAccepted(false); } }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Enviar Relatório Mensal</AlertDialogTitle>
          <AlertDialogDescription>
            Após o envio, o relatório será travado para edição e um PDF oficial será gerado automaticamente.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex items-start gap-3 p-3 rounded-md border bg-muted/50 my-2">
          <Checkbox
            id="aceite"
            checked={accepted}
            onCheckedChange={(v) => setAccepted(!!v)}
            disabled={submitting}
          />
          <label htmlFor="aceite" className="text-sm leading-relaxed cursor-pointer">
            Declaro que as informações são verdadeiras e refletem as atividades realizadas no período.
          </label>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
          <Button onClick={handleConfirm} disabled={!accepted || submitting} className="gap-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Confirmar e Enviar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
