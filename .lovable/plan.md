
# Plano de Hardening de Seguranca -- BolsaGO

Este e um projeto extenso de seguranca dividido em 5 fases. O plano prioriza as acoes de maior impacto e menor risco de regressao, respeitando a arquitetura atual (React + Supabase).

---

## Estado Atual (o que ja existe)

- **Route Guards**: `AdminProtectedRoute`, `ScholarProtectedRoute`, `ProtectedRoute`, `RoleProtectedRoute` ja validam sessao e role
- **SessionGuard**: Timeout de 30min com modal de aviso (60s antes), interceptor de 401, deteccao de rede
- **RLS**: Funcoes auxiliares `has_role()`, `is_org_admin()`, `get_user_organizations()`, etc. ja existem como SECURITY DEFINER
- **PIX**: Ja usa criptografia via Vault com `encrypt_and_mask_pix_key` trigger e coluna `pix_key_masked`
- **PDFs**: `PdfViewerDialog` ja existe; signed URLs ja sao usadas em `useSignedUrl.ts` (10min expiracao)
- **Auditoria**: Tabela `audit_logs` ja registra acoes criticas

---

## FASE 1 -- Anti-cache e Limpeza de Estado pos-Logout

**Objetivo**: Impedir que "voltar no navegador" exiba conteudo protegido apos logout.

### 1.1 Limpar cache do React Query no signOut

- No `AuthContext.tsx`, importar `queryClient` e chamar `queryClient.clear()` dentro da funcao `signOut()` antes de `supabase.auth.signOut()`
- Isso remove todos os dados em cache do React Query imediatamente

### 1.2 Meta tags anti-cache no index.html

- Adicionar no `<head>` do `index.html`:
  ```text
  <meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate" />
  <meta http-equiv="Pragma" content="no-cache" />
  ```

### 1.3 Redirecionamento forcado no onAuthStateChange

- No `SessionGuard.tsx`, ao detectar evento `SIGNED_OUT`, forcar navegacao para `/acesso` e limpar query cache
- Previne o cenario onde o usuario clica "voltar" e ve dados residuais

### 1.4 Ajustar aviso pre-expiracao para 2 minutos

- Alterar `WARNING_BEFORE_MS` de 60s para 120s (2 minutos) no `SessionGuard.tsx`

**Arquivos afetados**: `AuthContext.tsx`, `SessionGuard.tsx`, `index.html`

---

## FASE 2 -- Reforco de RLS

**Objetivo**: Garantir isolamento de dados entre tenants e roles.

### 2.1 Auditoria das policies existentes

- Executar `supabase--linter` para identificar tabelas sem RLS ou com policies permissivas
- Revisar policies de `profiles`, `bank_accounts`, `payments`, `monthly_reports`

### 2.2 Corrigir policy de profiles

- SELECT: usuario ve apenas proprio perfil (`user_id = auth.uid()`) OU admin/gestor da mesma org (via `get_user_organizations()`)
- UPDATE: usuario atualiza apenas proprio perfil; admin/gestor atualiza campos administrativos de usuarios da mesma org
- Substituir qualquer policy generica tipo `authenticated can select`

### 2.3 Reforcar bank_accounts

- Verificar que RLS ja impede acesso cross-tenant (conforme memory `security/banking-data-isolation`)
- Adicionar policy explicita: bolsista ve apenas proprio registro; gestor/admin ve apenas registros da mesma org

### 2.4 Storage policies

- Verificar que buckets privados (`reports`, `payment-receipts`, `grant-terms`, `relatorios`, `documentos-projetos`) bloqueiam acesso direto
- Reforcar policies: bolsista acessa apenas seus arquivos; gestor/admin acessa apenas arquivos da mesma org

**Implementacao**: Migracao SQL com `DROP POLICY IF EXISTS` + `CREATE POLICY` para cada tabela critica

---

## FASE 3 -- Dados Bancarios (Reforco da Criptografia Existente)

**Objetivo**: Garantir que nenhum dado bancario puro fique exposto.

### 3.1 Verificar estado atual

- PIX ja usa criptografia via Vault (`encrypt_and_mask_pix_key` trigger)
- Verificar se campos `banco`, `agencia`, `conta` estao em texto puro ou mascarados
- Se em texto puro, aplicar o mesmo padrao de mascaramento

### 3.2 Criar Edge Function para leitura segura (se necessario)

- Se campos bancarios alem do PIX estiverem em texto puro, criar Edge Function `secure-bank-read` que:
  - Valida auth + role + tenant
  - Retorna dados completos apenas para admin/gestor autorizado
  - Registra auditoria
- Frontend exibe apenas versao mascarada por padrao

