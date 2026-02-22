

# Corrigir visualizacao de documentos do Projeto Tematico para Auditor

## Problema

O bucket de storage `documentos-projetos` so permite SELECT para `manager` e `admin`. Quando o auditor clica "Visualizar", o `createSignedUrl` falha com erro de permissao, e o frontend mostra "Erro ao abrir documento. O arquivo pode nao existir mais."

Alem disso, o botao "Substituir" (upload) aparece para o auditor, o que nao deveria.

## Correcoes

### 1. Migracao SQL - Adicionar politica de leitura no Storage para auditor

Criar nova politica SELECT no bucket `documentos-projetos` para auditors:

```text
CREATE POLICY "Auditors can view project docs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documentos-projetos'
  AND public.has_role(auth.uid(), 'auditor'::public.app_role)
);
```

O escopo organizacional ja e garantido pela RLS da tabela `thematic_projects` -- o auditor so consegue ver projetos da sua organizacao, portanto so tera acesso aos file_paths de documentos permitidos.

### 2. Frontend - Esconder botao "Substituir" para auditor

**Arquivo:** `src/components/projects/ProjectDocumentsSection.tsx`

- Adicionar prop `readOnly?: boolean` na interface
- Quando `readOnly = true`:
  - Esconder botao "Substituir"
  - Esconder input de upload
  - Esconder botao "Enviar PDF" (estado sem documento)
  - Manter botao "Visualizar" funcionando normalmente

**Arquivo:** `src/pages/ThematicProjectDetail.tsx`

- Importar `useUserRole` (se ainda nao importado)
- Passar `readOnly={isAuditor}` ao componente `ProjectDocumentsSection` quando renderizado na pagina de detalhe

### Resumo

| Camada | Recurso | Alteracao |
|--------|---------|-----------|
| Storage | `documentos-projetos` | Nova politica SELECT para auditor |
| Frontend | `ProjectDocumentsSection.tsx` | Prop `readOnly` para esconder upload/substituir |
| Frontend | `ThematicProjectDetail.tsx` | Passar `readOnly={isAuditor}` |

### Sem regressao

A nova politica de storage e aditiva (PERMISSIVE). A prop `readOnly` tem default `false`, mantendo o comportamento atual para admin/manager.
