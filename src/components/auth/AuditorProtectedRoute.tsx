import { Navigate, useLocation } from "react-router-dom";
import { getLoginRouteForPath } from "@/lib/login-redirect";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Loader2 } from "lucide-react";

interface AuditorProtectedRouteProps {
  children: React.ReactNode;
}

export function AuditorProtectedRoute({ children }: AuditorProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading, isAuditor } = useUserRole();
  const location = useLocation();

  const roleUnknown = !!user && role === null;
  const isLoading = authLoading || roleLoading || roleUnknown;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={getLoginRouteForPath(location.pathname)} state={{ from: location }} replace />;
  }

  if (!isAuditor) {
    return <Navigate to="/acesso-negado" replace />;
  }

  return <ThemeProvider>{children}</ThemeProvider>;
}
