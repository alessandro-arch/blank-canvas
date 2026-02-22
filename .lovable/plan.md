

# Corrigir botao "Comprovante" para Auditor (somente leitura)

## Problema

O componente `ScholarPaymentRowComponent` e `PaymentMobileCard` mostram o botao "Comprovante" para pagamentos com status "paid", que sempre abre o dialog de upload (`handleOpenAttachReceipt`). Nao ha diferenciacao por perfil -- o auditor ve o mesmo fluxo de anexar do admin/manager.

## Solucao

### 1. Adicionar prop `readOnly` aos componentes de linha/card

**Arquivos:** `ScholarPaymentRow.tsx`, `PaymentMobileCard.tsx`

- Adicionar prop `readOnly?: boolean` na interface de props
- Quando `readOnly = true`:
  - Esconder botao "Pagar" (eligible)
  - Esconder botao "Enviar lembrete"
  - Trocar o botao "Comprovante" (upload) por "Ver Comprovante" (viewer)
  - Adicionar callback `onViewReceipt` para abrir o viewer
- Quando `readOnly = false` (padrao): manter comportamento atual

### 2. Adicionar callback `onViewReceipt` e dialog de visualizacao em `PaymentsManagement.tsx`

- Importar `useUserRole` para detectar `isAuditor`
- Passar `readOnly={isAuditor}` para `ScholarPaymentRowComponent` e `PaymentMobileCard`
- Criar novo dialog "Ver Comprovante" (read-only) com:
  - Info do bolsista (nome, projeto, referencia, valor, data do pagamento)
  - Se `receipt_url` existe: botoes "Abrir" e "Baixar" usando signed URL (via `downloadPaymentReceipt` de `useSignedUrl.ts`)
  - Se `receipt_url` nao existe: texto "Sem comprovante anexado" e botoes desabilitados
- Esconder botoes "Pagar" e "Anexar Comprovante" (dialogs de confirmacao/upload) para auditor
- Manter filtros, CSV export e KPIs visiveis

### 3. Detalhes dos componentes alterados

**`ScholarPaymentRow.tsx`** (linhas 57-62, 287-316):
- Adicionar `readOnly?: boolean` e `onViewReceipt?: (payment, scholar) => void` na interface
- Na secao de acoes (linha 287-316):
  - `readOnly && p.status === "paid"` -> botao "Ver Comprovante" com icone Eye, chama `onViewReceipt`
  - `!readOnly && p.status === "eligible"` -> botao "Pagar" (manter)
  - `!readOnly && p.status === "paid"` -> botao "Comprovante" upload (manter)

**`PaymentMobileCard.tsx`** (linhas 49-53, 102-119):
- Mesma logica: adicionar `readOnly` e `onViewReceipt`
- Trocar botao "Comprovante" por "Ver Comprovante" quando readOnly

**`PaymentsManagement.tsx`** (linhas 68-69, 764-771, 740-748):
- Importar `useUserRole`
- Estado `viewReceiptDialogOpen`, `viewReceiptPayment`, `viewReceiptScholar`
- Handler `handleViewReceipt` que abre o dialog viewer
- No dialog viewer: usar `downloadPaymentReceipt` de `useSignedUrl.ts` para baixar e abrir via signed URL
- Passar `readOnly={isAuditor}` e `onViewReceipt={handleViewReceipt}` aos componentes

### 4. Nenhuma alteracao de RLS necessaria

As politicas de storage para `payment-receipts` ja foram criadas na migracao anterior. O auditor ja pode ler signed URLs dos comprovantes.

## Resumo

| Arquivo | Alteracao |
|---------|-----------|
| `ScholarPaymentRow.tsx` | Adicionar props `readOnly` e `onViewReceipt`, condicionar botoes |
| `PaymentMobileCard.tsx` | Adicionar props `readOnly` e `onViewReceipt`, condicionar botoes |
| `PaymentsManagement.tsx` | Detectar auditor, criar dialog viewer, passar props read-only |

## Sem regressao

Todas as alteracoes sao condicionais: `readOnly` default `false`, entao admin/manager mantem o fluxo atual.

