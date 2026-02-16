import { useEffect, useState } from "react";
import { useSearchParams, useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, Building2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { InviteDetails } from "@/types/admin-members";

const roleRedirects: Record<string, string> = {
  admin: "/admin/painel",
  manager: "/admin/painel",
  reviewer: "/admin/painel",
  beneficiary: "/bolsista/painel",
  proponente: "/bolsista/painel",
};

const InviteAcceptPage = () => {
  const [searchParams] = useSearchParams();
  const { token: pathToken } = useParams<{ token: string }>();
  const token = searchParams.get("token") || pathToken || null;
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [acceptedRole, setAcceptedRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvite = async () => {
      if (!token) {
        setInvite({ valid: false, error: "Token não informado" });
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.rpc("get_invite_details", { p_token: token });
      if (error) {
        setInvite({ valid: false, error: error.message });
      } else {
        setInvite(data as unknown as InviteDetails);
      }
      setLoading(false);
    };
    fetchInvite();
  }, [token]);

  const isEmailMismatch = session && invite?.valid && invite.email && session.user.email !== invite.email;

  // Auto-accept when user is logged in, invite is valid, and email matches
  useEffect(() => {
    if (session && invite?.valid && !accepted && !accepting && token && !isEmailMismatch) {
      handleAccept();
    }
  }, [session, invite?.valid, isEmailMismatch]);

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    const { data, error } = await supabase.rpc("accept_org_invite", { p_token: token });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      setAccepting(false);
      return;
    }
    const result = data as any;
    const role = result?.role || invite?.role || "manager";
    setAcceptedRole(role);
    setAccepted(true);
    toast({ title: "Convite aceito com sucesso!" });
    const redirect = roleRedirects[role] || "/admin/painel";
    setTimeout(() => navigate(redirect, { replace: true }), 2000);
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!invite || !invite.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle>Convite Inválido</CardTitle>
            <CardDescription>{invite?.error || "Este convite não é válido ou expirou."}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-center">
            <Button variant="outline" onClick={() => navigate("/acesso")}>Ir para o início</Button>
            <a href="mailto:contato@innovago.app" className="text-sm text-muted-foreground hover:text-primary underline">
              Falar com suporte
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accepted) {
    const roleLabel = acceptedRole === "admin" ? "Administrador" : acceptedRole === "manager" ? "Gestor" : acceptedRole === "reviewer" ? "Avaliador" : "Proponente";
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
            <CardTitle>Convite Aceito!</CardTitle>
            <CardDescription>
              Você agora é {roleLabel} da organização {invite.organization_name}. Redirecionando...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!session) {
    const redirectPath = `/convite?token=${token}`;
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <Building2 className="h-12 w-12 text-primary mx-auto mb-2" />
            <CardTitle>Convite para {invite.organization_name}</CardTitle>
            <CardDescription>
              Você foi convidado como <strong>{invite.role}</strong>. Faça login com o e-mail <strong>{invite.email}</strong> para aceitar.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button onClick={() => navigate(`/admin/login?redirect=${encodeURIComponent(redirectPath)}`)}>
              Fazer Login
            </Button>
            <Button variant="outline" onClick={() => navigate(`/criar-conta-membro?redirect=${encodeURIComponent(redirectPath)}`)}>
              Criar Conta
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Email mismatch - show clear message
  if (isEmailMismatch) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-2" />
            <CardTitle>E-mail diferente</CardTitle>
            <CardDescription>
              Este convite foi enviado para <strong>{invite.email}</strong>, mas você está logado como <strong>{session.user.email}</strong>.
              <br /><br />
              Faça logout e entre com o e-mail correto para aceitar o convite.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button onClick={async () => { await supabase.auth.signOut(); }}>
              Fazer Logout
            </Button>
            <Button variant="outline" onClick={() => navigate("/acesso")}>
              Ir para o início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Logged in but waiting for auto-accept
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <CardTitle>Aceitando convite...</CardTitle>
          <CardDescription>Aguarde enquanto processamos seu convite para {invite.organization_name}.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
};

export default InviteAcceptPage;
