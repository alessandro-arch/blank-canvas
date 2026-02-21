

# Seguranca Bancaria: Separacao public/sensitive + Edge Functions + Auditoria

## Resumo

Reestruturar o armazenamento de dados bancarios em duas camadas: `bank_accounts` (publica, apenas masked + status) e `bank_accounts_sensitive` (dados reais, inacessivel pelo client). Todo acesso sensivel passa por Edge Functions com auditoria.

---

## Estado Atual

- Tabela unica `bank_accounts` com campos em texto puro: `bank_code`, `agency`, `account_number`
- PIX ja criptografado via Vault (trigger `encrypt_and_mask_pix_key`)
- RLS existente permite SELECT por admin/manager/owner -- mas retorna campos sensiveis
- Edge Function `secure-bank-read` ja existe mas le da tabela unica
- 7 arquivos fazem SELECT direto em `bank_accounts`

---

## FASE 1 -- Migracao de Banco (SQL)

### 1.1 Adicionar colunas masked na tabela `bank_accounts` existente

Em vez de criar duas tabelas separadas (que quebraria FK, triggers, e dezenas de queries), a abordagem mais segura e:

- Adicionar colunas `bank_code_masked`, `agency_masked`, `account_number_masked` na tabela existente
- Criar trigger que popula automaticamente os masked ao INSERT/UPDATE
- Popular os masked para registros existentes via UPDATE

```text
ALTER TABLE bank_accounts
  ADD COLUMN IF NOT EXISTS bank_code_masked text,
  ADD COLUMN IF NOT EXISTS agency_masked text,
  ADD COLUMN IF NOT EXISTS account_number_masked text;
```

### 1.2 Trigger de mascaramento automatico

Funcao que roda em BEFORE INSERT OR UPDATE e gera:
- `bank_code_masked` = '**'
- `agency_masked` = '***' + ultimo digito
- `account_number_masked` = '****' + ultimos 4 digitos

### 1.3 Popular dados existentes

```text
UPDATE bank_accounts SET
  bank_code_masked = '**',
  agency_masked = '***' || RIGHT(agency, 1),
  account_number_masked = '****' || RIGHT(account_number, LEAST(4, LENGTH(account_number)));
```

### 1.4 Restringir acesso via RLS

Criar uma VIEW `bank_accounts_public` que expoe apenas colunas nao sensiveis:
- `id`, `user_id`, `bank_name`, `bank_code_masked`, `agency_masked`, `account_number_masked`, `pix_key_masked`, `pix_key_type`, `account_type`, `validation_status`, `locked_for_edit`, `validated_by`, `validated_at`, `notes_gestor`, `created_at`, `updated_at`

A VIEW sera `SECURITY INVOKER` e herda RLS da tabela base. O frontend passara a usar esta VIEW para listagem.

**Nota**: Nao e possivel bloquear colunas especificas via RLS no PostgreSQL. A alternativa segura e: o frontend usa a VIEW (que nao inclui colunas sensiveis) e os dados completos vem apenas via Edge Function.

---

## FASE 2 -- Edge Functions

### 2.1 Atualizar `secure-bank-read`

Ja existe, mas sera atualizado para:
- Ler da tabela `bank_accounts` via service role (dados completos)
- Retornar `masked` sempre (usando as colunas `_masked`)
- Retornar `full` apenas para admin/manager/owner da org
- Auditoria ja implementada -- manter

### 2.2 Criar `secure-bank-upsert` (novo)

**Arquivo**: `supabase/functions/secure-bank-upsert/index.ts`

Entrada: POST JSON com `organization_id`, `beneficiary_user_id`, `bank_code`, `bank_name`, `agency`, `account_number`, `account_type`, `pix_key`, `pix_key_type`

Fluxo:
1. Validar JWT via `getClaims()`
2. Permissoes:
   - Beneficiary: `beneficiary_user_id === auth.uid()` (apenas proprios dados)
   - Admin/Manager: qualquer bolsista da mesma org (via `organization_members`)
3. Upsert em `bank_accounts` via service role (trigger popula masked automaticamente)
4. Status resetado para `pending` quando bolsista altera; mantido quando admin altera
5. Auditoria: `action='bank_data_upsert'`, metadata com lista de campos alterados (sem valores)
6. Retornar `{ success: true, masked: {...} }`

**Seguranca**: Nunca logar valores sensiveis; validar inputs no backend.

### 2.3 Registrar em config.toml

```text
[functions.secure-bank-upsert]
verify_jwt = false
```

---

## FASE 3 -- Refatorar Frontend (Gestor)

### 3.1 `BankDataManagement.tsx`

- Trocar query de `bank_accounts` para a VIEW `bank_accounts_public`
- Campos exibidos na listagem: `bank_name`, `bank_code_masked`, `agency_masked`, `account_number_masked`
- Remover `bank_code`, `agency`, `account_number` do tipo `BankAccountWithProfile`
- Botao "Revelar" e "Detalhes" continuam chamando `secure-bank-read` (ja funciona)

