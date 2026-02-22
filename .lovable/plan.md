

# Corrigir permissoes e telas do Auditor - Plano de Implementacao

## Diagnostico

Apos analise detalhada, identifiquei os seguintes problemas:

### 1. Nomes dos bolsistas nao aparecem
A politica RLS da tabela `profiles` so permite SELECT para `admin` e `manager`. O auditor nao consegue ler nomes dos bolsistas nas queries do frontend.

### 2. Comprovantes de pagamento inacessiveis
O bucket `payment-receipts` no Storage so permite SELECT para `manager` e `admin`. O auditor nao consegue baixar/visualizar comprovantes.

### 3. Card de Projeto Tematico nao abre
A funcao `handleOpenProject` em `ThematicProjectsList.tsx` (linha 186) navega sempre para `/admin/projetos-tematicos/${id}`. Quando o auditor clica, vai para rota do admin, que nao aceita auditor. O botao "Voltar" em `ThematicProjectDetail.tsx` (linha 547) tambem aponta para `/projetos-tematicos` (rota legada).

### 4. Anexos de relatorios (report_attachments)
A tabela `report_attachments` so tem politicas para scholar. Auditor nao consegue ver anexos.

### 5. Botoes de edicao/criacao vissiveis para auditor
Em `ThematicProjectsList.tsx` e `ThematicProjectDetail.tsx`, botoes como "Novo Projeto Tematico", "Novo Subprojeto", menus de editar/arquivar/excluir aparecem para o auditor.

---

## Alteracoes Planejadas

### Parte 1 - Migracao SQL (RLS + Storage)

**1a. Politica SELECT em `profiles` para auditor**
Permitir que o auditor veja perfis de bolsistas vinculados a projetos da sua organizacao:

```text
CREATE POLICY "Profiles: select auditor org-scoped"
ON public.profiles FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'auditor'::app_role)
  AND organization_id IN (SELECT get_user_organizations())
);
```

**1b. Politica SELECT em `report_attachments` para auditor**

```text
CREATE POLICY "Auditor can view org report_attachments"
ON public.report_attachments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM monthly_reports mr
    JOIN organization_members om
      ON om.organization_id = mr.organization_id
    WHERE mr.id = report_attachments.report_id
      AND om.user_id = auth.uid()
      AND om.role = 'auditor'
      AND om.is_active = true
  )
);
```

**1c. Politica SELECT em Storage `payment-receipts` para auditor**

```text
CREATE POLICY "Auditors can view payment receipts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'payment-receipts'
  AND has_role(auth.uid(), 'auditor'::app_role)
);
```

Nota: Como o auditor ja tem SELECT na tabela `payments` (que contem `receipt_url`), e a politica de storage e separada, precisamos abrir o bucket para leitura pelo auditor. O escopo organizacional ja e garantido pela RLS da tabela `payments` - o auditor so vera URLs de pagamentos que o RLS permite.

### Parte 2 - Frontend: Navegacao dos Projetos Tematicos

**2a. `ThematicProjectsList.tsx`**
- Alterar `handleOpenProject` para usar o prefixo correto baseado no `isAuditor`:
  - Auditor: `/auditor/projetos-tematicos/${id}`
  - Admin/Manager: `/admin/projetos-tematicos/${id}`
- Esconder botoes "Novo Projeto Tematico" e menu de acoes (editar/arquivar/excluir) para auditor
- Esconder botao "Exportar" ou manter (somente leitura, CSV e inofensivo)

**2b. `ThematicProjectDetail.tsx`**
- Alterar botao "Voltar" para navegar para o prefixo correto (`/auditor/projetos-tematicos` vs `/admin/projetos-tematicos`)
- Esconder botoes "Novo Subprojeto", "Editar", "Arquivar", "Excluir" para auditor
- Manter botoes de PDF (Relatorio PDF e Relatorio Executivo) visiveis para auditor (edge functions ja permitem)
- Manter botao "Exportar" CSV

### Parte 3 - Frontend: Pagamentos para Auditor

**2c. `PaymentsManagement.tsx`**
- O componente ja funciona com os dados que o RLS permite. Apos a correcao do RLS em `profiles`, os nomes dos bolsistas passarao a aparecer.
- Esconder botoes de acao (marcar como pago, anexar comprovante) para auditor -- verificar se ja esta oculto ou precisa ser ajustado.

### Parte 4 - Frontend: Relatorios Mensais para Auditor

O componente `MonthlyReportsReviewManagement.tsx` ja trata o auditor corretamente (esconde botao "Avaliar", mostra "Ver Parecer" somente leitura). Apos a correcao do RLS em `profiles`, os nomes dos bolsistas aparecerao.

---

## Resumo das Alteracoes

| Camada | Recurso | Alteracao |
|--------|---------|-----------|
| RLS | `profiles` | Nova politica SELECT para auditor (org-scoped) |
| RLS | `report_attachments` | Nova politica SELECT para auditor |
| Storage | `payment-receipts` | Nova politica SELECT para auditor |
| Frontend | `ThematicProjectsList.tsx` | Navegacao corrigida + botoes ocultos para auditor |
| Frontend | `ThematicProjectDetail.tsx` | Botao voltar corrigido + botoes de edicao ocultos para auditor |

## Detalhes Tecnicos

### Arquivos modificados:
1. Nova migracao SQL (3 politicas)
2. `src/pages/ThematicProjectsList.tsx` - linhas 186, 252-261, 346-375
3. `src/pages/ThematicProjectDetail.tsx` - linhas 547, 559-593

### Nenhuma nova edge function necessaria
As edge functions `generate-thematic-project-pdf` e `generate-executive-report-pdf` ja incluem `auditor` na checagem de roles.

### Nenhuma regressao para Admin/Manager
Todas as alteracoes sao condicionais ao `isAuditor`, sem impacto nos fluxos existentes.

