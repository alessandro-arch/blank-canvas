

# Bloquear Dados Bancarios para Auditor - Defesa em Profundidade

## Situacao Atual

O sistema ja possui multiplas camadas de protecao que impedem auditores de acessar dados bancarios:

1. **RLS (banco de dados)**: A tabela `bank_accounts` nao tem politica SELECT para auditores -- acesso negado
2. **Rotas protegidas**: `AdminProtectedRoute` redireciona auditores para `/auditor/dashboard`
3. **Sidebar**: O menu do auditor nao inclui "Operacao de Bolsas" nem "Dados Bancarios"
4. **Edge Function `secure-bank-read`**: So retorna dados completos para admin/manager/owner

## Reforcos Adicionais Propostos

Para garantir protecao total, vamos adicionar bloqueios explicitos em mais pontos:

### 1. Edge Function `secure-bank-read/index.ts`
Adicionar verificacao explicita no inicio: se o `callerRole` for `auditor` OU se o usuario tiver membership com role `auditor`, retornar erro 403 imediatamente, antes de qualquer processamento.

### 2. Componente `BankDataManagement.tsx`
Adicionar verificacao no componente: se o usuario for auditor (`useUserRole().isAuditor`), renderizar um banner de "Acesso Restrito" em vez do conteudo de dados bancarios.

### 3. Pagina `OperacaoBolsas.tsx`
Ocultar a aba "Dados Bancarios" do TabsList quando o usuario for auditor (mesmo que ele nao devesse chegar nessa pagina, e uma camada extra de seguranca).

### Resumo dos arquivos alterados

| Arquivo | Alteracao |
|---|---|
| `supabase/functions/secure-bank-read/index.ts` | Rejeitar auditor com 403 antes de processar |
| `src/components/dashboard/BankDataManagement.tsx` | Mostrar "Acesso Restrito" para auditores |
| `src/pages/OperacaoBolsas.tsx` | Ocultar aba "Dados Bancarios" para auditores |

