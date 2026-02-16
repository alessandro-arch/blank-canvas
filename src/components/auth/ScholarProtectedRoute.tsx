import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Loader2 } from "lucide-react";

interface ScholarProtectedRouteProps {
  children: React.ReactNode;
}

export function ScholarProtectedRoute({ children }: ScholarProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading, hasManagerAccess } = useUserRole();
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
    return <Navigate to="/bolsista/login" state={{ from: location }} replace />;
  }

  // If user is admin/manager, redirect them to admin panel
  if (hasManagerAccess) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  // Only scholars can access scholar routes
  if (role !== "scholar") {
    return <Navigate to="/acesso-negado" replace />;
  }

  return <>{children}</>;
}
