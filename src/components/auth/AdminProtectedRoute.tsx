import { Navigate, useLocation } from "react-router-dom";
import { getLoginRouteForPath } from "@/lib/login-redirect";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Loader2 } from "lucide-react";

interface AdminProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ("admin" | "manager")[];
}

export function AdminProtectedRoute({ 
  children, 
  allowedRoles 
}: AdminProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading, hasManagerAccess, isScholar } = useUserRole();
  const location = useLocation();

  // Avoid race conditions: after auth resolves, role might still be unknown for one render
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

  // If user is a scholar, redirect them to scholar panel
  if (isScholar) {
    return <Navigate to="/bolsista/painel" replace />;
  }

  // Check if user has manager access (admin or manager role)
  if (!hasManagerAccess) {
    return <Navigate to="/acesso-negado" replace />;
  }

  // Check specific role requirements if specified
  if (allowedRoles && role && !allowedRoles.includes(role as "admin" | "manager")) {
    return <Navigate to="/acesso-negado" replace />;
  }

  return <ThemeProvider>{children}</ThemeProvider>;
}
