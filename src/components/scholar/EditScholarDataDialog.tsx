import { useState, useEffect } from "react";
import { 
  User, 
  Mail, 
  Phone, 
  CreditCard, 
  Building2, 
  Key,
  Save,
  X,
  GraduationCap,
  School,
  Link2,
  Loader2,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

export interface PersonalData {
  name: string;
  cpf: string;
  email: string;
  phone: string;
  institution: string;
  academicLevel: string;
  lattesUrl: string;
}

export interface BankData {
  bankName: string;
  agency: string;
  account: string;
  accountType: string;
  pixKey: string;
}

interface EditScholarDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "personal" | "bank";
  personalData?: PersonalData;
  bankData?: BankData;
  cpfLocked?: boolean;
  onSave: (data: PersonalData | BankData) => Promise<{ success: boolean; error?: string }>;
  saving?: boolean;
}

const banks = [
  "Banco do Brasil",
  "Bradesco",
  "Caixa Econômica Federal",
  "Itaú",
  "Santander",
  "Nubank",
  "Inter",
  "C6 Bank",
  "PicPay",
  "Mercado Pago",
];

const accountTypes = [
  "Conta Corrente",
  "Conta Poupança",
  "Conta Salário",
];

const academicLevels = [
  { value: "ensino_medio_completo", label: "Ensino Médio Completo" },
  { value: "graduado", label: "Graduado" },
  { value: "mestrado", label: "Mestrado" },
  { value: "doutorado", label: "Doutorado" },
  { value: "pos_doutorado", label: "Pós-Doutorado" },
];

