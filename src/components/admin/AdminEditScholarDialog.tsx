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
import { Badge } from "@/components/ui/badge";
import { 
  ShieldAlert, 
  User, 
  CreditCard, 
  Mail, 
  Phone, 
  Save, 
  X, 
  Loader2,
  AlertTriangle,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuditLog } from "@/hooks/useAuditLog";
import { formatCPF, validateCPF, unformatCPF } from "@/lib/cpf-validator";
import { CriticalActionDialog } from "./CriticalActionDialog";

interface ScholarProfile {
  userId: string;
  fullName: string | null;
  email: string | null;
  cpf: string | null;
  phone: string | null;
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
    cpf: "",
    email: "",
    phone: "",
  });
  const [justification, setJustification] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [cpfError, setCpfError] = useState("");
  const [emailError, setEmailError] = useState("");

  // Reset form when dialog opens with new data
  useEffect(() => {
    if (open && scholar) {
      setFormData({
        fullName: scholar.fullName || "",
        cpf: scholar.cpf || "",
        email: scholar.email || "",
        phone: scholar.phone || "",
      });
      setJustification("");
      setCpfError("");
      setEmailError("");
    }
  }, [open, scholar]);

  const handleChange = (field: keyof typeof formData, value: string) => {
    if (field === "cpf") {
      setFormData(prev => ({ ...prev, cpf: formatCPF(value) }));
      setCpfError("");
    } else if (field === "phone") {
      // Format phone as (XX) XXXXX-XXXX
      const numbers = value.replace(/\D/g, "").slice(0, 11);
      let formatted = numbers;
      if (numbers.length > 2) {
        formatted = `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
      }
      if (numbers.length > 7) {
        formatted = `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
      }
      setFormData(prev => ({ ...prev, phone: formatted }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
      if (field === "email") setEmailError("");
    }
  };

  const validateForm = async (): Promise<boolean> => {
    let isValid = true;

    // Validate CPF format
    if (formData.cpf && !validateCPF(formData.cpf)) {
      setCpfError("CPF inválido. Verifique os dígitos.");
      isValid = false;
    }

    // Check CPF uniqueness if changed
    if (formData.cpf !== scholar?.cpf) {
      const cleanCpf = unformatCPF(formData.cpf);
      const { data: existingCpf, error } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("cpf", cleanCpf)
        .neq("user_id", scholar?.userId || "")
        .maybeSingle();

      if (existingCpf) {
        setCpfError("Este CPF já está cadastrado para outro bolsista.");
        isValid = false;
      }
    }

    // Check email uniqueness if changed
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

    // Validate justification
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
      // Prepare before/after state for audit
      const previousValue = {
        full_name: scholar.fullName,
        cpf: scholar.cpf,
        email: scholar.email,
        phone: scholar.phone,
      };

      const cleanCpf = unformatCPF(formData.cpf);
      const newValue = {
        full_name: formData.fullName.trim() || null,
        cpf: cleanCpf || null,
        email: formData.email.trim().toLowerCase() || null,
        phone: formData.phone.replace(/\D/g, "") || null,
      };

      // Update the profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: newValue.full_name,
          cpf: newValue.cpf,
          email: newValue.email,
          phone: newValue.phone,
        })
        .eq("user_id", scholar.userId);

      if (updateError) {
        console.error("Error updating profile:", updateError);
        toast.error("Erro ao atualizar perfil do bolsista");
        return;
      }

      // Log to audit trail
      const { error: auditError } = await logAction({
        action: "update_cpf",
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

      if (auditError) {
        console.error("Error logging to audit trail:", auditError);
        // Don't fail the operation, but warn
        toast.warning("Alteração salva, mas houve erro ao registrar na trilha de auditoria.");
      }

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

  // Check if any field has changed
  const hasChanges = scholar && (
    formData.fullName !== (scholar.fullName || "") ||
    formData.cpf !== (scholar.cpf || "") ||
    formData.email !== (scholar.email || "") ||
    formData.phone !== (scholar.phone || "")
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
            </DialogDescription>
          </DialogHeader>

          <Alert variant="destructive" className="my-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Atenção:</strong> Você está editando dados sensíveis do bolsista.
              Esta ação requer justificativa e ficará registrada permanentemente.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 py-4">
            {/* Full Name */}
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

            {/* CPF */}
            <div className="space-y-2">
              <Label htmlFor="admin-cpf" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                CPF
                <Badge variant="outline" className="ml-auto text-xs bg-destructive/10 text-destructive border-destructive/30">
                  Campo Crítico
                </Badge>
              </Label>
              <Input
                id="admin-cpf"
                value={formData.cpf}
                onChange={(e) => handleChange("cpf", e.target.value)}
                placeholder="000.000.000-00"
                className={cpfError ? "border-destructive" : ""}
              />
              {cpfError && (
                <p className="text-xs text-destructive">{cpfError}</p>
              )}
            </div>

            {/* Email */}
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

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="admin-phone" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Telefone
              </Label>
              <Input
                id="admin-phone"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>

            {/* Justification - Required */}
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

      {/* Confirmation Dialog */}
      <CriticalActionDialog
        open={showConfirmation}
        onOpenChange={setShowConfirmation}
        title="Confirmar Alteração Administrativa"
        description="Você está alterando dados sensíveis do bolsista. Esta ação será registrada na trilha de auditoria com sua identificação, data/hora e justificativa."
        confirmText="Confirmar Alteração"
        confirmationWord="CONFIRMAR"
        onConfirm={handleConfirmedSave}
        isLoading={isSubmitting}
        variant="destructive"
      />
    </>
  );
}
