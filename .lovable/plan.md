
# Plano: Edge Function secure-bank-read + UI consumindo via funcao

## Resumo

Criar uma Edge Function `secure-bank-read` que centraliza a leitura de dados bancarios com mascaramento automatico e acesso completo apenas para admin/gestor do tenant. Atualizar o frontend para usar essa funcao em vez de SELECT direto.

---

## O que sera feito

### 1. Criar Edge Function `secure-bank-read`

**Arquivo**: `supabase/functions/secure-bank-read/index.ts`

A funcao recebe `organization_id` e `beneficiary_user_id` via POST e:

- Valida JWT do usuario chamador via `getClaims()`
- Verifica membership na organizacao via query em `organization_members` (role + is_active)
- Busca dados bancarios do beneficiario em `bank_accounts`
- Monta versao mascarada sempre:
  - `bank_code`: "**"
  - `bank_name`: nome completo (nao sensivel)
  - `agency`: "***" + ultimos 1 digito
  - `account_number`: "****" + ultimos 4 digitos
  - `pix`: valor ja mascarado do `pix_key_masked`
- Se role do chamador for `admin` ou `manager` na mesma org, retorna `mode: "full"` com dados completos + masked
- Caso contrario, retorna `mode: "masked"` apenas com masked
- Insere registro em `audit_logs` via service role (action: `bank_data_read`, mode, actor, beneficiary)

**Config**: Adicionar em `supabase/config.toml`:
```text
[functions.secure-bank-read]
verify_jwt = false
```

### 2. Atualizar BankDataManagement.tsx (gestor)

Atualmente o componente faz SELECT direto em `bank_accounts` e recebe `bank_code`, `agency`, `account_number` em texto puro.

**Mudancas**:
- O SELECT inicial para listar contas continua (para status, IDs, nomes via profiles) -- mas os campos sensiveis (`bank_code`, `agency`, `account_number`) serao mascarados no display por padrao
- O botao "Revelar" (olho) e o dialog "Detalhes" chamarao `secure-bank-read` para obter dados completos
- Criar funcao `fetchBankDetails(orgId, beneficiaryUserId)` que chama `supabase.functions.invoke('secure-bank-read', ...)`
- No `toggleReveal`: chamar a Edge Function e so revelar se `mode === 'full'`
- No `openDetails`: chamar a Edge Function para popular o dialog com dados completos

### 3. Atualizar BankDataThematicCard.tsx

- A tabela mostra dados mascarados por padrao (ja faz isso com `maskValue`)
- O botao "Revelar" passara a chamar callback que invoca a Edge Function
- Dados revelados serao armazenados em estado local temporario (nao persistido)

### 4. Hook auxiliar `useBankDataSecureRead`

**Arquivo**: `src/hooks/useBankDataSecureRead.ts`

Hook que encapsula a chamada a Edge Function:
```text
useBankDataSecureRead() => {
  readBankData(orgId, beneficiaryUserId) => Promise<SecureBankResponse>
  loading: boolean
}
```

Retorno tipado com `mode`, `masked`, e opcionalmente campos completos.

---

## Detalhes Tecnicos

### Edge Function - Fluxo

```text
1. Extrair Authorization header
2. getClaims() para obter userId
3. POST body: { organization_id, beneficiary_user_id }
4. Service role client: query organization_members WHERE user_id = caller AND organization_id AND is_active
5. Determinar mode: 'full' se role in ('admin','manager'), 'masked' caso contrario
6. Service role client: query bank_accounts WHERE user_id = beneficiary_user_id
7. Montar masked fields
8. Se mode='full', incluir dados completos
9. Inserir audit_logs (service role): action='bank_data_read', user_id=caller, entity_id=bank_account.id, details={mode, beneficiary_user_id, organization_id}
10. Retornar response
```

### Arquivos afetados

| Arquivo | Mudanca |
|---------|---------|
| `supabase/functions/secure-bank-read/index.ts` | Novo - Edge Function |
| `supabase/config.toml` | Adicionar config da funcao |
| `src/hooks/useBankDataSecureRead.ts` | Novo - hook de leitura segura |
| `src/components/dashboard/BankDataManagement.tsx` | Usar hook para revelar/detalhes |
| `src/components/dashboard/BankDataThematicCard.tsx` | Receber dados revelados do pai |
| `src/hooks/useAuditLog.ts` | Adicionar tipo `bank_data_read` |

### Nota sobre RLS

Os dados bancarios continuam acessiveis via SELECT para gestores (policies existentes permitem). A Edge Function adiciona uma camada de auditoria e mascaramento, mas nao substitui o RLS -- funciona como camada complementar. A remocao total do SELECT direto no client exigiria restringir as colunas sensiveis via RLS (column-level security nao existe no Postgres RLS), o que quebraria outros fluxos como validacao de status. Por isso, a abordagem e: frontend consome via Edge Function, RLS continua como safety net.
