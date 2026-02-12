import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ArrowLeft, BookOpen, UserCircle, Building2, FileText, Banknote, ShieldCheck, Bell, HelpCircle, ChevronDown, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ManualSectionProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function ManualSection({ icon: Icon, title, children, defaultOpen = false }: ManualSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors text-left group">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <span className="flex-1 font-semibold text-foreground">{title}</span>
          <ChevronDown className={cn(
            "w-5 h-5 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-4 pt-3 ml-[52px] space-y-3 text-sm text-muted-foreground leading-relaxed">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function StepList({ steps }: { steps: string[] }) {
  return (
    <ol className="list-none space-y-2 pl-0">
      {steps.map((step, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
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
    <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/5 border border-warning/20 text-sm">
      <span className="w-1.5 h-1.5 rounded-full bg-warning mt-1.5 flex-shrink-0" />
      <span className="text-foreground">{children}</span>
    </div>
  );
}

const ScholarManual = () => {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header />

        <main className="flex-1 p-6 overflow-auto">
          {/* Back */}
          <div className="flex items-center gap-4 mb-6">
            <Link to="/bolsista/painel">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Voltar ao Painel
              </Button>
            </Link>
          </div>

          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Manual do Bolsista</h1>
              <p className="text-muted-foreground">Guia completo de uso do Portal do Bolsista</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
            Este manual reúne instruções passo a passo para utilizar todas as funcionalidades do portal.
            Consulte a seção desejada clicando nos títulos abaixo.
          </p>

          {/* Sections */}
          <div className="max-w-2xl space-y-3">
            {/* 1. Primeiro Acesso */}
            <ManualSection icon={ShieldCheck} title="1. Primeiro Acesso e Cadastro" defaultOpen>
              <p>Para se cadastrar no sistema, você precisará de um <strong className="text-foreground">código de convite</strong> fornecido pelo seu gestor.</p>
              <StepList steps={[
                "Acesse a página de login do bolsista e clique em \"Criar conta\".",
                "Informe o código de convite recebido por e-mail.",
                "Preencha seus dados: nome completo, e-mail e senha.",
                "Confirme seu e-mail clicando no link enviado para a sua caixa de entrada.",
                "Após confirmar, faça login com seu e-mail e senha.",
              ]} />
              <Tip>
                <strong>Dica:</strong> Verifique a pasta de spam caso não encontre o e-mail de confirmação.
              </Tip>
            </ManualSection>

            {/* 2. Foto de Perfil */}
            <ManualSection icon={Camera} title="2. Alterar Foto de Perfil">
              <p>Personalize seu perfil adicionando uma foto que será exibida no cabeçalho do sistema.</p>
              <StepList steps={[
                "No canto superior direito, clique no ícone com suas iniciais ou na sua foto atual.",
                "No menu que abrir, clique na área da foto/iniciais para abrir o seletor de arquivo.",
                "Selecione uma imagem do seu computador (formatos JPG ou PNG, máximo 2 MB).",
                "A foto será enviada automaticamente e aparecerá no cabeçalho em poucos segundos.",
              ]} />
              <Tip>
                <strong>Dica:</strong> Use uma foto com rosto visível e boa iluminação para facilitar a identificação. Caso queira remover a foto, o sistema voltará a exibir suas iniciais.
              </Tip>
            </ManualSection>

            {/* 3. Dados Pessoais */}
            <ManualSection icon={UserCircle} title="3. Atualizar Dados Pessoais">
              <p>Mantenha seus dados pessoais sempre atualizados para garantir a comunicação e o vínculo institucional correto.</p>
              <StepList steps={[
                "No menu lateral, clique em \"Meu Perfil\".",
                "Na aba \"Dados Pessoais\", edite os campos desejados: telefone, instituição, nível acadêmico e link do Lattes.",
                "O campo CPF só pode ser preenchido uma vez — após o primeiro salvamento, ele ficará bloqueado.",
                "Clique em \"Salvar\" para confirmar as alterações.",
              ]} />
              <Tip>
                <strong>Importante:</strong> O CPF é utilizado como identificador único e não poderá ser alterado após o cadastro.
                Caso haja erro, solicite correção ao gestor.
              </Tip>
            </ManualSection>

            {/* 4. Dados Bancários */}
            <ManualSection icon={Building2} title="4. Cadastrar / Atualizar Dados Bancários">
              <p>Os dados bancários são necessários para o recebimento das parcelas de bolsa. Sem eles, o pagamento não poderá ser processado.</p>
              <StepList steps={[
                "Acesse \"Meu Perfil\" no menu lateral.",
                "Vá até a aba \"Dados Bancários\".",
                "Preencha: código do banco, nome do banco, agência, número da conta, tipo da conta e chave PIX.",
                "Clique em \"Salvar Dados Bancários\".",
                "Seus dados serão enviados para validação pelo gestor. Enquanto estiverem \"Em Análise\" ou \"Validados\", não será possível editá-los.",
              ]} />
              <Tip>
                <strong>Atenção:</strong> Se o gestor devolver seus dados bancários com uma observação, a edição será reaberta para você corrigir as informações solicitadas.
              </Tip>
            </ManualSection>

            {/* 5. Enviar Relatório */}
            <ManualSection icon={FileText} title="5. Enviar Relatório Mensal">
              <p>O envio do relatório mensal é <strong className="text-foreground">obrigatório</strong> para a liberação do pagamento da parcela correspondente.</p>
              <StepList steps={[
                "No menu lateral, clique em \"Meus Pagamentos\".",
                "Localize a parcela do mês correspondente no Histórico de Parcelas.",
                "Clique no botão \"Enviar Relatório\" da parcela desejada.",
                "Selecione o arquivo PDF do relatório (máximo 5 MB).",
                "Confirme o envio. O status mudará para \"Em Análise\".",
                "Aguarde a avaliação do gestor. Se aprovado, o pagamento será liberado automaticamente.",
              ]} />
              <Tip>
                <strong>Prazo:</strong> Envie seu relatório até o <strong>dia 25 de cada mês</strong> para evitar atrasos no pagamento no mês posterior. O pagamento é realizado até o 5º dia útil do mês seguinte.
              </Tip>
              <div className="mt-2 space-y-2">
                <p className="font-medium text-foreground">E se o relatório for recusado?</p>
                <p>Se o gestor recusar seu relatório, você receberá uma notificação com o motivo da recusa e terá <strong className="text-foreground">5 dias</strong> para enviar uma nova versão corrigida.</p>
              </div>
            </ManualSection>

            {/* 6. Pagamentos */}
            <ManualSection icon={Banknote} title="6. Acompanhar Pagamentos">
              <p>Acompanhe o status de todas as suas parcelas em tempo real.</p>
              <StepList steps={[
                "Acesse \"Meus Pagamentos\" no menu lateral.",
                "Visualize o resumo com o total previsto, total recebido e parcelas pendentes.",
                "No histórico, cada parcela mostra o status atual: Pendente, Em Análise, Liberado ou Pago.",
              ]} />
              <div className="mt-2 space-y-1">
                <p className="font-medium text-foreground">Legenda de status:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong className="text-foreground">Pendente:</strong> Relatório ainda não enviado.</li>
                  <li><strong className="text-foreground">Em Análise:</strong> Relatório enviado, aguardando avaliação do gestor.</li>
                  <li><strong className="text-foreground">Liberado:</strong> Relatório aprovado, pagamento autorizado.</li>
                  <li><strong className="text-foreground">Pago:</strong> Depósito realizado na sua conta.</li>
                </ul>
              </div>
            </ManualSection>

            {/* 7. Termo de Outorga */}
            <ManualSection icon={ShieldCheck} title="7. Termo de Outorga (Contrato)">
              <p>O Termo de Outorga é o <strong className="text-foreground">contrato oficial</strong> que formaliza o vínculo entre você e o programa de bolsas. Ele contém as condições, direitos e deveres relacionados à sua bolsa.</p>
              <StepList steps={[
                "Acesse \"Meu Perfil\" no menu lateral.",
                "Role até a seção \"Termo de Outorga (Contrato)\".",
                "Clique em \"Visualizar\" para abrir o documento em uma nova aba.",
                "Clique em \"Baixar\" para salvar uma cópia no seu computador.",
              ]} />
              <Tip>
                <strong>Importante:</strong> O termo é carregado pela gestão do programa após a assinatura. Enquanto não estiver disponível, a seção exibirá uma mensagem informando que o documento ainda não foi carregado. Guarde sempre uma cópia para seus registros pessoais.
              </Tip>
              <div className="mt-2 space-y-2">
                <p className="font-medium text-foreground">O que contém o Termo de Outorga?</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Dados do bolsista e do projeto vinculado</li>
                  <li>Modalidade e valor da bolsa</li>
                  <li>Período de vigência</li>
                  <li>Obrigações e responsabilidades</li>
                  <li>Condições para suspensão ou cancelamento</li>
                </ul>
              </div>
            </ManualSection>

            {/* 8. Documentos */}
            <ManualSection icon={FileText} title="8. Documentos Institucionais">
              <p>A seção de documentos disponibiliza manuais, templates e termos necessários para o andamento do programa.</p>
              <StepList steps={[
                "Acesse \"Documentos\" no menu lateral.",
                "Navegue pelas categorias para encontrar o documento desejado.",
                "Clique no documento para fazer o download.",
              ]} />
              <Tip>
                <strong>Importante:</strong> Utilize sempre as versões mais recentes dos documentos disponibilizados.
              </Tip>
            </ManualSection>

            {/* 9. Notificações */}
            <ManualSection icon={Bell} title="9. Notificações">
              <p>O sistema envia notificações automáticas sobre eventos importantes, como:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Avaliação de relatório (aprovado ou recusado)</li>
                <li>Alteração de status de pagamento</li>
                <li>Devolução de dados bancários para correção</li>
                <li>Novos documentos institucionais disponíveis</li>
              </ul>
              <p className="mt-2">Fique atento ao ícone de sino no cabeçalho para não perder nenhuma atualização.</p>
            </ManualSection>

            {/* 10. Dúvidas */}
            <ManualSection icon={HelpCircle} title="10. Dúvidas Frequentes">
              <div className="space-y-4">
                <div>
                  <p className="font-medium text-foreground">Posso alterar meu CPF após o cadastro?</p>
                  <p>Não. O CPF é bloqueado após o primeiro salvamento. Em caso de erro, entre em contato com o gestor responsável.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Como sei se meu relatório foi aprovado?</p>
                  <p>Você receberá uma notificação e o status da parcela mudará para "Liberado" na tela de pagamentos.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Não consigo editar meus dados bancários. O que fazer?</p>
                  <p>Seus dados estão em análise ou já foram validados pelo gestor. Caso precise corrigir algo, solicite a devolução ao gestor.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Qual o formato aceito para relatórios?</p>
                  <p>Apenas arquivos PDF com no máximo 5 MB.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">O que acontece se eu perder o prazo de envio do relatório?</p>
                  <p>O pagamento da parcela correspondente ficará bloqueado até que o relatório seja enviado e aprovado.</p>
                </div>
              </div>
            </ManualSection>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default ScholarManual;
