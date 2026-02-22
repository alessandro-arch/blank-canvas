import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import {
  ArrowLeft,
  BookOpen,
  LayoutDashboard,
  Users,
  Receipt,
  FolderOpen,
  BarChart3,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Shield,
  FileText,
  Bot,
  Eye,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

/* ─── Reusable sub-components ─── */

interface ManualSectionProps {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function ManualSection({ id, icon: Icon, title, children, defaultOpen = false }: ManualSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div id={id} className="scroll-mt-24">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors text-left group">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 text-yellow-600" />
            </div>
            <span className="flex-1 font-semibold text-foreground">{title}</span>
            <ChevronDown
              className={cn(
                "w-5 h-5 text-muted-foreground transition-transform duration-200",
                open && "rotate-180"
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-3 ml-[52px] space-y-3 text-sm text-muted-foreground leading-relaxed">
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function StepList({ steps }: { steps: string[] }) {
  return (
    <ol className="list-none space-y-2 pl-0">
      {steps.map((step, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-500/10 text-yellow-700 text-xs font-bold flex items-center justify-center mt-0.5">
            {i + 1}
          </span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20 text-sm">
      <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1.5 flex-shrink-0" />
      <span className="text-foreground">{children}</span>
    </div>
  );
}

function OpenScreenLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1.5 text-yellow-700 hover:text-yellow-800 font-medium text-sm underline underline-offset-2">
      <ExternalLink className="w-3.5 h-3.5" />
      {label}
    </Link>
  );
}

/* ─── Table of contents ─── */

const tocItems = [
  { id: "painel", label: "1. Painel do Auditor" },
  { id: "operacao", label: "2. Operação de Bolsas" },
  { id: "pagamentos", label: "3. Gestão de Pagamentos" },
  { id: "projetos", label: "4. Projetos Temáticos" },
  { id: "financeiro", label: "5. Gestão Financeira" },
  { id: "faq", label: "6. FAQ Rápido" },
];

/* ─── Main page ─── */

const AuditorHelp = () => {
  const isMobile = useIsMobile();
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header />

        <main className="flex-1 p-6 overflow-auto">
          {/* Back */}
          <div className="flex items-center gap-4 mb-6">
            <Link to="/auditor/dashboard">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Voltar ao Painel do Auditor
              </Button>
            </Link>
          </div>

          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-14 h-14 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <BookOpen className="w-7 h-7 text-yellow-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-foreground">Ajuda do Auditor</h1>
                <Badge className="bg-yellow-500 text-white hover:bg-yellow-500">Somente Leitura</Badge>
              </div>
              <p className="text-muted-foreground">Guia de uso do Painel do Auditor</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-4 max-w-2xl">
            Este manual reúne instruções passo a passo para utilizar todas as funcionalidades disponíveis no Painel do Auditor. Consulte a seção desejada clicando nos títulos abaixo.
          </p>

          {/* Scope & Privacy */}
          <div className="flex items-start gap-3 p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/5 mb-6 max-w-2xl">
            <Shield className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm space-y-1">
              <p className="font-semibold text-foreground">Escopo e Privacidade</p>
              <p className="text-muted-foreground">
                O Painel do Auditor oferece <strong className="text-foreground">acesso exclusivamente de leitura</strong>, restrito à organização e ao projeto temático/contrato auditado. Dados bancários e informações pessoais sensíveis dos bolsistas <strong className="text-foreground">não são exibidos</strong>. Exportações em CSV e exportações massivas não estão disponíveis para o perfil Auditor.
              </p>
            </div>
          </div>

          {/* Layout: sidebar TOC (desktop) + content */}
          <div className="flex gap-8 max-w-5xl">
            {/* TOC — desktop only */}
            {!isMobile && (
              <nav className="w-56 flex-shrink-0 hidden lg:block">
                <div className="sticky top-24 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Índice</p>
                  {tocItems.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className="block px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                    >
                      {item.label}
                    </a>
                  ))}
                </div>
              </nav>
            )}

            {/* Content */}
            <div className="flex-1 space-y-3 min-w-0">

              {/* ──────────────────────────────────────────── */}
              {/* 1. O que é o Painel do Auditor */}
              {/* ──────────────────────────────────────────── */}
              <ManualSection id="painel" icon={LayoutDashboard} title="1. O que é o Painel do Auditor" defaultOpen>
                <p>
                  O Painel do Auditor é o ponto central de <strong className="text-foreground">transparência e rastreabilidade</strong> do uso dos recursos vinculados ao contrato auditado. Ele foi projetado para que empresas parceiras e financiadoras possam acompanhar, de forma independente, a execução das bolsas.
                </p>

                <div className="mt-2 space-y-2">
                  <p className="font-medium text-foreground">O que você consegue verificar:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Execução de bolsas — relatórios mensais, status e histórico de cada bolsista.</li>
                    <li>Pagamentos realizados e respectivos comprovantes.</li>
                    <li>Documentos do contrato e planos de trabalho.</li>
                    <li>Indicadores consolidados de gestão financeira e execução.</li>
                  </ul>
                </div>

                <div className="mt-2 space-y-2">
                  <p className="font-medium text-foreground">O que o Auditor não faz:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Não cadastra nem altera dados de bolsistas ou projetos.</li>
                    <li>Não aprova nem devolve relatórios.</li>
                    <li>Não cria, edita ou cancela pagamentos.</li>
                  </ul>
                </div>

                <div className="mt-3 space-y-2">
                  <p className="font-medium text-foreground">Como acessar</p>
                  <StepList steps={[
                    "No menu lateral, clique em \"Painel do Auditor\".",
                    "O painel exibe um resumo consolidado do contrato auditado, com atalhos para relatórios, pagamentos, projetos e gestão financeira.",
                  ]} />
                </div>

                <div className="mt-3 space-y-2">
                  <p className="font-medium text-foreground">O que observar</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Status do projeto temático/contrato (ativo, encerrado).</li>
                    <li>Visão geral de bolsistas e relatórios pendentes.</li>
                    <li>Resumo de pagamentos e evidências disponíveis.</li>
                  </ul>
                </div>

                <div className="mt-2">
                  <OpenScreenLink to="/auditor/dashboard" label="Abrir Painel do Auditor" />
                </div>
              </ManualSection>

              {/* ──────────────────────────────────────────── */}
              {/* 2. Operação de Bolsas */}
              {/* ──────────────────────────────────────────── */}
              <ManualSection id="operacao" icon={Users} title="2. Operação de Bolsas">
                <p>
                  O módulo de Operação de Bolsas permite acompanhar os <strong className="text-foreground">relatórios mensais</strong> dos bolsistas, os <strong className="text-foreground">pareceres gerados por Inteligência Artificial</strong> e as pendências de prestação de contas. O Auditor utiliza este módulo para verificar conformidade, periodicidade e consistência documental.
                </p>

                {/* 2.1 Relatórios Mensais */}
                <div className="mt-4 space-y-2">
                  <p className="font-medium text-foreground text-base">2.1 Como acessar relatórios mensais</p>
                  <StepList steps={[
                    "No menu lateral, clique em \"Operação de Bolsas\".",
                    "Acesse a seção de Relatórios Mensais.",
                    "Use filtros (mês, status, bolsista, projeto) para localizar relatórios específicos.",
                    "Clique no relatório desejado para abrir os detalhes.",
                  ]} />

                  <div className="mt-2 space-y-1">
                    <p className="font-medium text-foreground">Ações disponíveis ao Auditor:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Visualizar o conteúdo completo do relatório.</li>
                      <li>Visualizar ou baixar o PDF do relatório (quando disponível).</li>
                      <li>Ver anexos de evidência, se houver.</li>
                      <li>Consultar o histórico do relatório por mês.</li>
                    </ul>
                  </div>

                  <div className="mt-2 space-y-1">
                    <p className="font-medium text-foreground">Status comuns dos relatórios:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><strong className="text-foreground">Pendente:</strong> Relatório ainda não analisado pelo gestor.</li>
                      <li><strong className="text-foreground">Aprovado:</strong> Relatório validado e aceito pelo gestor interno.</li>
                      <li><strong className="text-foreground">Devolvido:</strong> Relatório retornou para ajustes do bolsista.</li>
                      <li><strong className="text-foreground">Liberado para pagamento:</strong> Relatório aprovado e liberado no fluxo de pagamentos.</li>
                    </ul>
                  </div>
                </div>

                {/* 2.1.1 Parecer da IA */}
                <div className="mt-4 space-y-2">
                  <p className="font-medium text-foreground text-base">2.1.1 Como ver o parecer da IA sobre o relatório</p>
                  <StepList steps={[
                    "Dentro do relatório, localize o bloco \"Sugestões da IA\" ou \"Parecer da IA\".",
                    "Selecione a opção desejada: Resumo executivo, Análise de riscos, Indicadores ou Rascunho de parecer.",
                    "Caso exista o botão \"Inserir no parecer\", ele é exclusivo para gestores internos — para Auditores o conteúdo é apenas leitura.",
                  ]} />
                  <Tip>
                    <strong>Boa prática de auditoria:</strong> Compare a avaliação da IA com as evidências anexadas e com o plano de trabalho do bolsista. Procure consistência entre atividades relatadas, entregas e cronograma.
                  </Tip>
                </div>

                {/* 2.1.2 Pendências */}
                <div className="mt-4 space-y-2">
                  <p className="font-medium text-foreground text-base">2.1.2 Como identificar bolsistas com relatórios pendentes</p>
                  <StepList steps={[
                    "Em \"Operação de Bolsas\", use o filtro de status \"Pendente\".",
                    "Ordene por mês ou data de envio para priorizar atrasos.",
                    "Verifique quem está pendente, há quantos dias, e se existe justificativa no texto do relatório.",
                  ]} />
                  <Tip>
                    <strong>Nota:</strong> O Auditor acompanha e registra. A comunicação formal com o bolsista é conduzida pelo gestor interno, conforme regras do programa.
                  </Tip>
                </div>

                <div className="mt-2">
                  <OpenScreenLink to="/auditor/operacao" label="Abrir Operação de Bolsas" />
                </div>
              </ManualSection>

              {/* ──────────────────────────────────────────── */}
              {/* 3. Gestão de Pagamentos */}
              {/* ──────────────────────────────────────────── */}
              <ManualSection id="pagamentos" icon={Receipt} title="3. Gestão de Pagamentos">
                <p>
                  O módulo de Pagamentos permite auditar a <strong className="text-foreground">execução financeira das bolsas</strong>, com registros de pagamento e comprovantes. O Auditor pode verificar o que foi pago e quando, com evidência documental, sem exposição de dados bancários.
                </p>

                {/* 3.1 Registros */}
                <div className="mt-4 space-y-2">
                  <p className="font-medium text-foreground text-base">3.1 Como ver bolsistas e registros de pagamento</p>
                  <StepList steps={[
                    "No menu lateral, clique em \"Pagamentos\".",
                    "Use filtros (período, status, bolsista, subprojeto) para localizar o registro.",
                    "A lista exibe: nome do bolsista, mês de referência, status do pagamento, data e valor.",
                    "Clique em um item para ver os detalhes completos do pagamento.",
                  ]} />

                  <div className="mt-2 space-y-1">
                    <p className="font-medium text-foreground">Status de pagamento:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><strong className="text-foreground">Pago:</strong> Depósito realizado.</li>
                      <li><strong className="text-foreground">Programado:</strong> Pagamento agendado para processamento.</li>
                      <li><strong className="text-foreground">Pendente:</strong> Aguardando pré-requisitos (relatório, validação).</li>
                      <li><strong className="text-foreground">Bloqueado:</strong> Pagamento impedido por pendência documental ou cadastral.</li>
                    </ul>
                  </div>
                </div>

                {/* 3.2 Comprovantes */}
                <div className="mt-4 space-y-2">
                  <p className="font-medium text-foreground text-base">3.2 Como ver comprovantes e data do pagamento</p>
                  <StepList steps={[
                    "No detalhe do pagamento, localize a seção \"Comprovantes\" ou \"Documentos do pagamento\".",
                    "Clique em \"Visualizar\" ou \"Baixar\" (PDF ou imagem).",
                    "Confira: data do pagamento, valor e referência (mês, bolsista, contrato).",
                  ]} />
                  <Tip>
                    <strong>Importante:</strong> Dados bancários do bolsista não são exibidos ao Auditor. Se o comprovante estiver ausente, registre a pendência no relatório de auditoria interno do parceiro.
                  </Tip>
                </div>

                <div className="mt-2">
                  <OpenScreenLink to="/auditor/pagamentos" label="Abrir Pagamentos" />
                </div>
              </ManualSection>

              {/* ──────────────────────────────────────────── */}
              {/* 4. Projetos Temáticos */}
              {/* ──────────────────────────────────────────── */}
              <ManualSection id="projetos" icon={FolderOpen} title="4. Projetos Temáticos">
                <p>
                  "Projetos Temáticos" representa o <strong className="text-foreground">contrato auditado</strong> (financiador) e o agrupamento de subprojetos e bolsas vinculados. Aqui o Auditor encontra a documentação do contrato, o plano de trabalho e o conjunto de subprojetos.
                </p>

                {/* 4.1 Detalhes */}
                <div className="mt-4 space-y-2">
                  <p className="font-medium text-foreground text-base">4.1 Como acessar e ver detalhes do Projeto Temático</p>
                  <StepList steps={[
                    "No menu lateral, clique em \"Projetos Temáticos\".",
                    "Localize o projeto temático (contrato) e clique em \"Abrir\".",
                    "Na tela de detalhes, observe: cabeçalho do contrato (título, financiador, vigência, status), resumo financeiro de bolsas, documentos do projeto, subprojetos e bolsistas vinculados.",
                  ]} />
                </div>

                {/* 4.2 Resumo Financeiro */}
                <div className="mt-4 space-y-2">
                  <p className="font-medium text-foreground text-base">4.2 Resumo Financeiro de Bolsas</p>
                  <p>Área que consolida valores e indicadores de bolsas dentro do contrato. O Auditor pode verificar:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Valor mensal de bolsas.</li>
                    <li>Valor estimado vs atribuído (se existir).</li>
                    <li>Evolução temporal (se disponível).</li>
                  </ul>
                  <Tip>
                    <strong>Nota:</strong> Esta é uma visão de conformidade — não é possível editar valores.
                  </Tip>
                </div>

                {/* 4.3 Contrato */}
                <div className="mt-4 space-y-2">
                  <p className="font-medium text-foreground text-base">4.3 Ver contrato com o financiador</p>
                  <StepList steps={[
                    "Em \"Documentos do Projeto\", localize \"Contrato do Projeto\".",
                    "Clique em \"Visualizar\" para abrir no navegador.",
                    "Clique em \"Baixar\" para guardar uma cópia (quando permitido).",
                    "Confira datas, obrigações e anexos.",
                  ]} />
                </div>

                {/* 4.4 Plano de trabalho */}
                <div className="mt-4 space-y-2">
                  <p className="font-medium text-foreground text-base">4.4 Ver plano de trabalho do contrato</p>
                  <StepList steps={[
                    "Ainda em \"Documentos do Projeto\", localize \"Plano de Trabalho\" (PDF).",
                    "Visualize e baixe o documento.",
                  ]} />
                  <Tip>
                    <strong>Uso na auditoria:</strong> Confira objetivos e cronograma do plano de trabalho e compare com relatórios mensais e entregas observadas.
                  </Tip>
                </div>

                {/* 4.5 Subprojetos */}
                <div className="mt-4 space-y-2">
                  <p className="font-medium text-foreground text-base">4.5 Ver todos os subprojetos dos bolsistas</p>
                  <p>Cada subprojeto é o recorte de execução do bolsista dentro do contrato, podendo ter plano de trabalho próprio.</p>
                  <StepList steps={[
                    "Na tela do Projeto Temático, localize a seção \"Subprojetos\" (lista ou tabela).",
                    "Abra um subprojeto para ver: bolsista vinculado, objetivos e cronograma, documentos anexos e relatórios mensais vinculados.",
                  ]} />
                </div>

                {/* 4.6 Exportar PDF */}
                <div className="mt-4 space-y-2">
                  <p className="font-medium text-foreground text-base">4.6 Exportar relatórios e resumos executivos (PDF)</p>
                  <p>O Auditor pode exportar PDFs de relatórios e documentos autorizados. Exportações em CSV e exportações massivas não estão disponíveis.</p>
                  <StepList steps={[
                    "Dentro do Projeto Temático ou na seção de Relatórios, clique em \"Relatório PDF\" ou \"Exportar PDF\".",
                    "Se existir a opção \"Resumo executivo (PDF)\", selecione e exporte.",
                    "Confirme a geração e baixe o arquivo.",
                  ]} />
                </div>

                <div className="mt-2">
                  <OpenScreenLink to="/auditor/projetos-tematicos" label="Abrir Projetos Temáticos" />
                </div>
              </ManualSection>

              {/* ──────────────────────────────────────────── */}
              {/* 5. Gestão Financeira */}
              {/* ──────────────────────────────────────────── */}
              <ManualSection id="financeiro" icon={BarChart3} title="5. Gestão Financeira (Indicadores Consolidados)">
                <p>
                  Painel consolidado de <strong className="text-foreground">orçamento, execução e indicadores operacionais</strong> vinculados ao projeto temático/contrato. A finalidade é dar transparência para auditoria e prestação de contas.
                </p>

                <div className="mt-2 space-y-2">
                  <p className="font-medium text-foreground">Conteúdo disponível:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Orçamento planejado vs executado (por rubrica, quando existir).</li>
                    <li>Execução mensal acumulada.</li>
                    <li>Força de trabalho — quantidade de bolsistas, bolsas ativas, variação.</li>
                    <li>Lista de bolsistas e seus status.</li>
                    <li>Relatórios pendentes e aprovados.</li>
                    <li>Pagamentos realizados no período.</li>
                    <li>Documentos relevantes (contrato, planos de trabalho).</li>
                  </ul>
                </div>

                <div className="mt-3 space-y-2">
                  <p className="font-medium text-foreground">Como acessar</p>
                  <StepList steps={[
                    "No menu lateral, clique em \"Gestão Financeira\".",
                    "Se houver filtros por projeto temático, selecione o contrato auditado.",
                    "Interprete os cards e tabelas usando período e status como referência.",
                  ]} />
                </div>

                <div className="mt-3">
                  <Tip>
                    <strong>Boas práticas de auditoria:</strong> Confira consistência entre o plano de trabalho do contrato, o plano de trabalho do bolsista, os relatórios mensais e os pagamentos com comprovantes. Registre inconformidades como pendências internas do parceiro.
                  </Tip>
                </div>

                <div className="mt-2">
                  <OpenScreenLink to="/auditor/gestao-financeira" label="Abrir Gestão Financeira" />
                </div>
              </ManualSection>

              {/* ──────────────────────────────────────────── */}
              {/* 6. FAQ */}
              {/* ──────────────────────────────────────────── */}
              <ManualSection id="faq" icon={HelpCircle} title="6. FAQ Rápido">
                <div className="space-y-4">
                  <div>
                    <p className="font-medium text-foreground">Por que não vejo dados bancários dos bolsistas?</p>
                    <p>Para proteger informações pessoais sensíveis, dados bancários são restritos exclusivamente ao gestor interno e ao próprio bolsista. O Auditor acessa apenas as evidências de pagamento (comprovantes).</p>
                  </div>

                  <div>
                    <p className="font-medium text-foreground">Por que alguns relatórios não têm anexos?</p>
                    <p>Nem todos os relatórios exigem anexos obrigatórios. A presença de anexos depende das regras definidas pelo gestor para cada período ou modalidade de bolsa.</p>
                  </div>

                  <div>
                    <p className="font-medium text-foreground">O que significa "Pendente" vs "Aprovado"?</p>
                    <p><strong className="text-foreground">Pendente</strong> indica que o relatório foi enviado pelo bolsista mas ainda não foi avaliado pelo gestor. <strong className="text-foreground">Aprovado</strong> significa que o gestor validou e aceitou o relatório.</p>
                  </div>

                  <div>
                    <p className="font-medium text-foreground">Como verifico se um pagamento foi realizado?</p>
                    <p>Acesse a seção de Pagamentos, localize o registro do bolsista e mês desejado e verifique se o status é "Pago". Se disponível, o comprovante estará anexado ao registro.</p>
                  </div>

                  <div>
                    <p className="font-medium text-foreground">Por que não consigo exportar CSV?</p>
                    <p>Exportações em CSV e exportações massivas não estão disponíveis para o perfil Auditor. Utilize a exportação em PDF para relatórios individuais e resumos executivos.</p>
                  </div>

                  <div>
                    <p className="font-medium text-foreground">Posso aprovar ou devolver um relatório?</p>
                    <p>Não. O perfil Auditor é exclusivamente de leitura. A aprovação, devolução e comunicação formal com bolsistas são funções do gestor interno do programa.</p>
                  </div>
                </div>
              </ManualSection>

            </div>
          </div>
        </main>

        <Footer />
      </div>

      {/* Back to top */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 w-10 h-10 rounded-full bg-yellow-500 text-white shadow-lg flex items-center justify-center hover:bg-yellow-600 transition-colors z-50"
          aria-label="Voltar ao topo"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

export default AuditorHelp;
