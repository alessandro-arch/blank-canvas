import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ShieldAlert, 
  User, 
  Mail, 
  Save, 
  X, 
  Loader2,
  AlertTriangle,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuditLog } from "@/hooks/useAuditLog";
import { CriticalActionDialog } from "./CriticalActionDialog";

interface ScholarProfile {
  userId: string;
  fullName: string | null;
  email: string | null;
}

interface AdminEditScholarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scholar: ScholarProfile | null;
  onSuccess: () => void;
}

export function AdminEditScholarDialog({
  open,
  onOpenChange,
  scholar,
  onSuccess,
}: AdminEditScholarDialogProps) {
  const { logAction } = useAuditLog();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
  });
  const [justification, setJustification] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [emailError, setEmailError] = useState("");

  useEffect(() => {
    if (open && scholar) {
      setFormData({
        fullName: scholar.fullName || "",
        email: scholar.email || "",
      });
      setJustification("");
      setEmailError("");
    }
  }, [open, scholar]);

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === "email") setEmailError("");
  };

  const validateForm = async (): Promise<boolean> => {
    let isValid = true;

    if (formData.email !== scholar?.email) {
      const { data: existingEmail } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", formData.email.toLowerCase())
        .neq("user_id", scholar?.userId || "")
        .maybeSingle();

      if (existingEmail) {
        setEmailError("Este e-mail já está cadastrado para outro bolsista.");
        isValid = false;
      }
    }

    if (!justification.trim()) {
      toast.error("A justificativa é obrigatória para alterações administrativas.");
      isValid = false;
    }

    return isValid;
  };

  const handleSubmitClick = async () => {
    const isValid = await validateForm();
    if (isValid) {
      setShowConfirmation(true);
    }
  };

  const handleConfirmedSave = async () => {
    if (!scholar) return;

    setIsSubmitting(true);

    try {
      const previousValue = {
        full_name: scholar.fullName,
        email: scholar.email,
      };

      const newValue = {
        full_name: formData.fullName.trim() || null,
        email: formData.email.trim().toLowerCase() || null,
      };

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: newValue.full_name,
          email: newValue.email,
        })
        .eq("user_id", scholar.userId);

      if (updateError) {
        console.error("Error updating profile:", updateError);
        toast.error("Erro ao atualizar perfil do bolsista");
        return;
      }

      await logAction({
        action: "update_profile_admin",
        entityType: "user",
        entityId: scholar.userId,
        previousValue,
        newValue,
        details: {
          justification: justification.trim(),
          changedFields: Object.keys(previousValue).filter(
            key => previousValue[key as keyof typeof previousValue] !== newValue[key as keyof typeof newValue]
          ),
        },
      });

      toast.success("Perfil do bolsista atualizado com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error in admin edit:", error);
      toast.error("Erro inesperado ao atualizar perfil");
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasChanges = scholar && (
    formData.fullName !== (scholar.fullName || "") ||
    formData.email !== (scholar.email || "")
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="w-5 h-5" />
              Edição Administrativa de Perfil
            </DialogTitle>
            <DialogDescription>
              Alterações realizadas nesta tela são consideradas críticas e serão registradas na trilha de auditoria.
              CPF e telefone não são editáveis por administradores.
            </DialogDescription>
          </DialogHeader>

          <Alert variant="destructive" className="my-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Atenção:</strong> Você está editando dados do bolsista.
              Esta ação requer justificativa e ficará registrada permanentemente.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="admin-fullName" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Nome Completo
              </Label>
              <Input
                id="admin-fullName"
                value={formData.fullName}
                onChange={(e) => handleChange("fullName", e.target.value)}
                placeholder="Nome completo do bolsista"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                E-mail
              </Label>
              <Input
                id="admin-email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="email@exemplo.com"
                className={emailError ? "border-destructive" : ""}
              />
              {emailError && (
                <p className="text-xs text-destructive">{emailError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Nota: Alterar o e-mail aqui não altera as credenciais de login do usuário.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-justification" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Justificativa da Alteração
                <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="admin-justification"
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Descreva o motivo da alteração (ex: correção de erro de digitação, unificação de cadastro, etc.)"
                rows={3}
                required
              />
              <p className="text-xs text-muted-foreground">
                A justificativa será registrada na trilha de auditoria.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitClick}
              disabled={isSubmitting || !hasChanges || !justification.trim()}
              variant="destructive"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CriticalActionDialog
        open={showConfirmation}
        onOpenChange={setShowConfirmation}
        title="Confirmar Alteração Administrativa"
        description="Você está alterando dados do bolsista. Esta ação será registrada na trilha de auditoria com sua identificação, data/hora e justificativa."
        confirmText="Confirmar Alteração"
        confirmationWord="CONFIRMAR"
        onConfirm={handleConfirmedSave}
        isLoading={isSubmitting}
        variant="destructive"
      />
    </>
  );
}
