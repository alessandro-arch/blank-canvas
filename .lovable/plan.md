

# Corrigir Visibilidade de Instituicoes Pendentes + Melhorias

## Problema Identificado

A politica de RLS (Row Level Security) da tabela `institutions` so permite SELECT de registros com `status='approved'` OU `submitted_by = auth.uid()`. Isso significa que o admin **nao consegue ver** instituicoes pendentes cadastradas por outros usuarios (bolsistas). Esse e o motivo principal de nao aparecerem em "Pendentes".

## Correcoes Necessarias

### 1. Migração SQL -- Corrigir politica RLS de SELECT

Substituir a politica `institutions_select` para permitir que admins e managers vejam **todas** as instituicoes independente do status:

```sql
DROP POLICY IF EXISTS "institutions_select" ON public.institutions;
CREATE POLICY "institutions_select" ON public.institutions
  FOR SELECT USING (
    status = 'approved'
    OR submitted_by = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
  );
```

Politica PERMISSIVE conforme padrao do projeto.

### 2. Corrigir mapa de tipos em InstitutionsManagement.tsx

Adicionar `instituto_pesquisa: "Instituto de Pesquisa"` ao mapa `typeLabel` (linha 149), que atualmente nao inclui esse tipo.

### 3. Corrigir bug de duplicatas no InstitutionCombobox

Na funcao `handleManualSubmit`, ha um bug logico: na primeira vez que duplicatas sao encontradas, `duplicates` ainda esta vazio (o state nao atualizou), entao o retorno precoce nao funciona como esperado. Corrigir para usar o retorno de `checkDuplicates` diretamente.

## Arquivos Modificados

| Arquivo | Alteracao |
|---|---|
| Migracao SQL | Corrigir RLS SELECT para admins/managers verem todas as instituicoes |
| `src/pages/InstitutionsManagement.tsx` | Adicionar "Instituto de Pesquisa" ao mapa de tipos |
| `src/components/my-account/InstitutionCombobox.tsx` | Corrigir logica de verificacao de duplicatas |

