

# Corrigir Parecer IA e acesso a campos de relatorio para Auditor

## Problema
O auditor consegue ver a lista de relatorios mensais, mas:
1. **Parecer da IA nao aparece** - a tabela `monthly_report_ai_outputs` so tem politicas SELECT para admin/manager e bolsista. O auditor nao consegue ler os dados, e o painel mostra "Nenhum parecer disponivel".
2. **Campos do relatorio nao carregam** - a tabela `monthly_report_fields` tambem nao tem politica SELECT para auditor, impedindo a visualizacao dos dados preenchidos pelo bolsista.

## Alteracoes

### 1. Politica RLS em `monthly_report_ai_outputs`
Criar politica SELECT para auditor, escopada pela organizacao via `monthly_reports`:

```text
CREATE POLICY "Auditor can view org ai_outputs"
ON public.monthly_report_ai_outputs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM monthly_reports mr
    JOIN organization_members om
      ON om.organization_id = mr.organization_id
    WHERE mr.id = monthly_report_ai_outputs.report_id
      AND om.user_id = auth.uid()
      AND om.role = 'auditor'
      AND om.is_active = true
  )
);
```

### 2. Politica RLS em `monthly_report_fields`
Criar politica SELECT para auditor:

```text
CREATE POLICY "Auditor can view org report_fields"
ON public.monthly_report_fields FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM monthly_reports mr
    JOIN organization_members om
      ON om.organization_id = mr.organization_id
    WHERE mr.id = monthly_report_fields.report_id
      AND om.user_id = auth.uid()
      AND om.role = 'auditor'
      AND om.is_active = true
  )
);
```

### 3. Politica RLS em `monthly_report_documents` (para consistencia)
Adicionar SELECT para auditor, caso algum fluxo futuro consulte esta tabela no client-side:

```text
CREATE POLICY "Auditor can view org report_documents"
ON public.monthly_report_documents FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM monthly_reports mr
    JOIN organization_members om
      ON om.organization_id = mr.organization_id
    WHERE mr.id = monthly_report_documents.report_id
      AND om.user_id = auth.uid()
      AND om.role = 'auditor'
      AND om.is_active = true
  )
);
```

### 4. Politica RLS em `monthly_report_versions` (para consistencia)
Adicionar SELECT para auditor:

```text
CREATE POLICY "Auditor can view org report_versions"
ON public.monthly_report_versions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM monthly_reports mr
    JOIN organization_members om
      ON om.organization_id = mr.organization_id
    WHERE mr.id = monthly_report_versions.report_id
      AND om.user_id = auth.uid()
      AND om.role = 'auditor'
      AND om.is_active = true
  )
);
```

## Resumo

| Recurso | Tabela | Alteracao |
|---|---|---|
| Parecer IA | `monthly_report_ai_outputs` | Nova politica SELECT para auditor |
| Campos do relatorio | `monthly_report_fields` | Nova politica SELECT para auditor |
| Documentos PDF | `monthly_report_documents` | Nova politica SELECT para auditor |
| Versoes | `monthly_report_versions` | Nova politica SELECT para auditor |

Todas as politicas sao PERMISSIVE, somente leitura (SELECT), e escopadas pela organizacao do auditor.
