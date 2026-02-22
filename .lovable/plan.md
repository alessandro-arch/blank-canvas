

# Adicionar Operacao de Bolsas para o Auditor

## Problema
O auditor nao tem acesso a pagina "Operacao de Bolsas". A pagina ja oculta a aba "Dados Bancarios" para auditores, mas faltam a rota e o item no menu lateral.

## Alteracoes

### 1. `src/App.tsx`
Adicionar rota `/auditor/operacao` protegida por `AuditorProtectedRoute`, reutilizando o componente `OperacaoBolsas`.

### 2. `src/components/layout/SidebarContent.tsx`
Adicionar "Operacao de Bolsas" no array `auditorNavigation`, com icone `Users` e href `/auditor/operacao`, posicionado apos "Painel do Auditor".

### 3. `src/pages/OperacaoBolsas.tsx`
Ajustar o grid do TabsList para `grid-cols-4` quando o auditor estiver logado (ja que a aba de Dados Bancarios e ocultada, ficam apenas 4 abas em vez de 5).

### Resumo

| Arquivo | Alteracao |
|---|---|
| `src/App.tsx` | Nova rota `/auditor/operacao` |
| `src/components/layout/SidebarContent.tsx` | Item "Operacao de Bolsas" no menu do auditor |
| `src/pages/OperacaoBolsas.tsx` | Grid responsivo 4 ou 5 colunas conforme role |