### 3.3 Remover colunas de texto puro (se existirem)

- Migracao para NULL-ificar colunas antigas apos migrar para formato criptografado

**Nota**: Esta fase depende de uma analise detalhada do schema atual de `bank_accounts`. Sera refinada durante a implementacao.

---

## FASE 4 -- PDFs: Viewer Interno e Auditoria

**Objetivo**: Eliminar abertura de URLs tecnicas em nova aba; registrar acessos.

### 4.1 Centralizar acesso via PdfViewerDialog

- Substituir todas as chamadas `window.open(signedUrl)` e `openReportPdf()` por abertura no `PdfViewerDialog` existente
- Arquivos afetados (10 componentes): `GrantTermSection`, `MonthlyReportsReviewManagement`, `ProjectDocumentsSection`, `InstallmentsTable`, `ReportsTab`, `ReportVersionsDialog`, `GrantTermTab`, `ReportsReviewManagement`, `PdfReadyDialog`

### 4.2 Registrar auditoria de visualizacao/download

- Ao abrir ou baixar um PDF, inserir registro em `audit_logs` com acao `document_viewed` ou `document_downloaded`
- Incluir `document_id`, `user_id`, `action`, timestamp

### 4.3 Reduzir expiracao de signed URLs

- Reduzir de 600s (10min) para 300s (5min) em `useSignedUrl.ts`

**Arquivos afetados**: `useSignedUrl.ts`, `PdfViewerDialog.tsx`, 10 componentes que abrem PDFs

---

## FASE 5 -- Headers de Seguranca e Melhorias Complementares

**Objetivo**: Adicionar camadas de protecao adicionais.

### 5.1 Headers de seguranca

- Adicionar no `index.html` (via meta tags, ja que Lovable nao controla headers do servidor):
  ```text
  <meta http-equiv="X-Content-Type-Options" content="nosniff" />
  <meta http-equiv="X-Frame-Options" content="SAMEORIGIN" />
  ```
- `Referrer-Policy` e `CSP` via meta tags (limitado mas funcional)

### 5.2 MFA (informativo)

- MFA via TOTP e suportado pelo Supabase Auth, mas requer configuracao no Dashboard do Supabase (Authentication > MFA)
- Recomendacao: habilitar e adicionar fluxo de enrollment para admin/gestor
- **Nota**: Implementacao completa de MFA e um projeto separado; nesta fase, documentar a recomendacao e configurar o lado do Supabase

### 5.3 Rate limiting

- Rate limiting em login/reset ja e parcialmente tratado pelo Supabase Auth (rate limits built-in)
- Para endpoints custom, avaliar implementacao via Edge Function com contagem em tabela auxiliar
- **Nota**: Escopo limitado nesta fase; implementacao completa sob demanda

---

## Ordem de Implementacao Recomendada

1. **Fase 1** (anti-cache + limpeza de estado) -- impacto imediato, baixo risco
2. **Fase 4** (PDFs no viewer interno + auditoria) -- alta visibilidade, risco moderado
3. **Fase 2** (RLS) -- requer analise cuidadosa das policies existentes para nao quebrar funcionalidades
4. **Fase 5** (headers) -- simples, complementar
5. **Fase 3** (criptografia bancaria) -- ja parcialmente implementada; refinamento sob demanda

---

## Detalhes Tecnicos

### Arquivos a serem modificados

| Arquivo | Fase | Alteracao |
|---------|------|-----------|
| `src/contexts/AuthContext.tsx` | 1 | Limpar queryClient no signOut |
| `src/components/auth/SessionGuard.tsx` | 1 | Redirecionar no SIGNED_OUT, ajustar warning para 2min |
| `index.html` | 1, 5 | Meta tags anti-cache e seguranca |
| `src/hooks/useSignedUrl.ts` | 4 | Reduzir expiracao, adicionar auditoria |
| `src/components/ui/PdfViewerDialog.tsx` | 4 | Melhorias para uso centralizado |
| 10 componentes de PDF | 4 | Substituir `window.open` por `PdfViewerDialog` |
| Migracao SQL | 2 | Policies RLS revisadas |

### Riscos e Mitigacoes

- **Anti-cache agressivo**: Pode afetar performance em sessoes ativas. Mitigacao: aplicar `no-store` apenas via meta tags (nao afeta assets estaticos do Vite)
- **RLS mais restritivo**: Pode bloquear queries legitimas. Mitigacao: testar cada policy antes de aplicar; manter policies antigas comentadas na migracao para rollback rapido
- **PDF viewer interno**: Alguns PDFs pesados podem carregar lentamente no iframe. Mitigacao: manter botao "Baixar PDF" como fallback
