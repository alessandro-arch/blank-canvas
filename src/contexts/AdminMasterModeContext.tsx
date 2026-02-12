import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";

interface AdminMasterModeContextType {
  isAdminMasterMode: boolean;
  activateAdminMasterMode: () => void;
  deactivateAdminMasterMode: () => void;
  canAccessAdminMasterMode: boolean;
}

const defaultContext: AdminMasterModeContextType = {
  isAdminMasterMode: false,
  activateAdminMasterMode: () => {},
  deactivateAdminMasterMode: () => {},
  canAccessAdminMasterMode: false,
};

const AdminMasterModeContext = createContext<AdminMasterModeContextType>(defaultContext);

export function AdminMasterModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const [isAdminMasterMode, setIsAdminMasterMode] = useState(false);

  // Only admin users can access Admin Master Mode
  const canAccessAdminMasterMode = isAdmin;

  const activateAdminMasterMode = useCallback(() => {
    if (canAccessAdminMasterMode) {
      setIsAdminMasterMode(true);
      console.log("[ADMIN_MASTER_MODE] Activated by user:", user?.email);
    }
  }, [canAccessAdminMasterMode, user?.email]);

  const deactivateAdminMasterMode = useCallback(() => {
    setIsAdminMasterMode(false);
    console.log("[ADMIN_MASTER_MODE] Deactivated by user:", user?.email);
  }, [user?.email]);

  return (
    <AdminMasterModeContext.Provider
      value={{
        isAdminMasterMode,
        activateAdminMasterMode,
        deactivateAdminMasterMode,
        canAccessAdminMasterMode,
      }}
    >
      {children}
    </AdminMasterModeContext.Provider>
  );
}

export function useAdminMasterMode() {
  const context = useContext(AdminMasterModeContext);
  return context;
}
