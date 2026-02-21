import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

/**
 * AuthGate – blocks ALL children from rendering (and therefore from
 * firing any Supabase query) until the initial session check is done.
 *
 * Place this inside AuthProvider but ABOVE any component that may
 * call supabase.from(...) or supabase.rpc(...).
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Verificando sessão…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
