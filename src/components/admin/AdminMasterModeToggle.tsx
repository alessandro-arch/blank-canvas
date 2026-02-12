import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Shield, ShieldAlert, ShieldCheck } from "lucide-react";
import { useAdminMasterMode } from "@/contexts/AdminMasterModeContext";
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

export function AdminMasterModeToggle() {
  const { isAdminMasterMode, activateAdminMasterMode, deactivateAdminMasterMode, canAccessAdminMasterMode } = useAdminMasterMode();
  const [showActivationDialog, setShowActivationDialog] = useState(false);
  const [showDeactivationDialog, setShowDeactivationDialog] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");

  if (!canAccessAdminMasterMode) {
    return null;
  }

  const handleActivate = () => {
    if (confirmationText.toUpperCase() === "CONFIRMAR") {
      activateAdminMasterMode();
      setShowActivationDialog(false);
      setConfirmationText("");
    }
  };

  const handleDeactivate = () => {
    deactivateAdminMasterMode();
    setShowDeactivationDialog(false);
  };

  return (
    <>
      {isAdminMasterMode ? (
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setShowDeactivationDialog(true)}
          className="gap-2"
        >
          <ShieldAlert className="w-4 h-4" />
          Desativar Modo Admin Master
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowActivationDialog(true)}
          className="gap-2 border-warning text-warning hover:bg-warning/10"
        >
          <Shield className="w-4 h-4" />
          Ativar Modo Administrador Master
        </Button>
      )}

      {/* Activation Dialog */}
      <AlertDialog open={showActivationDialog} onOpenChange={setShowActivationDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-warning/10 text-warning">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <AlertDialogTitle>Ativar Modo Administrador Master</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-left pt-2 space-y-3">
              <p>
                Você está prestes a entrar no <strong>Modo Administrador Master</strong>.
              </p>
              <p className="text-warning font-medium">
                ⚠️ Ações realizadas neste modo são críticas e serão registradas na trilha de auditoria.
              </p>
              <p className="text-sm text-muted-foreground">
                Este modo permite executar operações sensíveis como exclusões definitivas, 
                alterações retroativas e modificações de permissões.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            <Label htmlFor="confirmation" className="text-sm text-muted-foreground">
              Digite <span className="font-mono font-bold text-foreground">CONFIRMAR</span> para ativar:
            </Label>
            <Input
              id="confirmation"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder="CONFIRMAR"
              className="mt-2 font-mono"
              autoComplete="off"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmationText("")}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleActivate}
              disabled={confirmationText.toUpperCase() !== "CONFIRMAR"}
              className="bg-warning text-warning-foreground hover:bg-warning/90"
            >
              Ativar Modo Master
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deactivation Dialog */}
      <AlertDialog open={showDeactivationDialog} onOpenChange={setShowDeactivationDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-success/10 text-success">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <AlertDialogTitle>Desativar Modo Administrador Master</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-left pt-2">
              Você está saindo do Modo Administrador Master. As operações voltarão ao modo normal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate}>
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
