import { useParams, Link } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ArrowLeft, User, Clock, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getModalityLabel } from "@/lib/modality-labels";
import { tracedInvokeWithPolling, friendlyError } from "@/lib/logger";
import type { Database } from "@/integrations/supabase/types";

type EnrollmentStatus = Database["public"]["Enums"]["enrollment_status"];
type BankValidationStatus = Database["public"]["Enums"]["bank_validation_status"];

interface ScholarProfile {
  userId: string;
  fullName: string | null;
  email: string | null;
  institution: string | null;
  academicLevel: string | null;
  lattesUrl: string | null;
  isActive: boolean;
  avatarUrl: string | null;
}

interface Enrollment {
  id: string;
  status: EnrollmentStatus;
  modality: string;
  grantValue: number;
  startDate: string;
  endDate: string;
  totalInstallments: number;
  project: {
    title: string;
    code: string;
    orientador: string;
    coordenadorTecnicoIcca: string | null;
  } | null;
}

interface BankAccount {
  bankCode: string;
  bankName: string;
  agency: string;
  accountNumber: string;
  accountType: string | null;
  pixKey: string | null;
  pixKeyType: string | null;
  validationStatus: BankValidationStatus;
}

const enrollmentStatusConfig: Record<EnrollmentStatus, { label: string; className: string }> = {
  active: { label: "Ativo", className: "bg-success/10 text-success" },
  suspended: { label: "Suspenso", className: "bg-warning/10 text-warning" },
  completed: { label: "Concluído", className: "bg-info/10 text-info" },
  cancelled: { label: "Cancelado", className: "bg-destructive/10 text-destructive" },
};

const bankValidationStatusConfig: Record<BankValidationStatus, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "bg-muted text-muted-foreground" },
  under_review: { label: "Em Análise", className: "bg-warning/10 text-warning" },
  validated: { label: "Validado", className: "bg-success/10 text-success" },
  returned: { label: "Devolvido", className: "bg-destructive/10 text-destructive" },
};

