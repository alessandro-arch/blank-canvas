import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { InviteDetails } from "@/types/admin-members";

const InviteAccept = () => {
  const { token } = useParams<{ token: string }>();
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    const fetchInvite = async () => {
      if (!token) return;
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

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    const { data, error } = await supabase.rpc("accept_org_invite", { p_token: token });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      setAccepting(false);
      return;
    }
    setAccepted(true);
    toast({ title: "Convite aceito com sucesso!" });
    setTimeout(() => navigate("/admin/painel"), 2000);
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
            <CardDescription>{invite?.error || "Este convite não é válido."}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button variant="outline" onClick={() => navigate("/")}>Ir para o início</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
            <CardTitle>Convite Aceito!</CardTitle>
            <CardDescription>Você agora é {invite.role} da organização {invite.organization_name}. Redirecionando...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!session) {
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
            <Button onClick={() => navigate(`/admin/login?redirect=/invite/${token}`)}>
              Fazer Login
            </Button>
            <Button variant="outline" onClick={() => navigate(`/criar-conta?redirect=/invite/${token}`)}>
              Criar Conta
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <Building2 className="h-12 w-12 text-primary mx-auto mb-2" />
          <CardTitle>Convite para {invite.organization_name}</CardTitle>
          <CardDescription>
            Você foi convidado como <strong>{invite.role}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button onClick={handleAccept} disabled={accepting}>
            {accepting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Aceitar Convite
          </Button>
          <Button variant="outline" onClick={() => navigate("/")}>Recusar</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default InviteAccept;
