
# Campo Empresa/Instituicao com Lista MEC + UF Obrigatoria

## Resumo

Substituir o campo de texto livre "Empresa / Instituicao" na pagina Minha Conta por um componente Combobox com busca inteligente na base oficial do MEC (4.329 instituicoes), com UF obrigatoria e opcao de cadastro manual para instituicoes/empresas fora da lista.

---

## Etapas de Implementacao

### 1. Criar tabela `institutions_mec` no Supabase

Migration SQL para criar a tabela que armazenara a base do MEC:

```text
CREATE TABLE public.institutions_mec (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_ies integer,
  nome text NOT NULL,
  sigla text,
  uf char(2) NOT NULL,
  categoria text,
  organizacao_academica text,
  municipio text,
  situacao text,
  normalized_name text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_institutions_mec_nome ON public.institutions_mec (nome);
CREATE INDEX idx_institutions_mec_sigla ON public.institutions_mec (sigla);
CREATE INDEX idx_institutions_mec_uf ON public.institutions_mec (uf);
CREATE INDEX idx_institutions_mec_normalized ON public.institutions_mec (normalized_name);

-- RLS: leitura para qualquer usuario autenticado
ALTER TABLE public.institutions_mec ENABLE ROW LEVEL SECURITY;
CREATE POLICY "institutions_mec_select_authenticated"
  ON public.institutions_mec FOR SELECT
  USING (auth.uid() IS NOT NULL);
```

### 2. Adicionar colunas ao perfil (`profiles`)

Adicionar campos estruturados a tabela `profiles` existente para armazenar os dados da instituicao de forma padronizada:

```text
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS institution_sigla text,
  ADD COLUMN IF NOT EXISTS institution_uf char(2),
  ADD COLUMN IF NOT EXISTS institution_is_custom boolean DEFAULT false;
```

O campo `institution` ja existe na tabela profiles e continuara sendo usado para o nome.

### 3. Importar a base MEC via Edge Function

Criar uma Edge Function `import-institutions-mec` que:
- Recebe o CSV (ou le de um arquivo no Storage)
- Faz o parse das 4.329 linhas
- Converte nome e sigla para MAIUSCULAS
- Gera `normalized_name` (sem acentos, minusculo) para busca
- Insere em lote na tabela `institutions_mec`

Alternativamente, como a base e estatica, gerar um SQL INSERT direto na migration com os dados convertidos. Devido ao tamanho (4.329 linhas), a abordagem mais pratica sera:
- Copiar o CSV para `public/data/institutions-mec.csv`
- Criar um script de importacao na Edge Function que sera executado uma unica vez

### 4. Criar componente `InstitutionCombobox`

**Novo arquivo:** `src/components/my-account/InstitutionCombobox.tsx`

Componente baseado no Popover + Command (shadcn/ui) existente no projeto:

- Campo de busca com placeholder "Digite o nome, sigla ou UF da instituicao"
- Busca no Supabase usando `ilike` no `normalized_name`, `sigla` e `uf`
- Exibe resultados no formato: `NOME (SIGLA) -- UF`
- Ao selecionar, preenche `institution_name`, `institution_sigla`, `institution_uf`
- Botao "+ Minha instituicao nao esta na lista" no final da lista
- Formulario manual com Nome, Sigla e UF (select) obrigatorios
- Todas as entradas convertidas para MAIUSCULAS

### 5. Atualizar pagina Minha Conta

**Arquivo:** `src/pages/MyAccount.tsx`

- Substituir o `<Input>` de "Empresa / Instituicao" pelo novo `InstitutionCombobox`
- Gerenciar estado: `institutionName`, `institutionSigla`, `institutionUf`, `institutionIsCustom`
- Carregar dados existentes do perfil (incluindo novos campos)
- No `handleSave`, salvar os 4 campos no `profiles`
- Adicionar mensagem de ajuda sobre o MEC

### 6. Validacoes

- Nome, sigla e UF obrigatorios (quando instituicao preenchida)
- Conversao automatica para MAIUSCULAS
- Sanitizacao de HTML/scripts nas entradas
- Registros existentes com apenas `institution` preenchido continuam funcionando (retrocompatibilidade)

---

## Arquivos Modificados/Criados

| Arquivo | Acao |
|---|---|
| Migration SQL | Criar tabela `institutions_mec` + colunas no `profiles` |
| `public/data/institutions-mec.csv` | Copia do CSV do MEC para importacao |
| `supabase/functions/import-institutions-mec/index.ts` | Edge Function para importar CSV |
| `src/components/my-account/InstitutionCombobox.tsx` | Novo componente Combobox |
| `src/pages/MyAccount.tsx` | Integrar o novo componente |

## Observacoes

- A busca sera feita diretamente no Supabase (query server-side) para nao carregar 4.329 registros no frontend
- O componente usa Popover + Command do shadcn/ui ja instalado no projeto
- Registros antigos com campo `institution` como texto livre nao serao quebrados
- A UF e exibida como select com as 27 opcoes do Brasil no modo manual
