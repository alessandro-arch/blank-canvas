

# Manual do Auditor - Pagina de Ajuda

## Resumo

Criar uma pagina completa de ajuda para o perfil Auditor, acessivel pelo menu lateral, seguindo o mesmo padrao visual do Manual do Bolsista (collapsible sections, passos numerados, dicas).

## Alteracoes

### 1. Nova pagina `src/pages/AuditorHelp.tsx`

Criar pagina com layout identico ao `ScholarManual.tsx`, reutilizando os componentes `ManualSection`, `StepList` e `Tip`. Conteudo completo conforme especificado no prompt:

- Cabecalho com titulo, descricao, badge "Somente Leitura" e botao "Voltar ao Painel do Auditor"
- Bloco de escopo e privacidade
- Indice lateral fixo com ancoras (em desktop) usando `position: sticky`
- Secoes collapsiveis cobrindo:
  1. O que e o Painel do Auditor
  2. Operacao de Bolsas (relatorios, parecer IA, pendencias)
  3. Gestao de Pagamentos (comprovantes, registros)
  4. Projetos Tematicos (contrato, plano de trabalho, subprojetos, exportacao PDF)
  5. Gestao Financeira (indicadores consolidados)
  6. FAQ rapido
- Botao "Voltar ao topo" fixo
- Links internos "Abrir esta tela" apontando para rotas `/auditor/*`
- Responsivo (indice lateral em desktop, oculto em mobile)

### 2. Adicionar rota no `src/App.tsx`

Nova rota protegida:
```
/auditor/ajuda -> AuditorProtectedRoute > AuditorHelp
```

### 3. Adicionar item no menu lateral (`src/components/layout/SidebarContent.tsx`)

Adicionar ao array `auditorNavigation`:
```
{ name: "Ajuda do Auditor", icon: HelpCircle, href: "/auditor/ajuda" }
```

## Detalhes tecnicos

- Reutilizar padrao visual do `ScholarManual.tsx` (Collapsible, StepList, Tip)
- Cores do auditor: amarelo (`bg-yellow-500`, `text-yellow-800`)
- Nenhuma dependencia nova necessaria
- Conteudo 100% em portugues (PT-BR), sem mencao a Lovable
- Nenhum botao de escrita (criar/editar/aprovar) na pagina

