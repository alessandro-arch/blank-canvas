import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Loader2 } from "lucide-react";

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ("admin" | "manager" | "scholar")[];
  requireManagerAccess?: boolean;
}

export function RoleProtectedRoute({ 
  children, 
  allowedRoles,
  requireManagerAccess = false 
}: RoleProtectedRouteProps) {
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
    return <Navigate to="/acesso" state={{ from: location }} replace />;
  }

  // Check manager access requirement
  if (requireManagerAccess && !hasManagerAccess) {
    return <Navigate to="/" replace />;
  }

  // Check specific role requirements
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
