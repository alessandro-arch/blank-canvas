import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Check, X, Star, Zap, Building2, Landmark, Shield, ShieldCheck, Lock, Eye, ClipboardList, FileSearch, BarChart3, FileText, LayoutDashboard, FileCheck, Wallet, FileBarChart, Target, Layers, Users, MessageCircle, Mail, Globe, Instagram, Linkedin, HelpCircle, ChevronUp, GraduationCap, FlaskConical, HeartHandshake, Network } from "lucide-react";
import heroIllustration from "@/assets/hero-illustration.png";
import logoInnovago from "@/assets/logo-innovago.png";
import logoBolsago from "@/assets/logo-bolsago.jpeg";

/* ───────── Navbar ───────── */
const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/95 backdrop-blur-sm shadow-sm" : "bg-white"}`}>
      <div className="max-w-[1200px] mx-auto flex items-center justify-between px-6 h-[64px]">
        <img src={logoBolsago} alt="BolsaGO" className="h-10 object-contain" />
        <div className="hidden md:flex items-center gap-8">
          <button onClick={() => scrollTo("planos")} className="text-[14px] text-muted-foreground hover:text-foreground transition-colors">Planos</button>
          <button onClick={() => scrollTo("comparativo")} className="text-[14px] text-muted-foreground hover:text-foreground transition-colors">Comparativo</button>
          <button onClick={() => scrollTo("seguranca")} className="text-[14px] text-muted-foreground hover:text-foreground transition-colors">Segurança</button>
          <button onClick={() => scrollTo("contato")} className="text-[14px] text-muted-foreground hover:text-foreground transition-colors">Contato</button>
          <button onClick={() => scrollTo("contato")} className="bg-foreground text-white text-[14px] font-medium px-5 py-2 rounded-lg hover:opacity-90 transition-opacity">Fale Conosco</button>
        </div>
      </div>
    </nav>
  );
};

/* ───────── Section wrapper ───────── */
const Section = ({ children, className = "", id, bg = "bg-white" }: { children: React.ReactNode; className?: string; id?: string; bg?: string }) => (
  <section id={id} className={`${bg} ${className}`}>
    <div className="max-w-[1200px] mx-auto px-6">{children}</div>
  </section>
);

/* ───────── Hero ───────── */
const HeroSection = () => {
  const navigate = useNavigate();
  return (
    <Section className="pt-[140px] pb-[60px]">
      <div className="max-w-[600px]">
        <p className="text-[13px] font-semibold text-primary tracking-wider uppercase mb-4">Uma solução InnovaGO</p>
        <h1 className="text-[36px] sm:text-[42px] leading-[1.15] font-bold text-foreground mb-5">
          Plataforma BolsaGO: Inteligência digital para a gestão de bolsas e projetos.
        </h1>
        <p className="text-[16px] text-muted-foreground leading-relaxed mb-8 max-w-[520px]">
          Organize, acompanhe e comprove atividades de Pesquisa, Desenvolvimento e Inovação com rastreabilidade, transparência e conformidade regulatória.
        </p>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => navigate("/acesso")} className="bg-foreground text-white text-[14px] font-medium px-7 py-3 rounded-lg hover:opacity-90 transition-opacity">
            Acesse o seu perfil
          </button>
          <button onClick={() => document.getElementById("planos")?.scrollIntoView({ behavior: "smooth" })} className="border border-border text-foreground text-[14px] font-medium px-7 py-3 rounded-lg hover:bg-muted transition-colors">
            Ver planos
          </button>
        </div>
      </div>
      <div className="flex justify-center mt-12">
        <img src={heroIllustration} alt="Ilustração BolsaGO - Ciência, Tecnologia, Inovação e Gestão de Projetos" className="w-full max-w-[600px] h-auto" />
      </div>
    </Section>
  );
};

/* ───────── Benefícios principais ───────── */
const benefits = [
  "Gestão completa de bolsistas e projetos",
  "Relatórios mensais com rastreabilidade",
  "Liberação e controle de pagamentos",
  "Dashboards estratégicos e KPIs institucionais",
  "Conformidade regulatória e trilha de auditoria",
];

