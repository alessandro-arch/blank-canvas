import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Shield } from "lucide-react";

interface CriticalActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  confirmationWord?: string;
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
  variant?: "warning" | "destructive";
}

export function CriticalActionDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirmar",
  confirmationWord = "CONFIRMAR",
  onConfirm,
  isLoading = false,
  variant = "warning",
}: CriticalActionDialogProps) {
  const [inputValue, setInputValue] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);

  const isConfirmEnabled = inputValue.toUpperCase() === confirmationWord.toUpperCase();

  const handleConfirm = async () => {
    if (!isConfirmEnabled) return;
    
    setIsExecuting(true);
    try {
      await onConfirm();
    } finally {
      setIsExecuting(false);
      setInputValue("");
      onOpenChange(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setInputValue("");
    }
    onOpenChange(newOpen);
  };

  const iconColor = variant === "destructive" ? "text-destructive" : "text-amber-500";
  const buttonVariant = variant === "destructive" 
    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" 
    : "bg-amber-500 text-white hover:bg-amber-600";

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full bg-muted ${iconColor}`}>
              {variant === "destructive" ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <Shield className="w-5 h-5" />
              )}
            </div>
            <AlertDialogTitle className="text-left">{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-left pt-2">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <Label htmlFor="confirmation" className="text-sm text-muted-foreground">
            Digite <span className="font-mono font-bold text-foreground">{confirmationWord}</span> para confirmar:
          </Label>
          <Input
            id="confirmation"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={confirmationWord}
            className="mt-2 font-mono"
            autoComplete="off"
            disabled={isLoading || isExecuting}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading || isExecuting}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!isConfirmEnabled || isLoading || isExecuting}
            className={buttonVariant}
          >
            {isLoading || isExecuting ? "Processando..." : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
