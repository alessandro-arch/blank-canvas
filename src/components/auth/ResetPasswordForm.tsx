import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordStrengthIndicator } from "@/components/ui/password-strength-indicator";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, Loader2, AlertCircle, CheckCircle, ShieldCheck } from "lucide-react";
import { z } from "zod";

const resetPasswordSchema = z.object({
  password: z.string().min(10, "A senha deve ter pelo menos 10 caracteres"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

interface ResetPasswordFormProps {
  onSuccess: () => void;
}

export function ResetPasswordForm({ onSuccess }: ResetPasswordFormProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    const validation = resetPasswordSchema.safeParse({ password, confirmPassword });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }
    
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    
    if (error) {
      if (error.message.includes("same password")) {
        setError("A nova senha não pode ser igual à anterior.");
      } else if (
        error.message.toLowerCase().includes("password") ||
        error.message.toLowerCase().includes("weak") ||
        error.message.toLowerCase().includes("policy") ||
        error.message.toLowerCase().includes("strength")
      ) {
        setError("A senha não atende aos requisitos de segurança. Use pelo menos 10 caracteres com letras, números e símbolos.");
      } else {
        setError("Erro ao redefinir senha. Tente novamente.");
      }
      return;
    }
    
    setSuccess(true);
    
    // Sign out and redirect to login after 3 seconds
    setTimeout(async () => {
      await supabase.auth.signOut();
      onSuccess();
      navigate("/acesso");
    }, 3000);
  };

  if (success) {
    return (
      <div className="space-y-6 text-center py-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 mx-auto">
          <ShieldCheck className="w-8 h-8 text-success" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">Senha redefinida com sucesso!</h3>
          <p className="text-sm text-muted-foreground">
            Sua senha foi alterada. Você será redirecionado para a tela de login em instantes...
          </p>
        </div>
        
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Redirecionando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Redefinir senha</h3>
        <p className="text-sm text-muted-foreground">
          Digite sua nova senha abaixo. A senha deve ter pelo menos 10 caracteres, incluindo letras, números e símbolos.
        </p>
      </div>
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="new-password">Nova Senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
            <PasswordInput
              id="new-password"
              placeholder="Mínimo 10 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10"
              required
              autoFocus
            />
          </div>
          <PasswordStrengthIndicator password={password} />
          <p className="text-xs text-muted-foreground">
            Use letras maiúsculas, minúsculas, números e símbolos para maior segurança.
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="confirm-new-password">Confirmar Nova Senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
            <PasswordInput
              id="confirm-new-password"
              placeholder="Confirme sua nova senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10"
              required
            />
          </div>
        </div>
        
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar nova senha"
          )}
        </Button>
      </form>
    </div>
  );
}
