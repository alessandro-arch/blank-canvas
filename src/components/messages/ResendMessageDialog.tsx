import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ResendMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  loading: boolean;
  subject: string;
  isFailed: boolean;
}

export function ResendMessageDialog({ open, onOpenChange, onConfirm, loading, subject, isFailed }: ResendMessageDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reenviar mensagem</AlertDialogTitle>
          <AlertDialogDescription>
            {isFailed
              ? <>A mensagem <strong>"{subject}"</strong> falhou no envio. Deseja reenviar?</>
              : <>A mensagem <strong>"{subject}"</strong> já foi enviada. Deseja reenviar mesmo assim? Uma nova cópia será criada.</>
            }
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={loading}>
            {loading ? "Reenviando..." : "Reenviar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
