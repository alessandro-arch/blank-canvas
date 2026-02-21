import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getLoginRouteForPath } from "@/lib/login-redirect";
import { ShieldAlert, LogIn, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function SessionExpired() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signOut } = useAuth();
  const returnUrl = searchParams.get("returnUrl");

  const handleLoginAgain = async () => {
    await signOut();
    const loginPath = getLoginRouteForPath(returnUrl || "");
    navigate(loginPath + (returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ""), { replace: true });
  };

  const handleGoHome = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg border-border">
        <CardContent className="flex flex-col items-center gap-6 pt-10 pb-8 px-8 text-center">
          <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-warning" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Sessão expirada</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Sua sessão foi encerrada por inatividade. Por segurança, isso protege seus dados.
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full mt-2">
            <Button onClick={handleLoginAgain} className="w-full gap-2">
              <LogIn className="w-4 h-4" />
              Fazer login novamente
            </Button>
            <Button variant="outline" onClick={handleGoHome} className="w-full gap-2">
              <Home className="w-4 h-4" />
              Ir para a página inicial
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
