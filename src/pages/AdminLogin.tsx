import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Mail, Lock, Loader2, ArrowLeft, Users } from "lucide-react";
import { z } from "zod";
import logoInnovaGO from "@/assets/logo-innovago.png";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

export default function AdminLogin() {
  const { user, signIn } = useAuth();
  const { role, loading: roleLoading, hasManagerAccess, isScholar } = useUserRole();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Redirect based on role after login
  useEffect(() => {
    if (user && !roleLoading) {
      if (isScholar) {
        // Scholar trying to access admin portal - redirect to scholar portal
        navigate("/bolsista/painel", { replace: true });
      } else if (hasManagerAccess) {
        navigate("/admin/dashboard", { replace: true });
      }
    }
  }, [user, role, roleLoading, hasManagerAccess, isScholar, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }
    
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    
    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        setError("Email ou senha incorretos. Verifique suas credenciais.");
      } else if (error.message.includes("Email not confirmed")) {
        setError("Seu email ainda não foi confirmado. Verifique sua caixa de entrada.");
      } else {
        setError("Erro ao fazer login. Tente novamente.");
      }
    }
  };

  // Show loading while checking auth
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
        {/* Back link */}
        <Link 
          to="/acesso" 
          replace
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao início
        </Link>

        {/* Logo/Header */}
        <div className="text-center mb-8">
          <img 
            src={logoInnovaGO} 
            alt="InnovaGO" 
            className="h-14 mx-auto mb-4"
          />
          <div className="flex items-center justify-center gap-2 mb-2">
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Portal do Administrador</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            InnovaGO
          </p>
        </div>

        <Card className="shadow-lg border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Acesse o Portal do Administrador</CardTitle>
            <CardDescription>Entre com suas credenciais de gestor</CardDescription>
          </CardHeader>
          
          <CardContent>
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
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-sm text-center text-muted-foreground">
                O acesso de administradores é configurado pela organização.
                <br />
                Contate o suporte se precisar de ajuda.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            © InnovaGO – Sistema de Gestão de Bolsas em Pesquisa e Desenvolvimento
          </p>
        </div>
      </div>
    </div>
  );
}
