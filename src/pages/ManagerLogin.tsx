import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useLoginLockout } from "@/hooks/useLoginLockout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Mail, Lock, Loader2, ArrowLeft, Briefcase, ShieldAlert } from "lucide-react";
import { z } from "zod";
import logoInnovaGO from "@/assets/logo-innovago.png";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

export default function ManagerLogin() {
  const { user, signIn } = useAuth();
  const { role, loading: roleLoading, hasManagerAccess, isScholar, isAuditor } = useUserRole();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { isLocked, remainingAttempts, countdown, formattedCountdown, checkLockout, recordAttempt } = useLoginLockout();

  useEffect(() => {
    if (user && !roleLoading) {
      const returnUrl = searchParams.get("returnUrl");
      if (isAuditor) {
        navigate("/auditor/dashboard", { replace: true });
      } else if (isScholar) {
        navigate(returnUrl?.startsWith("/bolsista") ? returnUrl : "/bolsista/painel", { replace: true });
      } else if (hasManagerAccess) {
        navigate(returnUrl?.startsWith("/manager") || returnUrl?.startsWith("/admin") ? returnUrl : "/admin/dashboard", { replace: true });
      }
    }
  }, [user, role, roleLoading, hasManagerAccess, isScholar, isAuditor, navigate, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    const locked = await checkLockout(email);
    if (locked) return;
    
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    
    if (error) {
      await recordAttempt(email, false);
      if (error.message.includes("Invalid login credentials")) {
        setError("Email ou senha incorretos. Verifique suas credenciais.");
      } else if (error.message.includes("Email not confirmed")) {
        setError("Seu email ainda não foi confirmado. Verifique sua caixa de entrada.");
      } else {
        setError("Erro ao fazer login. Tente novamente.");
      }
    } else {
      await recordAttempt(email, true);
    }
  };

  if (user && roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link 
          to="/acesso" 
          replace
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao início
        </Link>

        <div className="text-center mb-8">
          <img 
            src={logoInnovaGO} 
            alt="InnovaGO" 
            className="h-14 mx-auto mb-4"
          />
          <div className="flex items-center justify-center gap-2 mb-2">
            <Briefcase className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Portal do Gestor</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            InnovaGO
          </p>
        </div>

        <Card className="shadow-lg border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Acesse o Portal do Gestor</CardTitle>
            <CardDescription>Entre com suas credenciais de gestor</CardDescription>
          </CardHeader>
          
          <CardContent>
            {isLocked && (
              <Alert variant="destructive" className="mb-4">
                <ShieldAlert className="h-4 w-4" />
                <AlertDescription>
                  Conta temporariamente bloqueada por excesso de tentativas.
                  Tente novamente em <strong>{formattedCountdown}</strong>.
                </AlertDescription>
              </Alert>
            )}
            {!isLocked && remainingAttempts !== undefined && remainingAttempts <= 2 && remainingAttempts > 0 && (
              <Alert className="mb-4">
                <ShieldAlert className="h-4 w-4" />
                <AlertDescription>
                  Atenção: {remainingAttempts} tentativa{remainingAttempts > 1 ? "s" : ""} restante{remainingAttempts > 1 ? "s" : ""} antes do bloqueio temporário.
                </AlertDescription>
              </Alert>
            )}
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="gestor@organizacao.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                  <PasswordInput
                    id="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <div className="flex justify-end">
                <Link
                  to="/recuperar-senha"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors underline-offset-4 hover:underline"
                >
                  Esqueceu sua senha?
                </Link>
              </div>
              
              <Button type="submit" className="w-full" disabled={loading || isLocked}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Entrando...
                  </>
                ) : isLocked ? (
                  `Bloqueado (${formattedCountdown})`
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-sm text-center text-muted-foreground">
                O acesso de gestores é configurado pela organização.
                <br />
                Contate o suporte se precisar de ajuda.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            © InnovaGO – Sistema de Gestão de Bolsas em Pesquisa e Desenvolvimento
          </p>
        </div>
      </div>
    </div>
  );
}
