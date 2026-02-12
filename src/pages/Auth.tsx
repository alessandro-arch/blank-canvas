import { useState, useEffect } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignupForm } from "@/components/auth/SignupForm";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import logoInnovaGO from "@/assets/logo-innovago.png";

type AuthView = "login" | "signup" | "forgot-password" | "reset-password";

export default function Auth() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [currentView, setCurrentView] = useState<AuthView>("login");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setCurrentView("reset-password");
        setError(null);
        setSuccess(null);
      }
    });

    const isRecovery = searchParams.get("recovery") === "true";
    if (isRecovery) {
    }

    return () => subscription.unsubscribe();
  }, [searchParams]);

  if (user && currentView !== "reset-password") {
    return <Navigate to="/" replace />;
  }

  const handleForgotPassword = () => {
    setCurrentView("forgot-password");
    setError(null);
    setSuccess(null);
  };

  const handleBackToLogin = () => {
    setCurrentView("login");
    setError(null);
    setSuccess(null);
  };

  const handleResetSuccess = () => {
    setCurrentView("login");
    setSuccess("Senha redefinida com sucesso! Faça login com sua nova senha.");
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage || null);
    setSuccess(null);
  };

  const handleSuccess = (successMessage: string) => {
    setSuccess(successMessage);
    setError(null);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as "login" | "signup");
    setError(null);
    setSuccess(null);
  };

  const getCardTitle = () => {
    switch (currentView) {
      case "forgot-password":
        return "Recuperar Senha";
      case "reset-password":
        return "Redefinir Senha";
      default:
        return "Acesso ao Portal";
    }
  };

  const getCardDescription = () => {
    switch (currentView) {
      case "forgot-password":
        return "Recupere o acesso à sua conta";
      case "reset-password":
        return "Crie uma nova senha segura";
      default:
        return "Entre com suas credenciais para acessar o sistema";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <img 
            src={logoInnovaGO} 
            alt="InnovaGO – Sistema de Gestão de Bolsas em Pesquisa e Desenvolvimento" 
            className="h-16 mx-auto mb-4"
          />
          <h1 className="text-xl font-bold text-foreground">InnovaGO</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Portal de Gestão de Bolsas
          </p>
        </div>

        <Card className="shadow-lg border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">{getCardTitle()}</CardTitle>
            <CardDescription>{getCardDescription()}</CardDescription>
          </CardHeader>
          
          <CardContent>
            {currentView === "forgot-password" && (
              <ForgotPasswordForm onBack={handleBackToLogin} />
            )}

            {currentView === "reset-password" && (
              <ResetPasswordForm onSuccess={handleResetSuccess} />
            )}

            {(currentView === "login" || currentView === "signup") && (
              <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">Entrar</TabsTrigger>
                  <TabsTrigger value="signup">Criar Conta</TabsTrigger>
                </TabsList>
                
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                {success && (
                  <Alert className="mb-4 border-success/50 bg-success/10">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <AlertDescription className="text-success">{success}</AlertDescription>
                  </Alert>
                )}
                
                <TabsContent value="login">
                  <LoginForm 
                    onForgotPassword={handleForgotPassword}
                    onError={handleError}
                  />
                </TabsContent>
                
                <TabsContent value="signup">
                  <SignupForm 
                    onError={handleError}
                    onSuccess={handleSuccess}
                  />
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>

        {/* Footer info */}
        <div className="mt-6 text-center space-y-2">
          <p className="text-xs text-muted-foreground">
            Ao acessar, você concorda com os termos de uso do sistema.
          </p>
          <p className="text-xs text-muted-foreground">
            © InnovaGO – Sistema de Gestão de Bolsas em Pesquisa e Desenvolvimento
          </p>
        </div>
      </div>
    </div>
  );
}