export function EditScholarDataDialog({
  open,
  onOpenChange,
  type,
  personalData,
  bankData,
  cpfLocked = false,
  onSave,
  saving: externalSaving = false,
}: EditScholarDataDialogProps) {
  const [formData, setFormData] = useState<PersonalData | BankData>(
    type === "personal" 
      ? personalData || { name: "", cpf: "", email: "", phone: "", institution: "", academicLevel: "", lattesUrl: "" }
      : bankData || { bankName: "", agency: "", account: "", accountType: "", pixKey: "" }
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lattesError, setLattesError] = useState("");
  const [formError, setFormError] = useState("");

  // Reset form when dialog opens with new data
  useEffect(() => {
    if (open) {
      if (type === "personal" && personalData) {
        setFormData(personalData);
      } else if (type === "bank" && bankData) {
        setFormData(bankData);
      }
      setFormError("");
      setLattesError("");
    }
  }, [open, type, personalData, bankData]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === "lattesUrl") {
      setLattesError("");
    }
    setFormError("");
  };

  const validateLattesUrl = (url: string): boolean => {
    if (!url) return true; // Optional field
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === "http:" || urlObj.protocol === "https:";
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    
    // Validate Lattes URL if provided
    if (type === "personal") {
      const data = formData as PersonalData;
      if (data.lattesUrl && !validateLattesUrl(data.lattesUrl)) {
        setLattesError("URL inválida. Informe uma URL válida (ex: http://lattes.cnpq.br/...)");
        return;
      }
    }
    
    setIsSubmitting(true);
    
    try {
      const result = await onSave(formData);
      
      if (result.success) {
        toast.success(
          type === "personal" 
            ? "Dados pessoais atualizados com sucesso!"
            : "Dados bancários atualizados com sucesso. A validação será realizada em até 48h."
        );
        onOpenChange(false);
      } else {
        setFormError(result.error || "Erro ao salvar dados. Tente novamente.");
        toast.error(result.error || "Erro ao salvar dados");
      }
    } catch (err) {
      console.error("Error saving data:", err);
      setFormError("Erro inesperado. Tente novamente.");
      toast.error("Erro inesperado ao salvar dados");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, "").slice(0, 11);
    return numbers
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})/, "$1-$2");
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "").slice(0, 11);
    if (numbers.length <= 10) {
      return numbers
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    }
    return numbers
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2");
  };

  const isSaving = isSubmitting || externalSaving;

  if (type === "personal") {
    const data = formData as PersonalData;
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Editar Dados Pessoais
              </DialogTitle>
              <DialogDescription>
                Atualize suas informações pessoais. Os dados serão salvos no sistema.
              </DialogDescription>
            </DialogHeader>

            {formError && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Nome Completo
                </Label>
                <Input
                  id="name"
                  value={data.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Seu nome completo"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpf" className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  CPF
                </Label>
                {cpfLocked ? (
                  <>
                    <Input
                      id="cpf"
                      value={data.cpf}
                      readOnly
                      disabled
                      className="bg-muted cursor-not-allowed opacity-70"
                    />
                    <p className="text-xs text-muted-foreground">
                      O CPF não pode ser alterado pelo bolsista. Caso necessário, solicite ao gestor responsável.
                    </p>
                  </>
                ) : (
                  <>
                    <Input
                      id="cpf"
                      value={data.cpf}
                      onChange={(e) => handleChange("cpf", formatCPF(e.target.value))}
                      placeholder="000.000.000-00"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Atenção: Após salvar, o CPF não poderá ser alterado.
                    </p>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={data.email}
                  readOnly
                  disabled
                  className="bg-muted cursor-not-allowed opacity-70"
                />
                <p className="text-xs text-muted-foreground">
                  O e-mail é vinculado à sua conta e não pode ser alterado.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Telefone
                </Label>
                <Input
                  id="phone"
                  value={data.phone}
                  onChange={(e) => handleChange("phone", formatPhone(e.target.value))}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="institution" className="flex items-center gap-2">
                  <School className="w-4 h-4" />
                  Instituição de Vínculo
                </Label>
                <Input
                  id="institution"
                  value={data.institution}
                  onChange={(e) => handleChange("institution", e.target.value)}
                  placeholder="Ex: Universidade Vila Velha, UFES, IFES..."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="academicLevel" className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  Nível Acadêmico Atual
                </Label>
                <Select value={data.academicLevel} onValueChange={(value) => handleChange("academicLevel", value)} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o nível acadêmico" />
                  </SelectTrigger>
                  <SelectContent>
                    {academicLevels.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lattesUrl" className="flex items-center gap-2">
                  <Link2 className="w-4 h-4" />
                  Link do Currículo Lattes
                </Label>
                <Input
                  id="lattesUrl"
                  type="url"
                  value={data.lattesUrl}
                  onChange={(e) => handleChange("lattesUrl", e.target.value)}
                  placeholder="http://lattes.cnpq.br/..."
                  className={lattesError ? "border-destructive" : ""}
                />
                {lattesError ? (
                  <p className="text-xs text-destructive">{lattesError}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Informe o link do seu Currículo Lattes (se aplicável)
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
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
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  const data = formData as BankData;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-success" />
              Editar Dados Bancários
            </DialogTitle>
            <DialogDescription>
              Atualize seus dados bancários. Após alteração, seus dados passarão por validação.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bankName" className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Banco
              </Label>
              <Select value={data.bankName} onValueChange={(value) => handleChange("bankName", value)} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o banco" />
                </SelectTrigger>
                <SelectContent>
                  {banks.map((bank) => (
                    <SelectItem key={bank} value={bank}>
                      {bank}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="agency" className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Agência
                </Label>
                <Input
                  id="agency"
                  value={data.agency}
                  onChange={(e) => handleChange("agency", e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="0000-0"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="account" className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Conta
                </Label>
                <Input
                  id="account"
                  value={data.account}
                  onChange={(e) => handleChange("account", e.target.value.replace(/\D/g, "").slice(0, 12))}
                  placeholder="00000-0"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountType" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Tipo de Conta
              </Label>
              <Select value={data.accountType} onValueChange={(value) => handleChange("accountType", value)} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {accountTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pixKey" className="flex items-center gap-2">
                <Key className="w-4 h-4" />
                Chave Pix
              </Label>
              <Input
                id="pixKey"
                value={data.pixKey}
                onChange={(e) => handleChange("pixKey", e.target.value)}
                placeholder="CPF, e-mail, telefone ou chave aleatória"
              />
              <p className="text-xs text-muted-foreground">
                Informe sua chave Pix para recebimento dos pagamentos.
              </p>
            </div>
          </div>

          <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 mb-4">
            <p className="text-sm text-warning-foreground">
              <strong>Atenção:</strong> Após a alteração, seus dados bancários serão validados em até 48 horas. 
              Durante esse período, o status será "Pendente".
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
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
        </form>
      </DialogContent>
    </Dialog>
  );
}