const BenefitsSection = () => (
  <Section className="py-[100px]" bg="bg-muted/40">
    <div className="text-center mb-12">
      <p className="text-[13px] font-semibold text-primary tracking-wider uppercase mb-4">Benefícios</p>
      <h2 className="text-[28px] sm:text-[34px] font-bold text-foreground mb-4">Por que escolher a Plataforma BolsaGO?</h2>
    </div>
    <div className="max-w-[640px] mx-auto space-y-4">
      {benefits.map((b) => (
        <div key={b} className="flex items-start gap-3 bg-white rounded-xl border border-border p-5 hover:shadow-md transition-shadow">
          <Check className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <span className="text-[15px] text-foreground font-medium">{b}</span>
        </div>
      ))}
    </div>
  </Section>
);

/* ───────── Para quem é ───────── */
const audiences = [
  { icon: GraduationCap, title: "Universidades e centros de pesquisa", desc: "Gestão centralizada de bolsistas, relatórios e projetos acadêmicos." },
  { icon: FlaskConical, title: "Empresas com projetos de PD&I", desc: "Comprovação estruturada para incentivos fiscais e conformidade regulatória." },
  { icon: HeartHandshake, title: "Fundações e institutos", desc: "Controle financeiro e operacional de programas de fomento à pesquisa." },
  { icon: Network, title: "Redes de inovação", desc: "Visão consolidada de múltiplos projetos e organizações parceiras." },
];

const AudienceSection = () => (
  <Section className="py-[100px]">
    <div className="text-center mb-14">
      <p className="text-[13px] font-semibold text-primary tracking-wider uppercase mb-4">Para quem é</p>
      <h2 className="text-[28px] sm:text-[34px] font-bold text-foreground mb-4">Uma solução para diferentes perfis institucionais</h2>
    </div>
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {audiences.map((a) => (
        <div key={a.title} className="bg-white rounded-xl border border-border p-6 hover:shadow-md transition-shadow text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-5">
            <a.icon className="w-6 h-6 text-foreground" />
          </div>
          <h3 className="text-[15px] font-semibold text-foreground mb-2">{a.title}</h3>
          <p className="text-[13px] text-muted-foreground leading-relaxed">{a.desc}</p>
        </div>
      ))}
    </div>
  </Section>
);

/* ───────── CTA intermediário ───────── */
const MidCTASection = () => (
  <Section className="py-[60px]" bg="bg-foreground">
    <div className="text-center">
      <h2 className="text-[24px] sm:text-[28px] font-bold text-white mb-4">Quer ver a plataforma em ação?</h2>
      <p className="text-[15px] text-white/70 mb-8 max-w-[480px] mx-auto">Agende uma demonstração personalizada e descubra como o BolsaGO pode transformar a gestão de PD&I da sua instituição.</p>
      <button
        onClick={() => document.getElementById("contato")?.scrollIntoView({ behavior: "smooth" })}
        className="bg-white text-foreground text-[14px] font-medium px-8 py-3 rounded-lg hover:bg-white/90 transition-colors"
      >
        Solicitar demonstração
      </button>
    </div>
  </Section>
);

/* ───────── Desafios ───────── */
const challenges = [
  { icon: ClipboardList, title: "Dispersão de dados", desc: "Informações fragmentadas em planilhas, emails e sistemas desconectados." },
  { icon: FileSearch, title: "Dificuldade de comprovação", desc: "Ausência de trilhas auditáveis para demonstrar execução técnica e financeira." },
  { icon: BarChart3, title: "Riscos de conformidade", desc: "Exposição a questionamentos fiscais por falta de documentação estruturada." },
  { icon: Eye, title: "Falta de visibilidade", desc: "Gestores sem acesso a indicadores consolidados de progresso e resultados." },
];

const ChallengesSection = () => (
  <Section className="py-[100px]" bg="bg-muted/40">
    <p className="text-[13px] font-semibold text-primary tracking-wider uppercase mb-4">Os desafios</p>
    <h2 className="text-[34px] font-bold text-foreground leading-tight mb-3 max-w-[550px]">Por que a gestão de PD&I é tão complexa?</h2>
    <p className="text-[15px] text-muted-foreground mb-12 max-w-[550px]">Projetos de pesquisa e inovação enfrentam obstáculos que vão além da execução técnica.</p>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {challenges.map((c) => (
        <div key={c.title} className="bg-white rounded-xl border border-border p-6 hover:shadow-md transition-shadow">
          <div className="w-11 h-11 rounded-lg bg-muted flex items-center justify-center mb-5">
            <c.icon className="w-5 h-5 text-foreground" />
          </div>
          <h3 className="text-[15px] font-semibold text-foreground mb-2">{c.title}</h3>
          <p className="text-[13px] text-muted-foreground leading-relaxed">{c.desc}</p>
        </div>
      ))}
    </div>
  </Section>
);

