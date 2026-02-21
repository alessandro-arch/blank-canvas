import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginLockout } from "@/hooks/useLoginLockout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Lock, Loader2, ShieldAlert } from "lucide-react";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

interface LoginFormProps {
  onForgotPassword: () => void;
  onError: (error: string) => void;
}

export function LoginForm({ onForgotPassword, onError }: LoginFormProps) {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { isLocked, remainingAttempts, countdown, formattedCountdown, checkLockout, recordAttempt } = useLoginLockout();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onError("");
    
    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      onError(validation.error.errors[0].message);
      return;
    }

    // Check lockout before attempting login
    const locked = await checkLockout(email);
    if (locked) return;
    
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    
    if (error) {
      await recordAttempt(email, false);
      if (error.message.includes("Invalid login credentials")) {
        onError("Email ou senha incorretos. Verifique suas credenciais.");
      } else if (error.message.includes("Email not confirmed")) {
        onError("Seu email ainda não foi confirmado. Verifique sua caixa de entrada.");
      } else {
        onError("Erro ao fazer login. Tente novamente.");
      }
      return;
    }
    
    await recordAttempt(email, true);
    navigate("/acesso");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isLocked && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>
            Conta temporariamente bloqueada por excesso de tentativas.
            Tente novamente em <strong>{formattedCountdown}</strong>.
          </AlertDescription>
        </Alert>
      )}
      {!isLocked && remainingAttempts !== undefined && remainingAttempts <= 2 && remainingAttempts > 0 && (
        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>
            Atenção: {remainingAttempts} tentativa{remainingAttempts > 1 ? "s" : ""} restante{remainingAttempts > 1 ? "s" : ""} antes do bloqueio temporário.
          </AlertDescription>
        </Alert>
      )}
      <div className="space-y-2">
        <Label htmlFor="login-email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="login-email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10"
            required
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="login-password">Senha</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
          <PasswordInput
            id="login-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-10"
            required
          />
        </div>
      </div>
      
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onForgotPassword}
          className="text-sm text-muted-foreground hover:text-primary transition-colors underline-offset-4 hover:underline"
        >
          Esqueceu sua senha?
        </button>
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
  );
}