const ScholarProfileView = () => {
  const { userId } = useParams<{ userId: string }>();
  
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ScholarProfile | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const fetchScholarData = async () => {
      setLoading(true);
      try {
        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        if (profileError) throw profileError;

        if (profileData) {
          setProfile({
            userId: profileData.user_id,
            fullName: profileData.full_name,
            email: profileData.email,
            institution: profileData.institution,
            academicLevel: profileData.academic_level,
            lattesUrl: profileData.lattes_url,
            isActive: profileData.is_active,
            avatarUrl: profileData.avatar_url,
          });
        }

        // Fetch enrollment with project
        const { data: enrollmentData, error: enrollmentError } = await supabase
          .from("enrollments")
          .select(`
            id,
            status,
            modality,
            grant_value,
            start_date,
            end_date,
            total_installments,
            projects (
              title,
              code,
              orientador,
              coordenador_tecnico_icca,
              modalidade_bolsa
            )
          `)
          .eq("user_id", userId)
          .eq("status", "active")
          .maybeSingle();

        if (enrollmentError) throw enrollmentError;

        if (enrollmentData) {
          const project = enrollmentData.projects as {
            title: string;
            code: string;
            orientador: string;
            coordenador_tecnico_icca: string | null;
            modalidade_bolsa: string | null;
          } | null;

          // Use project's modalidade_bolsa as source of truth, fallback to enrollment.modality
          const modalityToUse = project?.modalidade_bolsa || enrollmentData.modality;

          setEnrollment({
            id: enrollmentData.id,
            status: enrollmentData.status,
            modality: modalityToUse,
            grantValue: enrollmentData.grant_value,
            startDate: enrollmentData.start_date,
            endDate: enrollmentData.end_date,
            totalInstallments: enrollmentData.total_installments,
            project: project ? {
              title: project.title,
              code: project.code,
              orientador: project.orientador,
              coordenadorTecnicoIcca: project.coordenador_tecnico_icca,
            } : null,
          });
        }

        // Fetch bank account
        const { data: bankData, error: bankError } = await supabase
          .from("bank_accounts")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        if (bankError) throw bankError;

        if (bankData) {
          setBankAccount({
            bankCode: bankData.bank_code,
            bankName: bankData.bank_name,
            agency: bankData.agency,
            accountNumber: bankData.account_number,
            accountType: bankData.account_type,
            pixKey: bankData.pix_key_masked,
            pixKeyType: bankData.pix_key_type,
            validationStatus: bankData.validation_status,
          });
        }
      } catch (error) {
        console.error("Error fetching scholar data:", error);
        toast.error("Erro ao carregar dados do bolsista");
      } finally {
        setLoading(false);
      }
    };

    fetchScholarData();
  }, [userId]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR");
  };
  const handleGenerateScholarPdf = async () => {
    if (generatingPdf || !userId) return;
    setGeneratingPdf(true);

    const toastId = toast.loading('Gerando relatório da bolsa...');
    const newWindow = window.open('about:blank', '_blank');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const { data } = await tracedInvokeWithPolling<{ signedUrl: string }>(
        'generate-scholarship-pdf',
        { user_id: userId },
        'ScholarProfileView',
      );

      if (newWindow) {
        newWindow.location.href = data.signedUrl;
      } else {
        const opened = window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
        if (!opened) window.location.href = data.signedUrl;
      }
      toast.success('Relatório gerado com sucesso', { id: toastId });
    } catch (err: any) {
      console.error('Scholar PDF error:', err);
      newWindow?.close();
      toast.error(friendlyError(err, 'Erro ao gerar relatório'), { id: toastId });
    } finally {
      setGeneratingPdf(false);
    }
  };


  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <Header />
        
        <main className="flex-1 p-6 overflow-auto">
          {/* Back button */}
          <div className="flex items-center gap-4 mb-6">
            <Link to="/admin/painel">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Voltar ao Painel
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : !profile ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Bolsista não encontrado.</p>
              <Link to="/admin/painel">
                <Button variant="link">Voltar ao Painel</Button>
              </Link>
            </div>
          ) : (
            <>
              {/* Page Header */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                    {profile.avatarUrl ? (
                      <img
                        src={profile.avatarUrl}
                        alt={profile.fullName || "Avatar"}
                        className="w-14 h-14 rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-7 h-7 text-primary" />
                    )}
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold text-foreground">
                      {profile.fullName || "Sem nome"}
                    </h1>
                    <p className="text-muted-foreground">{profile.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateScholarPdf}
                    disabled={generatingPdf || !enrollment}
                  >
                    {generatingPdf ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4 mr-2" />
                    )}
                    {generatingPdf ? 'Gerando...' : 'Relatório da Bolsa (PDF)'}
                  </Button>
                  {!profile.isActive ? (
                    <Badge variant="destructive">Desativado</Badge>
                  ) : enrollment ? (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${enrollmentStatusConfig[enrollment.status].className}`}>
                      <span className="w-2 h-2 rounded-full bg-current" />
                      {enrollmentStatusConfig[enrollment.status].label}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-warning/10 text-warning">
                      <Clock className="w-4 h-4" />
                      Aguardando Atribuição
                    </span>
                  )}
                </div>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
                {/* Personal Data Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Dados Pessoais</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Nome Completo</p>
                        <p className="font-medium">{profile.fullName || "—"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">E-mail</p>
                        <p className="font-medium">{profile.email || "—"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Instituição</p>
                        <p className="font-medium">{profile.institution || "—"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Nível Acadêmico</p>
                        <p className="font-medium">{profile.academicLevel || "—"}</p>
                      </div>
                    </div>
                    {profile.lattesUrl && (
                      <div>
                        <p className="text-sm text-muted-foreground">Currículo Lattes</p>
                        <a
                          href={profile.lattesUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-sm"
                        >
                          {profile.lattesUrl}
                        </a>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Enrollment/Project Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Dados da Bolsa</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {enrollment ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Projeto</p>
                            <p className="font-medium">{enrollment.project?.title || "—"}</p>
                            {enrollment.project?.code && (
                              <p className="text-xs text-muted-foreground">{enrollment.project.code}</p>
                            )}
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Orientador</p>
                            <p className="font-medium">{enrollment.project?.orientador || "—"}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Modalidade</p>
                            <p className="font-medium">{getModalityLabel(enrollment.modality)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Valor Mensal</p>
                            <p className="font-medium text-primary">{formatCurrency(enrollment.grantValue)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Início</p>
                            <p className="font-medium">{formatDate(enrollment.startDate)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Término</p>
                            <p className="font-medium">{formatDate(enrollment.endDate)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Total de Parcelas</p>
                            <p className="font-medium">{enrollment.totalInstallments}</p>
                          </div>
                          {enrollment.project?.coordenadorTecnicoIcca && (
                            <div>
                              <p className="text-sm text-muted-foreground">Coordenador Técnico</p>
                              <p className="font-medium">{enrollment.project.coordenadorTecnicoIcca}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>Este bolsista ainda não foi atribuído a um projeto.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Bank Account Card */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Dados Bancários</CardTitle>
                      {bankAccount && (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${bankValidationStatusConfig[bankAccount.validationStatus].className}`}>
                          {bankValidationStatusConfig[bankAccount.validationStatus].label}
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {bankAccount ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Banco</p>
                          <p className="font-medium">{bankAccount.bankCode} - {bankAccount.bankName}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Agência</p>
                          <p className="font-medium">{bankAccount.agency}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Conta</p>
                          <p className="font-medium">{bankAccount.accountNumber}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Tipo</p>
                          <p className="font-medium">
                            {bankAccount.accountType === "checking" ? "Corrente" : 
                             bankAccount.accountType === "savings" ? "Poupança" : 
                             bankAccount.accountType || "—"}
                          </p>
                        </div>
                        {bankAccount.pixKey && (
                          <>
                            <div>
                              <p className="text-sm text-muted-foreground">Chave PIX</p>
                              <p className="font-medium">{bankAccount.pixKey}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Tipo da Chave</p>
                              <p className="font-medium">{bankAccount.pixKeyType || "—"}</p>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>Dados bancários não cadastrados.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default ScholarProfileView;
