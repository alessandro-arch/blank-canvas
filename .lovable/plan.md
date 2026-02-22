

# Exibir "Todas" para Admins com acesso global

## Problema
Membros com papel "admin" no sistema (`user_roles.role = 'admin'`) tem acesso a todas as organizacoes, mas a coluna "Organizacao" mostra apenas a org especifica onde o vinculo foi criado (ex: "TOMMASI"). Deveria exibir "Todas" para esses usuarios.

## Correcao

### 1. Edge Function `admin-list-members/index.ts`
Apos buscar os membros, consultar a tabela `user_roles` para identificar quais `user_id`s possuem `role = 'admin'` (admin do sistema). Para esses membros, substituir `organization_name` por `"Todas"`.

Alteracao:
- Buscar `user_roles` com `role = 'admin'` para os `userIds` da lista
- Criar um Set de `user_id`s que sao system admins
- No mapeamento final, se o `user_id` esta no Set, `organization_name = "Todas"`

### 2. Frontend `AdminMembersManagement.tsx`
Ajustar a exibicao da coluna Organizacao para destacar "Todas" com um badge visual diferente (ex: badge com icone de globo) quando o valor for "Todas".

### Resumo dos arquivos alterados
| Arquivo | Alteracao |
|---|---|
| `supabase/functions/admin-list-members/index.ts` | Verificar `user_roles` para admins e retornar "Todas" como `organization_name` |
| `src/components/admin-members/AdminMembersManagement.tsx` | Badge visual para "Todas" na coluna Organizacao |

