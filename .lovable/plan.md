

# Patch: Auditor Dashboard Zerado

## Problema
O Auditor loga com sucesso mas ve todos os KPIs zerados porque:
1. O `AuditorDashboard` nao filtra queries por `organization_id` (consulta global sem filtro)
2. As politicas RLS das tabelas `enrollments`, `projects`, `payments` e `reports` so permitem `admin` e `manager` -- o `auditor` recebe 0 linhas do Supabase
3. O tipo `OrganizationMember` no inclui `"auditor"` como role valido

## Correcoes

### Parte 1 -- Frontend: Tipo OrganizationMember (useOrganization.ts)
Adicionar `"auditor"` ao union type do role:
```
role: "owner" | "admin" | "manager" | "member" | "auditor"
```

### Parte 2 -- Frontend: AuditorDashboard com filtro por organizacao
- Importar `useOrganizationContext` 
- Obter `currentOrganization` do contexto
- Se `currentOrganization` for null, mostrar estado de erro amigavel
- Todas as queries passam a filtrar por `organization_id`:
  - `enrollments` -> join via `projects` -> `thematic_projects.organization_id`
  - `projects` -> join via `thematic_projects.organization_id`
  - `reports` -> filtra via profile org ou join
  - `payments` -> join via enrollment -> project -> thematic_project
- Para simplificar, usar a abordagem de buscar os `thematic_project_ids` da org e filtrar por eles

Fluxo das queries filtradas:
1. Buscar `thematic_projects` com `organization_id = currentOrg.id`
2. Buscar `projects` com `thematic_project_id IN (ids acima)`
3. Buscar `enrollments` com `project_id IN (project_ids)`
4. Buscar `payments` com `enrollment_id` dos enrollments da org
5. Buscar `monthly_reports` com `organization_id = currentOrg.id`

### Parte 3 -- RLS: Politicas SELECT para o Auditor
Criar politicas RLS novas (ou alterar existentes) para permitir SELECT ao auditor nas tabelas:

**enrollments** -- nova policy:
```sql
CREATE POLICY "Auditor can view org enrollments"
ON enrollments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN thematic_projects tp ON tp.organization_id = om.organization_id
    JOIN projects p ON p.thematic_project_id = tp.id
    WHERE p.id = enrollments.project_id
      AND om.user_id = auth.uid()
      AND om.role = 'auditor'
      AND om.is_active = true
  )
);
```

**projects** -- nova policy:
```sql
CREATE POLICY "Auditor can view org projects"
ON projects FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN thematic_projects tp ON tp.organization_id = om.organization_id
    WHERE tp.id = projects.thematic_project_id
      AND om.user_id = auth.uid()
      AND om.role = 'auditor'
      AND om.is_active = true
  )
);
```

**thematic_projects** -- nova policy:
```sql
CREATE POLICY "Auditor can view org thematic_projects"
ON thematic_projects FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = thematic_projects.organization_id
      AND om.user_id = auth.uid()
      AND om.role = 'auditor'
      AND om.is_active = true
  )
);
```

**payments** -- nova policy:
```sql
CREATE POLICY "Auditor can view org payments"
ON payments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN thematic_projects tp ON tp.organization_id = om.organization_id
    JOIN projects p ON p.thematic_project_id = tp.id
    JOIN enrollments e ON e.project_id = p.id
    WHERE e.id = payments.enrollment_id
      AND om.user_id = auth.uid()
      AND om.role = 'auditor'
      AND om.is_active = true
  )
);
```

**monthly_reports** -- nova policy:
```sql
CREATE POLICY "Auditor can view org monthly_reports"
ON monthly_reports FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = monthly_reports.organization_id
      AND om.user_id = auth.uid()
      AND om.role = 'auditor'
      AND om.is_active = true
  )
);
```

### Parte 4 -- Confirmacao de seguranca
- Auditor continua bloqueado de `bank_accounts`, `bank_accounts_public`, `profiles_sensitive` (sem alteracoes nessas tabelas)
- Nenhuma policy INSERT/UPDATE/DELETE sera criada para auditor
- Somente SELECT

### Resumo dos arquivos alterados
| Arquivo | Alteracao |
|---|---|
| `src/hooks/useOrganization.ts` | Adicionar "auditor" ao tipo role |
| `src/pages/AuditorDashboard.tsx` | Usar OrganizationContext, filtrar todas as queries por org, estado de erro |
| Nova migracao SQL | 5 novas politicas RLS de SELECT para auditor |

