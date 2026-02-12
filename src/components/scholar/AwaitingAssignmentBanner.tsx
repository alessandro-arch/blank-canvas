import { Clock, CheckCircle, UserCheck } from "lucide-react";

export function AwaitingAssignmentBanner() {
  return (
    <div className="card-institutional mb-6 bg-gradient-to-r from-primary/5 via-background to-muted/30 border-primary/20">
      {/* Success indicator */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
          <CheckCircle className="w-6 h-6 text-success" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Seu cadastro foi concluído com sucesso.
          </h2>
          <p className="text-muted-foreground mt-1">
            Bem-vindo à plataforma de gestão de bolsas.
          </p>
        </div>
      </div>

      {/* Status message */}
      <div className="p-4 rounded-lg bg-muted/50 border border-border">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-warning" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-foreground flex items-center gap-2">
              Aguardando Atribuição
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning">
                Pendente
              </span>
            </h3>
            <p className="text-muted-foreground mt-2">
              A bolsa, modalidade e projeto serão atribuídos pelo gestor responsável.
            </p>
            <p className="text-muted-foreground mt-1">
              Assim que isso ocorrer, você será notificado.
            </p>
          </div>
        </div>
      </div>

      {/* What to expect */}
      <div className="mt-6 pt-5 border-t border-border/50">
        <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-primary" />
          O que acontece após a atribuição?
        </h4>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
            <span>Você terá acesso aos detalhes da sua bolsa, projeto e valor mensal.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
            <span>Poderá enviar relatórios mensais para liberação dos pagamentos.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
            <span>Acompanhará o histórico de parcelas e documentos do termo de outorga.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
