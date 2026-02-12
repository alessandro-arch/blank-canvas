import { Shield, ShieldAlert } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useAdminMasterMode } from "@/contexts/AdminMasterModeContext";
import { AdminMasterModeToggle } from "./AdminMasterModeToggle";

export function AdminBanner() {
  const { isAdmin } = useUserRole();
  const { isAdminMasterMode, canAccessAdminMasterMode } = useAdminMasterMode();

  if (!isAdmin) return null;

  // Show simplified banner if context isn't properly provided (outside ManagerDashboard)
  if (!canAccessAdminMasterMode) {
    return (
      <div className="bg-warning/10 border-b border-warning/30 px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
          <Shield className="w-4 h-4 text-warning" />
          <span className="text-sm font-medium text-warning">
            Modo Administrador — Acesse o Painel do Gestor para ativar o Modo Master
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`border-b px-4 py-2 ${isAdminMasterMode ? 'bg-destructive/10 border-destructive/30' : 'bg-warning/10 border-warning/30'}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isAdminMasterMode ? (
            <ShieldAlert className="w-4 h-4 text-destructive" />
          ) : (
            <Shield className="w-4 h-4 text-warning" />
          )}
          <span className={`text-sm font-medium ${isAdminMasterMode ? 'text-destructive' : 'text-warning'}`}>
            {isAdminMasterMode 
              ? "⚠️ Modo Administrador Master Ativo — Todas as ações são registradas na trilha de auditoria"
              : "Modo Administrador — Ações críticas exigem ativação do Modo Master"}
          </span>
        </div>
        <AdminMasterModeToggle />
      </div>
    </div>
  );
}