### 3.2 `BankDataThematicCard.tsx`

- Atualizar interface para usar campos masked
- Remover referencia a `bank_code`, `agency`, `account_number` em texto puro
- Tabela exibe `bank_code_masked`, `agency_masked`, `account_number_masked` por padrao

### 3.3 `ReportsReviewManagement.tsx` e `PaymentsManagement.tsx`

- Ja fazem apenas `select("user_id")` em bank_accounts -- sem mudanca necessaria

### 3.4 `ScholarProfileView.tsx`

- Trocar SELECT de `bank_accounts` para `bank_accounts_public` (VIEW)
- Exibir apenas campos masked para o gestor/admin
- Botao "Revelar" chama `secure-bank-read`

---

## FASE 4 -- Refatorar Frontend (Bolsista)

### 4.1 `useScholarProfile.ts` (saveBankData)

- Substituir INSERT/UPDATE direto em `bank_accounts` por chamada a `secure-bank-upsert`
- Hook `useBankDataSecureUpsert` encapsula a chamada

### 4.2 `useScholarProfile.ts` (fetchProfile - leitura)

- Trocar SELECT de `bank_accounts` para `bank_accounts_public` (VIEW)
- Bolsista ve apenas seus dados masked (RLS ja garante)
- Para o formulario de edicao: carregar valores atuais masked + permitir preenchimento de novos valores

### 4.3 `useBankDataStatus.ts`

- Trocar SELECT de `bank_accounts` para `bank_accounts_public` (VIEW)
- Campos ja usados sao compativeis (bank_name, agency como masked, etc.)

### 4.4 Novo hook `useBankDataSecureUpsert.ts`

```text
useBankDataSecureUpsert() => {
  upsertBankData(params) => Promise<{ success, masked }>
  loading: boolean
}
```

---

## FASE 5 -- Auditoria

### 5.1 Novos tipos de acao

Adicionar em `useAuditLog.ts`:
- `bank_data_upsert` -- quando dados sao salvos/atualizados

### 5.2 Edge Functions registram auditoria

- `secure-bank-read`: ja faz (action `bank_data_read`)
- `secure-bank-upsert`: novo (action `bank_data_upsert`, metadata com campos alterados sem valores)

---

## Arquivos Afetados

| Arquivo | Fase | Mudanca |
|---------|------|---------|
| Migracao SQL | 1 | Colunas masked, trigger, VIEW |
| `supabase/functions/secure-bank-read/index.ts` | 2 | Ajustar para usar masked columns |
| `supabase/functions/secure-bank-upsert/index.ts` | 2 | Novo |
| `supabase/config.toml` | 2 | Adicionar secure-bank-upsert |
| `src/hooks/useBankDataSecureUpsert.ts` | 4 | Novo hook |
| `src/hooks/useAuditLog.ts` | 5 | Adicionar tipo bank_data_upsert |
| `src/components/dashboard/BankDataManagement.tsx` | 3 | Usar VIEW, remover campos puros |
| `src/components/dashboard/BankDataThematicCard.tsx` | 3 | Usar campos masked |
| `src/pages/ScholarProfileView.tsx` | 3 | Usar VIEW |
| `src/hooks/useScholarProfile.ts` | 4 | Usar VIEW + secure-bank-upsert |
| `src/hooks/useBankDataStatus.ts` | 4 | Usar VIEW |
| `src/components/admin-icca/ScholarsTab.tsx` | 3 | Usar VIEW (ja le so status) |
| `src/components/admin-icca/OrganizationsTab.tsx` | 3 | Usar VIEW (ja le so count) |

---

## Riscos e Mitigacoes

- **Trigger de mascaramento**: Pode falhar se dados existentes tiverem valores NULL. Mitigacao: usar COALESCE no trigger.
- **VIEW vs tabela**: VIEW nao permite INSERT/UPDATE direto. O bolsista continua usando a Edge Function para escrita. Para leitura de status/masked, a VIEW funciona perfeitamente.
- **Compatibilidade**: O formulario de edicao do bolsista hoje envia dados e recebe de volta. Com a Edge Function, o retorno sera `masked` -- o formulario deve limpar os campos apos salvar e mostrar confirmacao.
- **Import (planilha)**: O import de `bank_accounts` via planilha (`useSpreadsheetParser.ts`) precisara ser revisado para usar a Edge Function ou ser temporariamente desabilitado para dados sensiveis.

---

## Ordem de Implementacao

1. Migracao SQL (colunas masked + trigger + VIEW)
2. Edge Function `secure-bank-upsert`
3. Atualizar `secure-bank-read` para retornar masked columns
4. Refatorar frontend gestor (BankDataManagement, BankDataThematicCard, ScholarProfileView)
5. Refatorar frontend bolsista (useScholarProfile, useBankDataStatus)
6. Auditoria e tipos

