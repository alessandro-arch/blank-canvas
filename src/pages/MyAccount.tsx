import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, User, Briefcase, Save, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { InstitutionCombobox } from "@/components/my-account/InstitutionCombobox";
import { ImportMecButton } from "@/components/my-account/ImportMecButton";

export default function MyAccount() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Personal info
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Professional info (from profiles table)
  const [lattesUrl, setLattesUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [institutionData, setInstitutionData] = useState<import("@/components/my-account/InstitutionCombobox").InstitutionData>({
    name: "",
    acronym: "",
    sigla: "",
    uf: "",
    isCustom: false,
  });

  useEffect(() => {
    if (!user) return;

    setFullName(user.user_metadata?.full_name || "");
    setEmail(user.email || "");

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch profile
        const { data: profile } = await (supabase as any)
          .from("profiles")
          .select("lattes_url, institution, institution_sigla, institution_uf, institution_is_custom")
          .eq("user_id", user.id)
          .single();

        if (profile) {
          setLattesUrl(profile.lattes_url || "");
          // Load institution by institution_id or fall back to legacy fields
          const instId = (profile as any).institution_id;
          if (instId) {
            const { data: inst } = await (supabase as any)
              .from("institutions")
              .select("id, name, acronym, uf, status")
              .eq("id", instId)
              .single();
            if (inst) {
              setInstitutionData({
                id: inst.id,
                name: inst.name,
                acronym: inst.acronym || "",
                sigla: inst.acronym || "",
                uf: inst.uf,
                status: inst.status,
                isCustom: inst.status !== "approved",
              });
            }
          } else {
            setInstitutionData({
              name: profile.institution || "",
              acronym: (profile as any).institution_sigla || "",
              sigla: (profile as any).institution_sigla || "",
              uf: (profile as any).institution_uf || "",
              isCustom: (profile as any).institution_is_custom || false,
            });
          }
        }

        // Fetch sensitive profile (phone)
        const { data: sensitive } = await supabase
          .from("profiles_sensitive")
          .select("phone")
          .eq("user_id", user.id)
          .single();

        if (sensitive) {
          setPhone(sensitive.phone || "");
        }
      } catch (e) {
        console.warn("Error fetching profile data:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Update profile fields
      const profileUpdate: any = {
        lattes_url: lattesUrl || null,
        institution: institutionData.name || null,
        institution_sigla: institutionData.acronym || institutionData.sigla || null,
        institution_uf: institutionData.uf || null,
        institution_is_custom: institutionData.isCustom,
      };
      if (institutionData.id) {
        profileUpdate.institution_id = institutionData.id;
      }
      const { error: profileError } = await supabase
        .from("profiles")
        .update(profileUpdate)
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      // Upsert sensitive profile (phone)
      const { error: sensitiveError } = await supabase
        .from("profiles_sensitive")
        .upsert(
          { user_id: user.id, phone: phone || null },
          { onConflict: "user_id" }
        );

      if (sensitiveError) throw sensitiveError;

      toast.success("Dados atualizados com sucesso!");
    } catch (e: any) {
      console.error("Error saving profile:", e);
      toast.error("Erro ao salvar dados. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Minha Conta</h1>
                <p className="text-muted-foreground text-sm">Gerencie suas informações pessoais e profissionais.</p>
              </div>
            </div>
            <ImportMecButton />

            {/* Informações Pessoais */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="w-5 h-5" />
                  Informações Pessoais
                </CardTitle>
                <CardDescription>Dados básicos da sua conta.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome completo</Label>
                  <Input id="fullName" value={fullName} disabled className="bg-muted/50" />
                  <p className="text-xs text-muted-foreground">O nome é definido no cadastro e não pode ser alterado aqui.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" value={email} disabled className="bg-muted/50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    disabled={loading}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Informações Profissionais */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Briefcase className="w-5 h-5" />
                  Informações Profissionais
                </CardTitle>
                <CardDescription>Dados acadêmicos e profissionais.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="linkedin">Perfil do LinkedIn</Label>
                  <Input
                    id="linkedin"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/seu-perfil"
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">Em breve — campo será salvo quando disponível no banco.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lattes">Currículo Lattes</Label>
                  <Input
                    id="lattes"
                    value={lattesUrl}
                    onChange={(e) => setLattesUrl(e.target.value)}
                    placeholder="http://lattes.cnpq.br/..."
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Empresa / Instituição *</Label>
                  <InstitutionCombobox
                    value={institutionData}
                    onChange={setInstitutionData}
                    disabled={loading}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Save */}
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving || loading} className="gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar alterações
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