/* ───────── Lei do Bem ───────── */
const checkItems = [
  "Rastreabilidade completa de atividades e entregas",
  "Evidências técnicas organizadas e auditáveis",
  "Conformidade com requisitos regulatórios",
  "Prestação de contas estruturada para auditores",
  "Histórico financeiro vinculado a projetos",
  "Relatórios prontos para fiscalização",
];

const LeiBemSection = () => (
  <Section className="py-[100px]">
    <div className="grid lg:grid-cols-2 gap-16 items-start">
      <div>
        <p className="text-[13px] font-semibold text-primary tracking-wider uppercase mb-4">Lei do Bem</p>
        <h2 className="text-[34px] font-bold text-foreground leading-tight mb-5">Comprovação de PD&I para incentivos fiscais.</h2>
        <p className="text-[15px] text-muted-foreground leading-relaxed mb-8">
          Empresas enquadradas na Lei do Bem precisam demonstrar, de forma clara e documentada, a execução de atividades de pesquisa e inovação. O BolsaGO foi projetado para atender essa necessidade com rigor e praticidade.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {checkItems.map((item) => (
            <div key={item} className="flex items-start gap-2">
              <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <span className="text-[13px] text-foreground leading-snug">{item}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-muted/40 rounded-xl border border-border p-8 space-y-6">
        <div className="border-b border-border pb-6">
          <p className="text-[36px] font-bold text-foreground">11.196</p>
          <p className="text-[13px] text-muted-foreground">Lei Federal que incentiva investimentos em PD&I</p>
        </div>
        <div className="border-b border-border pb-6">
          <p className="text-[36px] font-bold text-foreground">+20%</p>
          <p className="text-[13px] text-muted-foreground">de dedução adicional para empresas que comprovam inovação</p>
        </div>
        <div>
          <p className="text-[36px] font-bold text-foreground">100%</p>
          <p className="text-[13px] text-muted-foreground">rastreabilidade exigida para aproveitamento do benefício</p>
        </div>
      </div>
    </div>
  </Section>
);

/* ───────── Nossa Abordagem ───────── */
const approaches = [
  { icon: Target, title: "Método", desc: "Processos estruturados para gestão de projetos temáticos, subprojetos e entregas, com fluxos claros de aprovação e acompanhamento." },
  { icon: Shield, title: "Governança", desc: "Controles de acesso, trilhas de auditoria e políticas de conformidade que garantem a integridade das informações." },
  { icon: Users, title: "Experiência", desc: "Desenvolvido pelo ICCA a partir de anos de atuação prática na execução e gestão de projetos de PD&I." },
];

const ApproachSection = () => (
  <Section className="py-[100px]" bg="bg-muted/40">
    <div className="text-center mb-14">
      <p className="text-[13px] font-semibold text-primary tracking-wider uppercase mb-4">Nossa abordagem</p>
      <h2 className="text-[34px] font-bold text-foreground mb-4">Construído por quem faz PD&I na prática.</h2>
      <p className="text-[15px] text-muted-foreground max-w-[640px] mx-auto">
        O SisConnecta combina rigor metodológico, governança institucional e a experiência real do ICCA em projetos de pesquisa e inovação.
      </p>
    </div>
    <div className="grid md:grid-cols-3 gap-6">
      {approaches.map((a) => (
        <div key={a.title} className="bg-white rounded-xl border border-border p-8 text-center hover:shadow-md transition-shadow">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-5">
            <a.icon className="w-6 h-6 text-foreground" />
          </div>
          <h3 className="text-[16px] font-semibold text-foreground mb-3">{a.title}</h3>
          <p className="text-[13px] text-muted-foreground leading-relaxed">{a.desc}</p>
        </div>
      ))}
    </div>
  </Section>
);

/* ───────── Plataforma em ação ───────── */
const screenshots = [
  { icon: Users, title: "Portal do Bolsista", desc: "Gestão de pagamentos, relatórios mensais e acompanhamento de parcelas" },
  { icon: LayoutDashboard, title: "Visão Institucional", desc: "Organizações ativas, projetos temáticos e saúde global da plataforma" },
  { icon: BarChart3, title: "Dashboard Analytics", desc: "KPIs históricos, comparativos e indicadores de eficiência" },
  { icon: Layers, title: "Evolução e Tendências", desc: "Acompanhamento de crescimento e análises preditivas" },
];

const PlatformSection = () => (
  <Section className="py-[100px]">
    <div className="text-center mb-14">
      <p className="text-[13px] font-semibold text-primary tracking-wider uppercase mb-4">Conheça a plataforma</p>
      <h2 className="text-[34px] font-bold text-foreground mb-4">Veja o BolsaGO em ação.</h2>
      <p className="text-[15px] text-muted-foreground max-w-[600px] mx-auto">
        Interfaces intuitivas para gestores e bolsistas, com dashboards completos para tomada de decisão.
      </p>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
      {screenshots.map((s) => (
        <div key={s.title}>
          <div className="bg-muted/60 rounded-xl border border-border h-[160px] mb-4 flex items-center justify-center">
            <s.icon className="w-10 h-10 text-muted-foreground/50" />
          </div>
          <div className="flex items-center gap-2 mb-1">
            <s.icon className="w-4 h-4 text-primary" />
            <h3 className="text-[14px] font-semibold text-foreground">{s.title}</h3>
          </div>
          <p className="text-[12px] text-muted-foreground leading-relaxed">{s.desc}</p>
        </div>
      ))}
    </div>
  </Section>
);

/* ───────── A Plataforma (features) ───────── */
import screenDashboardEstrategico from "@/assets/screen-dashboard-estrategico.png";
import screenDashboardExecutivo from "@/assets/screen-dashboard-executivo.png";
import screenOperacaoBolsas from "@/assets/screen-operacao-bolsas.png";
import screenGestaoFinanceira from "@/assets/screen-gestao-financeira.png";

const features = [
  { image: screenDashboardEstrategico, title: "Dashboards", desc: "Visão consolidada de projetos, entregas e indicadores de desempenho." },
  { image: screenOperacaoBolsas, title: "Avaliação de Relatórios", desc: "Fluxos de revisão e aprovação com histórico completo." },
  { image: screenGestaoFinanceira, title: "Gestão Financeira", desc: "Acompanhamento de bolsas, pagamentos e histórico de execução." },
  { image: screenDashboardExecutivo, title: "Relatórios", desc: "Exportação de dados para prestação de contas e auditorias." },
];

const FeaturesSection = () => (
  <Section className="py-[100px]" bg="bg-muted/40">
    <div className="text-center mb-14">
      <p className="text-[13px] font-semibold text-primary tracking-wider uppercase mb-4">A plataforma</p>
      <h2 className="text-[34px] font-bold text-foreground mb-4">Tudo o que você precisa para gerir PD&I.</h2>
      <p className="text-[15px] text-muted-foreground max-w-[640px] mx-auto">
        O BolsaGO organiza projetos temáticos, subprojetos, bolsistas e entregas em uma estrutura clara e rastreável.
      </p>
    </div>
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {features.map((f) => (
        <div key={f.title} className="bg-white rounded-xl border border-border p-6 hover:shadow-md transition-shadow group">
          <div className="w-full aspect-[16/10] rounded-lg overflow-hidden mb-5 border border-border/50 bg-muted/30">
            <img src={f.image} alt={f.title} className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300" />
          </div>
          <h3 className="text-[15px] font-semibold text-foreground mb-2">{f.title}</h3>
          <p className="text-[13px] text-muted-foreground leading-relaxed">{f.desc}</p>
        </div>
      ))}
    </div>
  </Section>
);

/* ───────── Planos ───────── */
const plans = [
  {
    name: "GO Starter", icon: Star, subtitle: "Para projetos pontuais e pilotos", price: "R$ 500", period: "/mês", highlighted: false,
    items: ["Até 1 projeto temático", "Até 5 subprojetos", "Dashboards básicos", "Gestão de bolsistas", "Relatórios mensais", "Suporte padrão"],
    disabledItems: ["Avaliação de relatórios", "Liberação de pagamento"],
    cta: "Contratar",
  },
  {
    name: "GO Pro", icon: Zap, subtitle: "Para instituições em crescimento", price: "R$ 1.000", period: "/mês", highlighted: true,
    items: ["Até 3 projetos temáticos", "Até 20 subprojetos", "Dashboards avançados", "Gestão completa de bolsistas", "Avaliação de relatórios", "Liberação de pagamento", "Histórico financeiro", "Suporte prioritário"],
    disabledItems: [],
    cta: "Contratar",
  },
  {
    name: "GO Enterprise", icon: Building2, subtitle: "Para operações consolidadas", price: "R$ 2.000", period: "/mês", highlighted: false,
    items: ["Até 20 projetos temáticos", "Até 400 subprojetos", "Dashboards estratégicos", "KPIs institucionais", "Gestão financeira avançada", "Relatórios consolidados", "Suporte dedicado", "Treinamento incluído"],
    disabledItems: [],
    cta: "Contratar",
  },
  {
    name: "GO Institucional", icon: Landmark, subtitle: "Para grandes organizações e redes", price: "Sob consulta", period: "", highlighted: false,
    items: ["Projetos temáticos ilimitados", "Subprojetos ilimitados", "Dashboards personalizados", "KPIs sob medida", "Governança institucional avançada", "Integrações customizadas", "Suporte customizado 24/7", "Gerente de conta dedicado"],
    disabledItems: [],
    cta: "Fale conosco",
  },
];

const PlansSection = () => (
  <Section id="planos" className="py-[100px]">
    <div className="text-center mb-14">
      <p className="text-[13px] font-semibold text-primary tracking-wider uppercase mb-4">Planos</p>
      <h2 className="text-[34px] font-bold text-foreground mb-4">Escolha o plano ideal para sua instituição.</h2>
      <p className="text-[15px] text-muted-foreground">Todos os planos incluem atualizações e suporte técnico.</p>
    </div>
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
      {plans.map((p) => (
        <div key={p.name} className={`relative rounded-xl border p-7 flex flex-col ${p.highlighted ? "border-primary shadow-lg" : "border-border"}`}>
          {p.highlighted && (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-foreground text-white text-[11px] font-medium px-3 py-1 rounded-full">Mais escolhido</span>
          )}
          <div className="w-11 h-11 rounded-lg bg-muted flex items-center justify-center mb-4">
            <p.icon className={`w-5 h-5 ${p.highlighted ? "text-primary" : "text-foreground"}`} />
          </div>
          <h3 className="text-[17px] font-bold text-foreground">{p.name}</h3>
          <p className="text-[12px] text-muted-foreground mb-4">{p.subtitle}</p>
          <p className="mb-6">
            <span className="text-[28px] font-bold text-foreground">{p.price}</span>
            <span className="text-[13px] text-muted-foreground">{p.period}</span>
          </p>
          <div className="space-y-2.5 flex-1 mb-8">
            {p.items.map((item) => (
              <div key={item} className="flex items-start gap-2">
                <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span className="text-[13px] text-foreground">{item}</span>
              </div>
            ))}
            {p.disabledItems.map((item) => (
              <div key={item} className="flex items-start gap-2 opacity-40">
                <Check className="w-4 h-4 mt-0.5 shrink-0" />
                <span className="text-[13px] line-through">{item}</span>
              </div>
            ))}
          </div>
          <button className={`w-full py-2.5 rounded-lg text-[14px] font-medium transition-opacity hover:opacity-90 ${p.highlighted ? "bg-foreground text-white" : "border border-border text-foreground"}`}>
            {p.cta}
          </button>
        </div>
      ))}
    </div>
  </Section>
);

/* ───────── Comparativo ───────── */
type CellValue = boolean | string;
const compRows: { label: string; values: CellValue[] }[] = [
  { label: "Projetos Temáticos", values: ["Até 1", "Até 3", "Até 20", "Ilimitados"] },
  { label: "Subprojetos", values: ["Até 5", "Até 20", "Até 400", "Ilimitados"] },
  { label: "Dashboards", values: ["Básicos", "Avançados", "Estratégicos", "Personalizados"] },
  { label: "KPIs", values: [false, false, "Institucionais", "Sob medida"] },
  { label: "Avaliação de Relatórios", values: [false, true, true, true] },
  { label: "Liberação de Pagamentos", values: [false, true, true, true] },
  { label: "Relatórios Consolidados", values: [false, false, true, true] },
  { label: "Integrações", values: [false, false, false, "Customizadas"] },
  { label: "Suporte", values: ["Padrão", "Prioritário", "Dedicado", "24/7 Customizado"] },
];
const planHeaders = [
  { name: "GO Starter", price: "R$ 500/mês", highlighted: false },
  { name: "GO Pro", price: "R$ 1.000/mês", highlighted: true },
  { name: "GO Enterprise", price: "R$ 2.000/mês", highlighted: false },
  { name: "GO Institucional", price: "Sob consulta", highlighted: false },
];

const ComparisonSection = () => (
  <Section id="comparativo" className="py-[100px]">
    <div className="text-center mb-14">
      <p className="text-[13px] font-semibold text-primary tracking-wider uppercase mb-4">Comparativo</p>
      <h2 className="text-[34px] font-bold text-foreground mb-4">Compare os recursos de cada plano.</h2>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-[13px] border-collapse min-w-[700px]">
        <thead>
           <tr className="border-b border-border">
             <th className="text-left py-4 px-4 font-normal text-muted-foreground w-[260px]">Recursos</th>
             {planHeaders.map((h) => (
                <th key={h.name} className={`text-center py-4 px-4 font-semibold ${h.highlighted ? "text-primary" : "text-foreground"}`}>
                  <span className="block">{h.name}</span>
                  {h.highlighted && <span className="block text-[10px] font-medium text-primary/80 mt-0.5">Recomendado</span>}
                  <span className="block font-normal text-muted-foreground text-[11px] mt-1">{h.price}</span>
                </th>
             ))}
          </tr>
        </thead>
        <tbody>
          {compRows.map((row) => (
            <tr key={row.label} className="border-b border-border/60">
              <td className="py-3.5 px-4 font-medium text-foreground">{row.label}</td>
              {row.values.map((v, i) => (
                <td key={i} className="text-center py-3.5 px-4">
                  {typeof v === "boolean" ? (
                    v ? <Check className="w-4 h-4 text-success mx-auto" /> : <X className="w-4 h-4 text-muted-foreground/40 mx-auto" />
                  ) : (
                    <span className="font-semibold text-foreground">{v}</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </Section>
);

/* ───────── Segurança ───────── */
const securityCards = [
  { icon: ShieldCheck, title: "Rastreabilidade", desc: "Histórico completo de todas as ações e movimentações do sistema." },
  { icon: FileSearch, title: "Auditoria", desc: "Registros detalhados para auditorias internas e externas." },
  { icon: Lock, title: "Controle de Acesso", desc: "Gestão granular de permissões por perfil e função." },
  { icon: Eye, title: "Transparência", desc: "Visibilidade total para gestores e órgãos de controle." },
];

const SecuritySection = () => (
  <Section id="seguranca" className="py-[100px]" bg="bg-muted/40">
    <div className="text-center mb-14">
      <p className="text-[13px] font-semibold text-primary tracking-wider uppercase mb-4">Segurança</p>
      <h2 className="text-[34px] font-bold text-foreground mb-4">Sua instituição protegida.</h2>
      <p className="text-[15px] text-muted-foreground">Infraestrutura segura com as melhores práticas de proteção de dados.</p>
    </div>
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {securityCards.map((c) => (
        <div key={c.title} className="bg-white rounded-xl border border-border p-6 text-center hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-5">
            <c.icon className="w-5 h-5 text-foreground" />
          </div>
          <h3 className="text-[15px] font-semibold text-foreground mb-2">{c.title}</h3>
          <p className="text-[13px] text-muted-foreground leading-relaxed">{c.desc}</p>
        </div>
      ))}
    </div>
  </Section>
);

/* ───────── CTA ───────── */
const CTASection = () => (
  <section id="contato" className="bg-foreground py-[80px]">
    <div className="max-w-[1200px] mx-auto px-6 text-center">
      <h2 className="text-[26px] sm:text-[30px] font-bold text-white mb-4">Pronto para transformar a gestão de bolsas e projetos da sua instituição?</h2>
      <p className="text-[15px] text-white/70 mb-8 max-w-[560px] mx-auto">
        Com a Plataforma BolsaGO, sua organização ganha transparência, eficiência e inteligência na gestão de PD&I.
      </p>
      <div className="flex items-center justify-center gap-4 flex-wrap">
        <button
          onClick={() => document.getElementById("planos")?.scrollIntoView({ behavior: "smooth" })}
          className="bg-white text-foreground text-[14px] font-medium px-7 py-3 rounded-lg hover:opacity-90 transition-opacity"
        >
          Ver planos
        </button>
        <button className="border border-white/30 text-white text-[14px] font-medium px-7 py-3 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-2">
          <MessageCircle className="w-4 h-4" /> Solicitar demonstração
        </button>
      </div>
    </div>
  </section>
);

/* ───────── Footer ───────── */
const LandingFooter = () => (
  <footer className="bg-foreground border-t border-white/10">
    <div className="max-w-[1200px] mx-auto px-6 py-16">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
        <div>
          <p className="text-[18px] font-bold text-white mb-3">BolsaGO</p>
          <p className="text-[13px] text-white/60 leading-relaxed mb-6">
            Plataforma para gestão e comprovação de projetos de Pesquisa, Desenvolvimento e Inovação (PD&I).
          </p>
          <img src={logoInnovago} alt="InnovaGO" className="h-6 opacity-70 brightness-0 invert" />
        </div>
        <div>
          <p className="text-[14px] font-semibold text-white mb-4">Produto</p>
          <div className="space-y-2.5">
            <p className="text-[13px] text-white/60 hover:text-white/80 cursor-pointer transition-colors">Planos</p>
            <p className="text-[13px] text-white/60 hover:text-white/80 cursor-pointer transition-colors">Comparativo</p>
            <p className="text-[13px] text-white/60 hover:text-white/80 cursor-pointer transition-colors">Segurança</p>
          </div>
        </div>
        <div>
          <p className="text-[14px] font-semibold text-white mb-4">Contato</p>
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-white/60" />
              <p className="text-[13px] text-white/60">contato@innovago.app</p>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-white/60" />
              <p className="text-[13px] text-white/60">www.innovago.app</p>
            </div>
          </div>
        </div>
        <div>
          <p className="text-[14px] font-semibold text-white mb-4">Redes Sociais</p>
          <div className="space-y-2.5 mb-6">
            <div className="flex items-center gap-2">
              <Instagram className="w-3.5 h-3.5 text-white/60" />
              <p className="text-[13px] text-white/60">Instagram</p>
            </div>
            <div className="flex items-center gap-2">
              <Linkedin className="w-3.5 h-3.5 text-white/60" />
              <p className="text-[13px] text-white/60">LinkedIn</p>
            </div>
          </div>
          <p className="text-[14px] font-semibold text-white mb-3">Institucional</p>
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-3.5 h-3.5 text-white/60" />
              <p className="text-[13px] text-white/60">Perguntas Frequentes</p>
            </div>
            <p className="text-[13px] text-white/60">Política de Privacidade</p>
            <p className="text-[13px] text-white/60">LGPD</p>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 pt-6 flex items-center justify-between flex-wrap gap-4">
        <p className="text-[12px] text-white/40">© 2026 BolsaGO. Todos os direitos reservados.</p>
        <p className="text-[12px] text-white/40">Uma solução <span className="font-semibold text-white/60">InnovaGO</span></p>
      </div>
    </div>
  </footer>
);

/* ───────── Page ───────── */
const LandingPage = () => {
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <HeroSection />
      <BenefitsSection />
      <AudienceSection />
      <MidCTASection />
      <ChallengesSection />
      <LeiBemSection />
      <ApproachSection />
      <PlatformSection />
      <FeaturesSection />
      <PlansSection />
      <ComparisonSection />
      <SecuritySection />
      <CTASection />
      <LandingFooter />
      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 w-10 h-10 bg-foreground text-white rounded-full flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity z-50"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

export default LandingPage;
