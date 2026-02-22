

# Menu do Usuario Unificado (Avatar Dropdown)

## Resumo

Refatorar o Header para ter um dropdown de usuario unificado, consistente para todos os perfis, com logout inteligente, integracao multi-organizacao e nova tela "Minha Conta".

---

## Mudancas Planejadas

### 1. Refatorar o Header (Avatar Dropdown)

**Arquivo:** `src/components/layout/Header.tsx`

- Remover o botao externo "Alterar senha" (o `<Button>` com `KeyRound` que fica ao lado do avatar)
- Reorganizar o dropdown com a seguinte estrutura:
  - **Cabecalho**: Avatar + Nome + Email + Chip do papel (ja existe, manter)
  - **Separador**
  - **Item**: Alterar senha (icone `KeyRound`, navega para `/alterar-senha`)
  - **Item**: Minha Conta (icone `Settings`, navega para nova rota `/minha-conta`)
  - **Separador**
  - **Item**: Sair - com estilo diferenciado (fundo cinza escuro, texto amarelo bold)
- Remover o item condicional mobile-only de "Alterar senha" (agora sempre aparece no dropdown)
- Adicionar atributos de acessibilidade: `aria-haspopup="menu"`, `aria-expanded`, `role="menu"`, `role="menuitem"`

### 2. Estilo do botao "Sair"

- Fundo: `bg-gray-800 dark:bg-gray-900`
- Texto: `text-yellow-400 font-bold`
- Hover: `hover:bg-gray-700`
- Remover o estilo `text-destructive` atual (vermelho)

### 3. Nova pagina "Minha Conta"

**Novo arquivo:** `src/pages/MyAccount.tsx`

- Layout padrao com Sidebar + Header + Footer
- Secoes em cards:
  - **Informacoes Pessoais**: Nome completo (readonly, vem do perfil), Email (readonly), Telefone (editavel via `upsert_sensitive_profile`)
  - **Informacoes Profissionais**: LinkedIn, Curriculo Lattes, Empresa/Instituicao, Cargo/Funcao (campos novos no perfil ou exibidos se ja existirem)
- Botao de salvar alteracoes
- Link de volta

### 4. Registrar rota da nova pagina

**Arquivo:** `src/App.tsx`

- Adicionar rota `/minha-conta` apontando para `MyAccount`
- Proteger com `ProtectedRoute` (qualquer usuario autenticado)

### 5. Logout inteligente

**Arquivo:** `src/components/layout/Header.tsx`

- No handler de logout, alem do `signOut()` existente:
  - Limpar `localStorage` de `bolsa_conecta_current_org`
  - Limpar qualquer outro cache de organizacao/permissoes
  - Manter o redirecionamento contextual ja existente (via `getLoginRouteForPath`)

### 6. Chip do papel baseado na organizacao ativa

**Arquivo:** `src/components/layout/Header.tsx`

- Importar `useOrganizationContext`
- Usar `currentMembership?.role` para determinar o label do chip no dropdown, em vez do `role` global do `useUserRole`
- Mapping: `admin` -> "Administrador", `manager` -> "Gestor", `auditor` -> "Auditor", default -> "Bolsista"

---

## Detalhes Tecnicos

### Estrutura do dropdown refatorado

```text
+----------------------------------+
| [Avatar 48px]  Nome do Usuario   |
|                email@exemplo.com |
|                [Chip: Gestor]    |
+----------------------------------+
| --- separador ---                |
| KeyRound  Alterar senha          |
| Settings  Minha Conta            |
| --- separador ---                |
| LogOut    Sair  (cinza+amarelo)  |
+----------------------------------+
```

### Arquivos modificados

| Arquivo | Acao |
|---|---|
| `src/components/layout/Header.tsx` | Refatorar dropdown, remover botao externo, logout inteligente |
| `src/pages/MyAccount.tsx` | Novo arquivo - tela Minha Conta |
| `src/App.tsx` | Adicionar rota `/minha-conta` |

### Observacoes

- Nao altera backend/banco de dados
- Reutiliza componentes shadcn/ui existentes (DropdownMenu, Avatar, Card, Input, Button)
- O roteamento pos-login nao sera alterado nesta fase (requer mudancas de rotas mais amplas com orgId na URL)
- O seletor de organizacao permanece na sidebar (ja funcional)
- Campos profissionais na tela Minha Conta serao exibidos como formulario, mas o salvamento dependera de colunas existentes na tabela `profiles` - campos que nao existem serao mostrados como "em breve"

