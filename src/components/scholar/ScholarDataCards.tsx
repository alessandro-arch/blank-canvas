import { useState } from "react";
import { 
  User, 
  Mail, 
  Phone, 
  CreditCard, 
  Building2, 
  Briefcase, 
  Calendar, 
  DollarSign,
  Eye,
  EyeOff,
  ShieldCheck,
  ShieldAlert,
  Key,
  Pencil,
  Clock,
  GraduationCap,
  School,
  Link2,
  Loader2,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { EditScholarDataDialog } from "./EditScholarDataDialog";
import { useScholarEnrollment } from "@/hooks/useScholarEnrollment";
import { useScholarProfile } from "@/hooks/useScholarProfile";
import { useBankDataStatus } from "@/hooks/useBankDataStatus";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Academic level options for display
export const academicLevelLabels: Record<string, string> = {
  ensino_medio_completo: "Ensino Médio Completo",
  graduado: "Graduado",
  mestrado: "Mestrado",
  doutorado: "Doutorado",
  pos_doutorado: "Pós-Doutorado",
};

function maskCPF(cpf: string): string {
  if (!cpf) return "—";
  return cpf.replace(/(\d{3})\.(\d{3})\.(\d{3})-(\d{2})/, "***.$2.***-**");
}

function maskAccount(account: string): string {
  if (!account) return "—";
  if (account.length <= 2) return account;
  return "****" + account.slice(-2);
}

function maskPixKey(key: string): string {
  if (!key) return "—";
  if (key.includes("@")) {
    const [name, domain] = key.split("@");
    return `${name.slice(0, 2)}***@${domain}`;
  }
  if (key.length <= 5) return key;
  return key.slice(0, 3) + "***" + key.slice(-2);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

interface DataRowProps {
  icon: typeof User;
  label: string;
  value: string;
  masked?: boolean;
  showSensitive?: boolean;
  maskedValue?: string;
  isEmpty?: boolean;
}

function DataRow({ icon: Icon, label, value, masked, showSensitive, maskedValue, isEmpty }: DataRowProps) {
  const displayValue = masked && !showSensitive && maskedValue ? maskedValue : value;
  
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <p className={cn(
          "text-sm font-medium",
          isEmpty ? "text-muted-foreground italic" : "text-foreground",
          masked && !showSensitive && "font-mono"
        )}>
          {displayValue || "—"}
        </p>
      </div>
      {masked && value && (
        <div className="flex-shrink-0">
          {showSensitive ? (
            <Eye className="w-4 h-4 text-muted-foreground" />
          ) : (
            <EyeOff className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      )}
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="mt-1">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-muted-foreground">Progresso</span>
        <span className="font-medium text-foreground">{value}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn(
            "h-full rounded-full transition-all",
            value >= 75 ? "bg-success" : value >= 50 ? "bg-info" : value >= 25 ? "bg-warning" : "bg-destructive"
          )}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

const validationStatusConfig = {
  validated: { label: "Validado", icon: ShieldCheck, className: "bg-success/10 text-success" },
  pending: { label: "Pendente", icon: ShieldAlert, className: "bg-warning/10 text-warning" },
  rejected: { label: "Rejeitado", icon: ShieldAlert, className: "bg-destructive/10 text-destructive" },
  not_filled: { label: "Não preenchido", icon: ShieldAlert, className: "bg-muted text-muted-foreground" },
};

export function ScholarDataCards() {
  const [showSensitive, setShowSensitive] = useState(false);
  const [editPersonalOpen, setEditPersonalOpen] = useState(false);
  const [editBankOpen, setEditBankOpen] = useState(false);
  
  const { hasActiveEnrollment, enrollment } = useScholarEnrollment();
  const { 
    personalData, 
    bankData, 
    loading, 
    saving,
    lastUpdated,
    cpfLocked,
    savePersonalData, 
    saveBankData,
    refresh
  } = useScholarProfile();
  const { status: bankStatus } = useBankDataStatus();

  const validationConfig = validationStatusConfig[bankStatus] || validationStatusConfig.not_filled;
  const ValidationIcon = validationConfig.icon;

  // Calculate project data from enrollment
  const projectData = enrollment ? {
    name: enrollment.project?.title || "",
    proponent: enrollment.project?.orientador || "",
    startDate: enrollment.start_date,
    endDate: enrollment.end_date,
    monthlyValue: enrollment.grant_value,
    installments: enrollment.total_installments,
    totalValue: enrollment.grant_value * enrollment.total_installments,
    progress: 0, // TODO: Calculate from payments
  } : null;

  const handleSavePersonal = async (data: typeof personalData) => {
    const result = await savePersonalData(data);
    return result;
  };

  const handleSaveBank = async (data: { bankName: string; agency: string; account: string; accountType: string; pixKey: string }) => {
    const result = await saveBankData({
      bankName: data.bankName,
      bankCode: "", // Will be derived from bankName
      agency: data.agency,
      account: data.account,
      accountType: data.accountType,
      pixKey: data.pixKey,
      pixKeyType: "",
    });
    return result;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando dados do perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with last updated and reveal button */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        {lastUpdated && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>
              Última atualização: {format(new Date(lastUpdated), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
            </span>
            <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </Button>
          </div>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant={showSensitive ? "outline" : "default"} className="gap-2">
              {showSensitive ? (
                <>
                  <EyeOff className="w-4 h-4" />
                  Ocultar Dados Sensíveis
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  Revelar Dados Sensíveis
                </>
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {showSensitive ? "Ocultar dados sensíveis?" : "Revelar dados sensíveis?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {showSensitive 
                  ? "Os dados sensíveis como CPF, conta bancária e chave Pix serão mascarados novamente."
                  : "Você está prestes a visualizar dados sensíveis do bolsista, incluindo CPF completo, número da conta e chave Pix. Esta ação será registrada no sistema por motivos de segurança e auditoria."
                }
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => setShowSensitive(!showSensitive)}>
                {showSensitive ? "Ocultar" : "Confirmar e Revelar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personal Data */}
        <div className="card-institutional">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <User className="w-5 h-5 text-primary-foreground" />
              </div>
              <h3 className="font-semibold text-foreground">Dados Pessoais</h3>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-1.5 text-primary hover:text-primary"
              onClick={() => setEditPersonalOpen(true)}
              disabled={saving}
            >
              <Pencil className="w-4 h-4" />
              Editar
            </Button>
          </div>

          <div className="space-y-0">
            <DataRow 
              icon={User} 
              label="Nome Completo" 
              value={personalData.name}
              isEmpty={!personalData.name}
            />
            <DataRow 
              icon={CreditCard} 
              label="CPF" 
              value={personalData.cpf}
              masked={!!personalData.cpf}
              showSensitive={showSensitive}
              maskedValue={maskCPF(personalData.cpf)}
              isEmpty={!personalData.cpf}
            />
            <DataRow 
              icon={Mail} 
              label="E-mail" 
              value={personalData.email}
              isEmpty={!personalData.email}
            />
            <DataRow 
              icon={Phone} 
              label="Telefone" 
              value={personalData.phone}
              isEmpty={!personalData.phone}
            />
            <DataRow 
              icon={School} 
              label="Instituição de Vínculo" 
              value={personalData.institution}
              isEmpty={!personalData.institution}
            />
            <DataRow 
              icon={GraduationCap} 
              label="Nível Acadêmico" 
              value={personalData.academicLevel ? academicLevelLabels[personalData.academicLevel] || personalData.academicLevel : ""}
              isEmpty={!personalData.academicLevel}
            />
            <DataRow 
              icon={Link2} 
              label="Currículo Lattes" 
              value={personalData.lattesUrl}
              isEmpty={!personalData.lattesUrl}
            />
          </div>
        </div>

        {/* Project Data */}
        <div className="card-institutional">
          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border">
            <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-info" />
            </div>
            <h3 className="font-semibold text-foreground">Dados do Projeto</h3>
          </div>

          {hasActiveEnrollment && projectData ? (
            <div className="space-y-0">
              <DataRow 
                icon={Briefcase} 
                label="Nome do Projeto" 
                value={projectData.name}
                isEmpty={!projectData.name}
              />
              <DataRow 
                icon={User} 
                label="Orientador" 
                value={projectData.proponent}
                isEmpty={!projectData.proponent}
              />
              <DataRow 
                icon={Calendar} 
                label="Início" 
                value={projectData.startDate ? format(new Date(projectData.startDate), "dd/MM/yyyy") : ""}
                isEmpty={!projectData.startDate}
              />
              <DataRow 
                icon={Calendar} 
                label="Fim" 
                value={projectData.endDate ? format(new Date(projectData.endDate), "dd/MM/yyyy") : ""}
                isEmpty={!projectData.endDate}
              />
              <DataRow 
                icon={DollarSign} 
                label="Valor Total" 
                value={projectData.totalValue ? formatCurrency(projectData.totalValue) : ""}
                isEmpty={!projectData.totalValue}
              />
              <DataRow 
                icon={DollarSign} 
                label="Parcela Mensal" 
                value={projectData.monthlyValue ? formatCurrency(projectData.monthlyValue) : ""}
                isEmpty={!projectData.monthlyValue}
              />
              <DataRow 
                icon={Calendar} 
                label="Parcelas" 
                value={projectData.installments ? `${projectData.installments} meses` : ""}
                isEmpty={!projectData.installments}
              />
              
              {projectData.progress > 0 && (
                <div className="pt-3">
                  <ProgressBar value={projectData.progress} />
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-warning" />
              </div>
              <p className="text-muted-foreground text-sm">
                Projeto ainda não atribuído pelo gestor responsável.
              </p>
            </div>
          )}
        </div>

        {/* Bank Data */}
        <div className="card-institutional">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-success" />
              </div>
              <h3 className="font-semibold text-foreground">Dados Bancários</h3>
            </div>
            {/* Only allow editing if status is pending or not filled */}
            {(bankStatus === "pending" || bankStatus === "not_filled") && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-1.5 text-success hover:text-success"
                onClick={() => setEditBankOpen(true)}
                disabled={saving}
              >
                <Pencil className="w-4 h-4" />
                {bankData?.bankName ? "Editar" : "Preencher"}
              </Button>
            )}
          </div>

          {bankData?.bankName ? (
            <div className="space-y-0">
              <DataRow 
                icon={Building2} 
                label="Banco" 
                value={bankData.bankName}
                isEmpty={!bankData.bankName}
              />
              <DataRow 
                icon={Building2} 
                label="Agência" 
                value={bankData.agency}
                isEmpty={!bankData.agency}
              />
              <DataRow 
                icon={CreditCard} 
                label="Conta" 
                value={bankData.account}
                masked={!!bankData.account}
                showSensitive={showSensitive}
                maskedValue={maskAccount(bankData.account)}
                isEmpty={!bankData.account}
              />
              <DataRow 
                icon={CreditCard} 
                label="Tipo de Conta" 
                value={bankData.accountType}
                isEmpty={!bankData.accountType}
              />
              <DataRow 
                icon={Key} 
                label="Chave Pix" 
                value={bankData.pixKey}
                masked={!!bankData.pixKey}
                showSensitive={showSensitive}
                maskedValue={maskPixKey(bankData.pixKey)}
                isEmpty={!bankData.pixKey}
              />
              
              {/* Validation Status */}
              <div className="pt-3 mt-3 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">Status de Validação</p>
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium",
                  validationConfig.className
                )}>
                  <ValidationIcon className="w-4 h-4" />
                  {validationConfig.label}
                </span>
                {bankStatus === "validated" && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Dados validados. Edição bloqueada.
                  </p>
                )}
                {bankStatus === "rejected" && (
                  <p className="text-xs text-destructive mt-2">
                    Dados rejeitados. Aguarde instruções do gestor.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Building2 className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm mb-4">
                Nenhum dado bancário cadastrado.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1.5"
                onClick={() => setEditBankOpen(true)}
                disabled={saving}
              >
                <Pencil className="w-4 h-4" />
                Cadastrar Dados Bancários
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Edit Dialogs */}
      <EditScholarDataDialog
        open={editPersonalOpen}
        onOpenChange={setEditPersonalOpen}
        type="personal"
        personalData={personalData}
        cpfLocked={cpfLocked}
        onSave={handleSavePersonal}
        saving={saving}
      />
      <EditScholarDataDialog
        open={editBankOpen}
        onOpenChange={setEditBankOpen}
        type="bank"
        bankData={bankData ? {
          bankName: bankData.bankName,
          agency: bankData.agency,
          account: bankData.account,
          accountType: bankData.accountType,
          pixKey: bankData.pixKey,
        } : undefined}
        onSave={handleSaveBank}
        saving={saving}
      />
    </div>
  );
}
