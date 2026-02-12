import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordStrengthIndicator } from "@/components/ui/password-strength-indicator";
import { Label } from "@/components/ui/label";
import { Mail, Lock, User, Loader2, CreditCard, Ticket } from "lucide-react";
import { z } from "zod";
import { validateCPF, formatCPF, unformatCPF } from "@/lib/cpf-validator";

const signupSchema = z.object({
  inviteCode: z.string().min(1, "Código de convite é obrigatório"),
  fullName: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  cpf: z.string().refine((val) => validateCPF(val), {
    message: "CPF inválido. Verifique os dígitos.",
  }),
  email: z.string().email("Email inválido"),
  password: z.string().min(10, "A senha deve ter pelo menos 10 caracteres"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

interface SignupFormProps {
  onError: (error: string) => void;
  onSuccess: (message: string) => void;
}

export function SignupForm({ onError, onSuccess }: SignupFormProps) {
  const { signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setCpf(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onError("");
    
    const validation = signupSchema.safeParse({
      inviteCode,
      fullName: name,
      cpf,
      email,
      password,
      confirmPassword,
    });
    
    if (!validation.success) {
      onError(validation.error.errors[0].message);
      return;
    }
    
    setLoading(true);
    const cleanCPF = unformatCPF(cpf);
    const { error } = await signUp(email, password, name, cleanCPF, inviteCode);
    setLoading(false);
    
    if (error) {
      if (error.message.includes("User already registered")) {
        onError("Este email já está cadastrado. Tente fazer login.");
      } else if (error.message.includes("cpf") || error.message.includes("CPF")) {
        onError("Este CPF já está cadastrado no sistema.");
      } else if (error.message.includes("invite") || error.message.includes("código")) {
        onError("Código de convite inválido ou expirado.");
      } else if (
        error.message.toLowerCase().includes("password") ||
        error.message.toLowerCase().includes("weak") ||
        error.message.toLowerCase().includes("policy") ||
        error.message.toLowerCase().includes("strength")
      ) {
        onError("A senha não atende aos requisitos de segurança. Use pelo menos 10 caracteres com letras, números e símbolos.");
      } else {
        onError("Erro ao criar conta. Tente novamente.");
      }
      return;
    }
    
    onSuccess("Conta criada com sucesso! Verifique seu email para confirmar o cadastro.");
    setInviteCode("");
    setName("");
    setCpf("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signup-invite-code">Código de Convite</Label>
        <div className="relative">
          <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="signup-invite-code"
            type="text"
            placeholder="Digite o código recebido"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            className="pl-10 uppercase"
            required
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Você precisa de um código de convite para se cadastrar. Solicite ao gestor do projeto.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-name">Nome Completo</Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="signup-name"
            type="text"
            placeholder="Seu nome completo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="pl-10"
            required
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="signup-cpf">CPF</Label>
        <div className="relative">
          <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="signup-cpf"
            type="text"
            placeholder="000.000.000-00"
            value={cpf}
            onChange={handleCPFChange}
            className="pl-10"
            maxLength={14}
            required
          />
        </div>
        <p className="text-xs text-muted-foreground">
          O CPF será seu identificador e não poderá ser alterado posteriormente.
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="signup-email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="signup-email"
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
        <Label htmlFor="signup-password">Senha</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
          <PasswordInput
            id="signup-password"
            placeholder="Mínimo 10 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-10"
            required
          />
        </div>
        <PasswordStrengthIndicator password={password} />
        <p className="text-xs text-muted-foreground">
          Use letras maiúsculas, minúsculas, números e símbolos para maior segurança.
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="signup-confirm">Confirmar Senha</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
          <PasswordInput
            id="signup-confirm"
            placeholder="Confirme sua senha"
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
            Criando conta...
          </>
        ) : (
          "Criar Conta"
        )}
      </Button>
    </form>
  );
}
