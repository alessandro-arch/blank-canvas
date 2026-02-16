import { Link, Navigate } from "react-router-dom";
import { 
  GraduationCap, 
  Users, 
  ShieldCheck, 
  Mail, 
  Menu, 
  ExternalLink,
  FolderOpen,
  FileText,
  Shield,
  CheckCircle2,
  ArrowRight,
  Lock,
  Wallet,
  Building2,
  Eye,
  ClipboardCheck,
  Search,
  BarChart3
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import logoInnovaGO from "@/assets/logo-innovago.png";
import logoInnovaGOWhite from "@/assets/logo-innovago-white.png";
import { useState, useEffect } from "react";

const navLinks = [
  { label: "Sobre", href: "#sobre" },
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Pilares", href: "#pilares" },
  { label: "Segurança", href: "#seguranca" },
  { label: "Contato", href: "#contato" },
];

const timelineSteps = [
  { step: 1, title: "Projeto Temático cadastrado pela organização" },
  { step: 2, title: "Bolsista cria conta com código de convite" },
  { step: 3, title: "Gestor atribui subprojeto e modalidade de bolsa" },
  { step: 4, title: "Bolsista envia relatório mensal em PDF" },
  { step: 5, title: "Gestor avalia e libera pagamento" },
];

const pillars = [
  { icon: FolderOpen, title: "Método", description: "Processos estruturados para gestão de projetos temáticos, subprojetos e entregas, com fluxos claros de aprovação e acompanhamento." },
  { icon: Shield, title: "Governança", description: "Controles de acesso, trilhas de auditoria e políticas de conformidade que garantem a integridade das informações." },
  { icon: Users, title: "Experiência", description: "Desenvolvido a partir de anos de atuação prática na execução e gestão de projetos de PD&I." },
];

const securityItems = [
  { icon: ClipboardCheck, title: "Rastreabilidade", description: "Histórico completo de todas as ações e movimentações do sistema." },
  { icon: Search, title: "Auditoria", description: "Registros detalhados para auditorias internas e externas." },
  { icon: Lock, title: "Controle de Acesso", description: "Gestão granular de permissões por perfil e função." },
  { icon: Eye, title: "Transparência", description: "Visibilidade total para gestores e órgãos de controle." },
];

export default function Access() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading, hasManagerAccess } = useUserRole();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Redirect authenticated users to their portal
  if (!authLoading && !roleLoading && user && role) {
    if (hasManagerAccess) {
      return <Navigate to="/admin/dashboard" replace />;
    }
    if (role === "scholar") {
      return <Navigate to="/bolsista/painel" replace />;
    }
  }

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
    setIsOpen(false);
  };

  const scrollToAccess = () => {
    const element = document.querySelector("#acesso-cards");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
    setIsOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header 
        className={`sticky top-0 z-50 w-full bg-white border-b transition-shadow duration-300 ${
          isScrolled ? "shadow-sm border-border" : "border-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <span className="text-xl font-semibold text-foreground tracking-tight">InnovaGO</span>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollToSection(link.href)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </button>
              ))}
              <Button 
                size="sm" 
                onClick={scrollToAccess}
                className="bg-primary hover:bg-primary/90 text-white rounded-md px-5"
              >
                Acessar Plataforma
              </Button>
            </nav>

            {/* Mobile Menu */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" aria-label="Abrir menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetHeader className="text-left border-b border-border pb-4 mb-4">
                  <SheetTitle>InnovaGO</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-2">
                  {navLinks.map((link) => (
                    <button
                      key={link.href}
                      onClick={() => scrollToSection(link.href)}
                      className="text-left px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      {link.label}
                    </button>
                  ))}
                  <div className="pt-4 border-t border-border mt-2">
                    <Button className="w-full bg-primary hover:bg-primary/90 text-white" onClick={scrollToAccess}>
                      Acessar Plataforma
                    </Button>
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="px-4 py-20 sm:py-28">
          <div className="max-w-4xl mx-auto">
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground mb-4">
              GESTÃO DE BOLSAS EM PESQUISA E DESENVOLVIMENTO
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
              Seja bem-vindo ao Portal do Bolsista!
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mb-8">
              Aqui você registra suas atividades, acompanha progressos, organiza evidências e contribui para a qualidade e a integridade dos projetos de P,D&I.
              <br /><br />
              <span className="italic">Ciência com método. Inovação com responsabilidade.</span>
            </p>
            <p className="text-sm font-medium text-muted-foreground tracking-wide">
              Desenvolvido por quem faz P,D&I na prática.
            </p>
          </div>
        </section>

        {/* Access Cards Section */}
        <section id="acesso-cards" className="px-4 pb-20 scroll-mt-20">
          <div className="grid md:grid-cols-2 gap-6 w-full max-w-4xl mx-auto">
            {/* Scholar Portal Card */}
            <div className="bg-white rounded-xl border border-border p-8 hover:shadow-lg transition-all duration-300 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                  <GraduationCap className="h-6 w-6 text-foreground" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">Portal do Bolsista</h2>
              </div>
              <p className="text-muted-foreground mb-6 flex-1 text-sm leading-relaxed">
                Envie relatórios mensais, acompanhe o status da sua bolsa e consulte pagamentos.
              </p>
              <Button asChild size="lg" className="w-full mb-3 bg-primary hover:bg-primary/90">
                <Link to="/bolsista/login" replace>
                  Acessar Portal do Bolsista
                </Link>
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Acesso exclusivo para bolsistas vinculados a projetos ativos.
              </p>
            </div>

            {/* Admin Portal Card */}
            <div className="bg-white rounded-xl border border-border p-8 hover:shadow-lg transition-all duration-300 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                  <Users className="h-6 w-6 text-foreground" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">Portal do Administrador</h2>
              </div>
              <p className="text-muted-foreground mb-6 flex-1 text-sm leading-relaxed">
                Gerencie projetos temáticos, subprojetos, bolsistas, relatórios e liberação de pagamentos.
              </p>
              <Button asChild variant="outline" size="lg" className="w-full mb-3 border-foreground text-foreground hover:bg-foreground hover:text-white">
                <Link to="/admin/login" replace>
                  Acessar Portal do Administrador
                </Link>
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Acesso restrito a administradores e gestores da organização.
              </p>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-success" />
            <span>Acesso seguro · Autenticação protegida</span>
          </div>
        </section>

        {/* Sobre Section */}
        <section id="sobre" className="px-4 py-20 bg-[hsl(210,20%,97%)] scroll-mt-20">
          <div className="max-w-4xl mx-auto">
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground mb-3 text-center">
              SOBRE A PLATAFORMA
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6 text-center">
              Desenvolvido por quem faz P,D&I na prática.
            </h2>
            <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-4 leading-relaxed">
              O sistema BolsaGO combina rigor metodológico, governança institucional e experiência real em projetos de pesquisa e inovação.
            </p>
            <div className="mt-12">
              <div className="bg-white rounded-xl border border-border p-8">
                <p className="text-muted-foreground leading-relaxed mb-6">
                  <strong className="text-foreground">BolsaGO</strong> é uma plataforma para cadastro, acompanhamento, avaliação e liberação de pagamento de bolsas vinculadas a projetos científicos e de inovação.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  A plataforma foi desenvolvida a partir da experiência prática em execução e gestão de bolsas de projetos de Pesquisa e Inovação, oferecendo uma solução inteligente e segura.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pilares / Nossa Abordagem Section */}
        <section id="pilares" className="px-4 py-20 scroll-mt-20">
          <div className="max-w-5xl mx-auto">
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground mb-3 text-center">
              NOSSA ABORDAGEM
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 text-center">
              Pilares do BolsaGO.
            </h2>
            <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-12 leading-relaxed">
              Cadastro, acompanhamento, avaliação e controle financeiro de bolsas com transparência e conformidade.
            </p>
            <div className="grid sm:grid-cols-3 gap-6">
              {pillars.map((pillar, index) => (
                <div 
                  key={index}
                  className="bg-white rounded-xl border border-border p-8 text-center hover:shadow-md transition-shadow"
                >
                  <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center mx-auto mb-5">
                    <pillar.icon className="h-6 w-6 text-foreground" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2 text-lg">{pillar.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{pillar.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Como Funciona Section */}
        <section id="como-funciona" className="px-4 py-20 bg-[hsl(210,20%,97%)] scroll-mt-20">
          <div className="max-w-4xl mx-auto">
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground mb-3 text-center">
              PASSO A PASSO
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-12 text-center">
              Como funciona.
            </h2>
            <div className="relative">
              <div className="absolute left-4 sm:left-1/2 top-0 bottom-0 w-0.5 bg-border sm:-translate-x-0.5" />
              <div className="space-y-8">
                {timelineSteps.map((item, index) => (
                  <div 
                    key={item.step}
                    className={`relative flex items-center gap-4 sm:gap-8 ${
                      index % 2 === 0 ? "sm:flex-row" : "sm:flex-row-reverse"
                    }`}
                  >
                    <div className="absolute left-4 sm:left-1/2 w-8 h-8 -translate-x-1/2 rounded-full bg-foreground text-white flex items-center justify-center font-bold text-sm z-10">
                      {item.step}
                    </div>
                    <div className={`ml-16 sm:ml-0 sm:w-[calc(50%-2rem)] ${
                      index % 2 === 0 ? "sm:pr-8 sm:text-right" : "sm:pl-8"
                    }`}>
                      <div className="bg-white rounded-lg border border-border p-4">
                        <p className="text-foreground font-medium text-sm">{item.title}</p>
                      </div>
                    </div>
                    <div className="hidden sm:block sm:w-[calc(50%-2rem)]" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Segurança Section */}
        <section id="seguranca" className="px-4 py-20 scroll-mt-20">
          <div className="max-w-5xl mx-auto">
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground mb-3 text-center">
              SEGURANÇA
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 text-center">
              Infraestrutura segura.
            </h2>
            <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-12 leading-relaxed">
              Infraestrutura segura com as melhores práticas de proteção de dados.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {securityItems.map((item, index) => (
                <div 
                  key={index}
                  className="bg-white rounded-xl border border-border p-6 text-center hover:shadow-md transition-shadow"
                >
                  <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
                    <item.icon className="h-6 w-6 text-foreground" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section id="contato" className="px-4 py-20 bg-[hsl(210,20%,97%)] scroll-mt-20">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Pronto para transformar a gestão de projetos com bolsas da sua instituição?
            </h2>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Converse com nossos especialistas e descubra como o sistema BolsaGO pode apoiar sua instituição.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                size="lg" 
                onClick={scrollToAccess} 
                className="bg-primary hover:bg-primary/90 text-white rounded-md px-8 inline-flex items-center gap-2"
              >
                Acessar Plataforma
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-md px-8">
                <a href="mailto:contato@innovago.app" className="inline-flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Fale Conosco
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full bg-[hsl(220,20%,14%)] text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">
            {/* Col 1 - Brand */}
            <div>
              <span className="text-white font-semibold text-lg block mb-3">InnovaGO</span>
              <p className="text-sm text-gray-400 leading-relaxed mb-5">
                Plataforma para gestão e comprovação de projetos de Pesquisa, Desenvolvimento e Inovação (PD&I).
              </p>
              
            </div>

            {/* Col 2 - Acesso */}
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm">Acesso</h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <Link to="/bolsista/login" className="hover:text-white transition-colors">
                    Portal do Bolsista
                  </Link>
                </li>
                <li>
                  <Link to="/admin/login" className="hover:text-white transition-colors">
                    Portal do Administrador
                  </Link>
                </li>
                <li>
                  <Link to="/recuperar-senha" className="hover:text-white transition-colors">
                    Esqueci minha senha
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3 - Contato */}
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm">Contato</h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <a href="mailto:contato@innovago.app" className="hover:text-white transition-colors inline-flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5" />
                    contato@innovago.app
                  </a>
                </li>
                <li>
                  <a href="https://www.innovago.app/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors inline-flex items-center gap-2">
                    <ExternalLink className="h-3.5 w-3.5" />
                    www.innovago.app
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 4 - Redes Sociais */}
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm">Redes Sociais</h4>
              <ul className="space-y-2.5 text-sm mb-6">
                <li>
                  <a href="https://www.instagram.com/innovago" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors inline-flex items-center gap-2">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                    Instagram
                  </a>
                </li>
                <li>
                  <a href="https://www.linkedin.com/company/innovago" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors inline-flex items-center gap-2">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                    LinkedIn
                  </a>
                </li>
              </ul>

              <h4 className="text-white font-semibold mb-3 text-sm">Institucional</h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <a href="https://www.innovago.app/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                    Site InnovaGO
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Divider + Copyright */}
          <div className="border-t border-white/10 pt-6 text-center text-sm text-gray-500">
            © InnovaGO – Sistema de Gestão de Bolsas em Pesquisa e Desenvolvimento (
            <a href="https://www.innovago.app" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300 transition-colors">
              www.innovago.app
            </a>
            )
          </div>
        </div>
      </footer>
    </div>
  );
}
