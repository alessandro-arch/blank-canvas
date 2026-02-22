
# Cadastro e Governanca de Instituicoes (Base MEC + Validacao Administrativa)

## Resumo

Evoluir o sistema atual de instituicoes -- que usa a tabela `institutions_mec` apenas para consulta e salva dados diretamente no perfil -- para um modelo com tabela unificada `institutions`, fluxo de submissao por usuarios, validacao CNPJ, e painel administrativo de aprovacao.

---

## Situacao Atual

- Tabela `institutions_mec` com ~4.300 registros do MEC (somente leitura)
- Campo `InstitutionCombobox` busca nessa tabela e permite cadastro manual
- Dados da instituicao salvos diretamente em colunas do `profiles` (`institution`, `institution_sigla`, `institution_uf`, `institution_is_custom`)
- Sem validacao de CNPJ, sem fluxo de aprovacao, sem painel admin

---

## Plano de Implementacao

### Etapa 1 -- Migracoes de Banco de Dados

**1a. Criar tabela `institutions`**

Tabela unificada que substitui `institutions_mec` como fonte principal:

| Campo | Tipo | Descricao |
|---|---|---|
| id | uuid PK | Identificador |
| name | text NOT NULL | Nome oficial (MAIUSCULO) |
| acronym | text | Sigla |
| uf | text NOT NULL | Estado |
| municipality | text | Municipio |
| category | text | Publica, Privada, etc. |
| academic_organization | text | Universidade, Centro, etc. |
| cnpj | text | CNPJ formatado (unico quando preenchido) |
| source | text NOT NULL | 'MEC' ou 'USER_SUBMITTED' |
| status | text NOT NULL DEFAULT 'approved' | 'approved', 'pending', 'rejected' |
| submitted_by | uuid | user_id do solicitante |
| institution_type | text | Empresa, IES, ONG, Orgao Publico |
| rejection_reason | text | Motivo da rejeicao |
| normalized_name | text | Para busca sem acentos |
| created_at / updated_at | timestamptz | Timestamps |

**1b. Migrar dados existentes**

- Copiar registros de `institutions_mec` para `institutions` com `source='MEC'`, `status='approved'`
- Manter `institutions_mec` intacta (compatibilidade)

**1c. Adicionar coluna `institution_id` em `profiles`**

- `institution_id uuid REFERENCES institutions(id)` (nullable)
- Perfis existentes com `institution_is_custom=false` serao vinculados via match por nome
- Perfis com `institution_is_custom=true` gerarao registros `USER_SUBMITTED` com `status='approved'` (legado)

**1d. RLS na tabela `institutions`**

- SELECT: qualquer usuario autenticado pode ler instituicoes com `status='approved'` ou `submitted_by = auth.uid()`
- INSERT: qualquer usuario autenticado pode inserir com `source='USER_SUBMITTED'` e `status='pending'`
- UPDATE: apenas admin (via `has_role`)

**1e. Indices**

- `idx_institutions_name` em `normalized_name` com `pg_trgm`
- `idx_institutions_cnpj` unico condicional (quando nao nulo)
- `idx_institutions_status`

### Etapa 2 -- Validador de CNPJ

Criar `src/lib/cnpj-validator.ts` seguindo o padrao do `cpf-validator.ts` existente:
- `formatCNPJ(value)` -- mascara XX.XXX.XXX/XXXX-XX
- `unformatCNPJ(value)` -- apenas digitos
- `validateCNPJ(cnpj)` -- algoritmo Modulo 11 com dois digitos verificadores

### Etapa 3 -- Refatorar InstitutionCombobox

Alterar `src/components/my-account/InstitutionCombobox.tsx`:

- Buscar na tabela `institutions` (em vez de `institutions_mec`)
- Filtrar por `status='approved'` na busca
- No modo manual ("Nao encontrei"), abrir formulario expandido com:
  - Nome (MAIUSCULO, obrigatorio)
  - Sigla (MAIUSCULO, obrigatorio)
  - UF (obrigatorio)
  - CNPJ (obrigatorio para empresas privadas, validacao Modulo 11)
  - Municipio (opcional)
  - Tipo: Empresa / IES / ONG / Orgao Publico (select)
- Ao confirmar: INSERT na tabela `institutions` com `status='pending'`, `source='USER_SUBMITTED'`
- Salvar `institution_id` no perfil em vez dos campos avulsos
- Exibir badge "Pendente de aprovacao" quando a instituicao selecionada tem `status='pending'`

### Etapa 4 -- Atualizar MyAccount.tsx

- Alterar `handleSave` para salvar `institution_id` no perfil
- Carregar dados da instituicao via join ou consulta separada
- Manter compatibilidade: se `institution_id` for null mas `institution` (texto antigo) existir, exibir normalmente

### Etapa 5 -- Painel Admin de Instituicoes

**5a. Criar pagina `src/pages/InstitutionsManagement.tsx`**

Acessivel em `/admin/instituicoes` (AdminProtectedRoute, adminOnly).

Funcionalidades:
- Listagem com filtros por status (Pendentes / Aprovadas / Rejeitadas)
- Contadores por status
- Para cada instituicao pendente: botoes Aprovar e Rejeitar
- Ao rejeitar: campo de motivo obrigatorio
- Edicao de dados antes da aprovacao
- Busca por nome, sigla, CNPJ

**5b. Adicionar ao sidebar**

Em `SidebarContent.tsx`, adicionar item na secao "Gestao Institucional":
```
{ name: "Instituicoes", icon: Building, href: "/admin/instituicoes", adminOnly: true }
```

**5c. Adicionar rota em `App.tsx`**

```
<Route path="/admin/instituicoes" element={
  <AdminProtectedRoute allowedRoles={["admin"]}>
    <InstitutionsManagement />
  </AdminProtectedRoute>
} />
```

### Etapa 6 -- Verificacao de Duplicidade

Na submissao de nova instituicao, verificar no frontend antes do INSERT:
- Nome similar (busca ilike)
- Sigla identica
- CNPJ ja cadastrado (busca exata)

Exibir alerta se encontrar possiveis duplicatas, permitindo que o usuario confirme ou selecione a existente.

### Etapa 7 -- Audit Log

Registrar em `audit_logs`:
- `institution_submitted` -- quando usuario submete nova instituicao
- `institution_approved` -- quando admin aprova
- `institution_rejected` -- quando admin rejeita

---

## Arquivos a Criar

| Arquivo | Descricao |
|---|---|
| `src/lib/cnpj-validator.ts` | Validador e formatador de CNPJ |
| `src/pages/InstitutionsManagement.tsx` | Painel admin de gestao de instituicoes |
| Migracao SQL | Tabela `institutions`, indices, RLS, migracao de dados |

## Arquivos a Modificar

| Arquivo | Alteracao |
|---|---|
| `src/components/my-account/InstitutionCombobox.tsx` | Refatorar para usar tabela `institutions`, adicionar CNPJ e tipo |
| `src/pages/MyAccount.tsx` | Salvar `institution_id`, carregar dados via nova tabela |
| `src/components/layout/SidebarContent.tsx` | Adicionar link "Instituicoes" no menu admin |
| `src/App.tsx` | Adicionar rota `/admin/instituicoes` |

## Notas Importantes

- A tabela `institutions_mec` original nao sera removida (compatibilidade)
- Colunas legadas em `profiles` (`institution`, `institution_sigla`, etc.) permanecem mas deixam de ser a fonte primaria
- CNPJ e dado publico institucional, nao PII -- pode ser armazenado na tabela `institutions` sem isolamento especial
- Notificacoes por e-mail (aprovacao/rejeicao) podem ser implementadas em etapa futura
