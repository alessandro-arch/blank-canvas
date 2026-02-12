import { useState, useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle, Trash2, UserX, CheckCircle2, XCircle, AlertCircle, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuditLog } from "@/hooks/useAuditLog";

interface UserEligibility {
  userId: string;
  fullName: string | null;
  email: string | null;
  canDelete: boolean;
  hasEnrollments: boolean;
  hasPayments: boolean;
  hasReports: boolean;
}

interface BulkRemovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedUserIds: string[];
  onComplete: () => void;
}

interface ActionResult {
  deleted: number;
  deactivated: number;
  ignored: number;
  deletedNames: string[];
  deactivatedNames: string[];
  ignoredNames: string[];
}

export function BulkRemovalDialog({
  open,
  onOpenChange,
  selectedUserIds,
  onComplete,
}: BulkRemovalDialogProps) {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [eligibilityData, setEligibilityData] = useState<UserEligibility[]>([]);
  const [deactivateIneligible, setDeactivateIneligible] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [confirmationInput, setConfirmationInput] = useState("");
  const { logAction } = useAuditLog();

  const CONFIRMATION_WORD = "REMOVER";

  const eligibleForDeletion = eligibilityData.filter(u => u.canDelete);
  const ineligibleForDeletion = eligibilityData.filter(u => !u.canDelete);

  useEffect(() => {
    if (open && selectedUserIds.length > 0) {
      checkEligibility();
    } else {
      setLoading(true);
      setEligibilityData([]);
      setDeactivateIneligible(false);
      setShowResult(false);
      setResult(null);
      setConfirmationInput("");
    }
  }, [open, selectedUserIds]);

  const checkEligibility = async () => {
    setLoading(true);
    try {
      // Fetch profiles for selected users
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", selectedUserIds);

      if (profilesError) throw profilesError;

      // Fetch enrollments for selected users
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from("enrollments")
        .select("user_id")
        .in("user_id", selectedUserIds);

      if (enrollmentsError) throw enrollmentsError;

      // Fetch payments for selected users
      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select("user_id")
        .in("user_id", selectedUserIds);

      if (paymentsError) throw paymentsError;

      // Fetch reports for selected users
      const { data: reports, error: reportsError } = await supabase
        .from("reports")
        .select("user_id")
        .in("user_id", selectedUserIds);

      if (reportsError) throw reportsError;

      // Build sets for quick lookup
      const usersWithEnrollments = new Set(enrollments?.map(e => e.user_id) || []);
      const usersWithPayments = new Set(payments?.map(p => p.user_id) || []);
      const usersWithReports = new Set(reports?.map(r => r.user_id) || []);

      // Build eligibility data
      const eligibility: UserEligibility[] = selectedUserIds.map(userId => {
        const profile = profiles?.find(p => p.user_id === userId);
        const hasEnrollments = usersWithEnrollments.has(userId);
        const hasPayments = usersWithPayments.has(userId);
        const hasReports = usersWithReports.has(userId);
        const canDelete = !hasEnrollments && !hasPayments && !hasReports;

        return {
          userId,
          fullName: profile?.full_name || null,
          email: profile?.email || null,
          canDelete,
          hasEnrollments,
          hasPayments,
          hasReports,
        };
      });

      setEligibilityData(eligibility);
    } catch (error) {
      console.error("Error checking eligibility:", error);
      toast.error("Erro ao verificar elegibilidade dos usuários");
    } finally {
      setLoading(false);
    }
  };

  const generateReferenceCode = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ERR-${timestamp}-${random}`;
  };

  const handleConfirm = async () => {
    setProcessing(true);
    
    const actionResult: ActionResult = {
      deleted: 0,
      deactivated: 0,
      ignored: 0,
      deletedNames: [],
      deactivatedNames: [],
      ignoredNames: [],
    };

    try {
      // Delete eligible users
      if (eligibleForDeletion.length > 0) {
        const deleteUserIds = eligibleForDeletion.map(u => u.userId);
        const { data, error } = await supabase.functions.invoke("manage-users", {
          body: { action: "delete", userIds: deleteUserIds },
        });

        if (error) {
          const refCode = generateReferenceCode();
          console.error("[BULK_DELETE_ERROR]", { error, refCode });
          toast.error("Erro ao excluir usuários", {
            description: `${error.message || "Falha na comunicação"}. Código: ${refCode}`,
            duration: 10000,
          });
        } else if (data?.results) {
          actionResult.deleted = data.results.success?.length || 0;
          actionResult.deletedNames = eligibleForDeletion
            .filter(u => data.results.success?.includes(u.userId))
            .map(u => u.fullName || u.email || "Usuário");
        }
      }

      // Deactivate ineligible users if option selected
      if (deactivateIneligible && ineligibleForDeletion.length > 0) {
        const deactivateUserIds = ineligibleForDeletion.map(u => u.userId);
        const { data, error } = await supabase.functions.invoke("manage-users", {
          body: { action: "deactivate", userIds: deactivateUserIds },
        });

        if (error) {
          const refCode = generateReferenceCode();
          console.error("[BULK_DEACTIVATE_ERROR]", { error, refCode });
          toast.error("Erro ao desativar usuários", {
            description: `${error.message || "Falha na comunicação"}. Código: ${refCode}`,
            duration: 10000,
          });
        } else if (data?.results) {
          actionResult.deactivated = data.results.success?.length || 0;
          actionResult.deactivatedNames = ineligibleForDeletion
            .filter(u => data.results.success?.includes(u.userId))
            .map(u => u.fullName || u.email || "Usuário");
        }
      } else {
        actionResult.ignored = ineligibleForDeletion.length;
        actionResult.ignoredNames = ineligibleForDeletion.map(u => u.fullName || u.email || "Usuário");
      }

      // Log the action to audit_logs table
      if (actionResult.deleted > 0) {
        await logAction({
          action: "bulk_delete",
          entityType: "user",
          details: {
            total_selected: selectedUserIds.length,
            deleted_count: actionResult.deleted,
            deleted_names: actionResult.deletedNames,
          },
          previousValue: {
            user_ids: eligibleForDeletion.map(u => u.userId),
          },
          newValue: null,
        });
      }

      if (actionResult.deactivated > 0) {
        await logAction({
          action: "bulk_deactivate",
          entityType: "user",
          details: {
            total_selected: selectedUserIds.length,
            deactivated_count: actionResult.deactivated,
            deactivated_names: actionResult.deactivatedNames,
          },
          previousValue: {
            status: "active",
            user_ids: ineligibleForDeletion.map(u => u.userId),
          },
          newValue: {
            status: "inactive",
          },
        });
      }

      console.info("[BULK_ACTION_AUDIT]", {
        timestamp: new Date().toISOString(),
        totalSelected: selectedUserIds.length,
        deleted: actionResult.deleted,
        deactivated: actionResult.deactivated,
        ignored: actionResult.ignored,
      });

      setResult(actionResult);
      setShowResult(true);
    } catch (error: any) {
      const refCode = generateReferenceCode();
      console.error("[BULK_ACTION_ERROR]", { error, refCode });
      toast.error("Erro inesperado", {
        description: `Ocorreu um erro inesperado. Código: ${refCode}`,
        duration: 10000,
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    if (showResult) {
      onComplete();
    }
    onOpenChange(false);
  };

  const getDependencyLabel = (user: UserEligibility) => {
    const deps: string[] = [];
    if (user.hasEnrollments) deps.push("matrículas");
    if (user.hasPayments) deps.push("pagamentos");
    if (user.hasReports) deps.push("relatórios");
    return deps.join(", ");
  };

  if (showResult && result) {
    return (
      <AlertDialog open={open} onOpenChange={handleClose}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-success" />
              Ação Concluída
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 mt-4">
                {result.deleted > 0 && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-success/10 border border-success/20">
                    <Trash2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-success">
                        {result.deleted} usuário(s) removido(s)
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {result.deletedNames.slice(0, 3).join(", ")}
                        {result.deletedNames.length > 3 && ` +${result.deletedNames.length - 3} outros`}
                      </p>
                    </div>
                  </div>
                )}

                {result.deactivated > 0 && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
                    <UserX className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-warning">
                        {result.deactivated} usuário(s) desativado(s)
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {result.deactivatedNames.slice(0, 3).join(", ")}
                        {result.deactivatedNames.length > 3 && ` +${result.deactivatedNames.length - 3} outros`}
                      </p>
                    </div>
                  </div>
                )}

                {result.ignored > 0 && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted border">
                    <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-muted-foreground">
                        {result.ignored} usuário(s) ignorado(s)
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Possuem histórico vinculado e não foram desativados.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleClose}>Fechar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Confirmar Remoção em Massa
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 mt-2">
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div className="text-sm">
                  <strong className="text-destructive">Ação irreversível!</strong>
                  <p className="text-muted-foreground mt-1">
                    Você está prestes a remover {selectedUserIds.length} bolsista(s). A remoção definitiva 
                    só é permitida para usuários sem registros vinculados.
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Verificando elegibilidade...</span>
                </div>
              ) : (
                <>
                  {/* Eligible for deletion */}
                  {eligibleForDeletion.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="bg-success hover:bg-success">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          {eligibleForDeletion.length} podem ser removidos
                        </Badge>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3 max-h-32 overflow-y-auto">
                        <ul className="text-sm space-y-1">
                          {eligibleForDeletion.map(user => (
                            <li key={user.userId} className="flex items-center gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                              <span>{user.fullName || user.email || "Usuário sem nome"}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Ineligible for deletion */}
                  {ineligibleForDeletion.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">
                          <XCircle className="w-3 h-3 mr-1" />
                          {ineligibleForDeletion.length} bloqueados por histórico
                        </Badge>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3 max-h-40 overflow-y-auto">
                        <ul className="text-sm space-y-2">
                          {ineligibleForDeletion.map(user => (
                            <li key={user.userId} className="flex items-start gap-2">
                              <XCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                              <div>
                                <span className="font-medium">
                                  {user.fullName || user.email || "Usuário sem nome"}
                                </span>
                                <p className="text-xs text-muted-foreground">
                                  Possui: {getDependencyLabel(user)}
                                </p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Option to deactivate instead */}
                      <div 
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                          deactivateIneligible 
                            ? "bg-warning/10 border-warning/30" 
                            : "bg-muted/30 border-border hover:border-warning/30"
                        )}
                        onClick={() => setDeactivateIneligible(!deactivateIneligible)}
                      >
                        <Checkbox
                          id="deactivate-ineligible"
                          checked={deactivateIneligible}
                          onCheckedChange={(checked) => setDeactivateIneligible(checked === true)}
                        />
                        <div className="flex-1">
                          <label 
                            htmlFor="deactivate-ineligible" 
                            className="text-sm font-medium cursor-pointer"
                          >
                            Desativar usuários com histórico
                          </label>
                          <p className="text-xs text-muted-foreground">
                            Bloquear acesso mantendo os dados para auditoria
                          </p>
                        </div>
                        <UserX className="w-5 h-5 text-warning" />
                      </div>
                    </div>
                  )}

                  {eligibleForDeletion.length === 0 && ineligibleForDeletion.length > 0 && !deactivateIneligible && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      Nenhum usuário pode ser removido definitivamente. 
                      Marque a opção acima para desativar os usuários.
                    </p>
                  )}

                  {/* Confirmation input for critical action */}
                  {(eligibleForDeletion.length > 0 || deactivateIneligible) && (
                    <div className="mt-4 p-4 rounded-lg border-2 border-dashed border-destructive/30 bg-destructive/5">
                      <div className="flex items-center gap-2 mb-3">
                        <Shield className="w-4 h-4 text-destructive" />
                        <span className="text-sm font-medium text-destructive">Confirmação de Segurança</span>
                      </div>
                      <Label htmlFor="confirm-removal" className="text-sm text-muted-foreground">
                        Digite <span className="font-mono font-bold text-foreground">{CONFIRMATION_WORD}</span> para confirmar:
                      </Label>
                      <Input
                        id="confirm-removal"
                        value={confirmationInput}
                        onChange={(e) => setConfirmationInput(e.target.value)}
                        placeholder={CONFIRMATION_WORD}
                        className="mt-2 font-mono"
                        autoComplete="off"
                        disabled={processing}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel disabled={processing}>Cancelar</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={
              loading || 
              processing || 
              (eligibleForDeletion.length === 0 && !deactivateIneligible) ||
              confirmationInput.toUpperCase() !== CONFIRMATION_WORD
            }
            className="gap-2"
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Confirmar Remoção
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
