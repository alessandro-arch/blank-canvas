import { Link } from "react-router-dom";
import { ShieldX, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import logoInnovaGO from "@/assets/logo-innovago.png";

export default function AccessDenied() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-destructive/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        {/* Logo */}
        <img 
          src={logoInnovaGO} 
          alt="InnovaGO" 
          className="h-12 mx-auto mb-8"
        />

        <Card className="shadow-lg border-destructive/20">
          <CardHeader className="pb-4">
            <div className="mx-auto p-4 rounded-full bg-destructive/10 w-fit mb-4">
              <ShieldX className="h-10 w-10 text-destructive" />
            </div>
            <CardTitle className="text-xl text-destructive">Acesso Negado</CardTitle>
            <CardDescription className="text-base">
              Você não tem permissão para acessar esta área do sistema.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Se você acredita que deveria ter acesso, entre em contato com o administrador da sua organização.
            </p>
            
            <Button asChild className="w-full">
              <Link to="/acesso">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao início
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-6">
          <p className="text-xs text-muted-foreground">
            © InnovaGO – Sistema de Gestão de Bolsas em Pesquisa e Desenvolvimento
          </p>
        </div>
      </div>
    </div>
  );
}
