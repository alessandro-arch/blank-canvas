

# Corrigir Badge do Auditor e Exibir Organizacao

## Problema
1. O badge do Auditor na sidebar usa `bg-accent text-accent-foreground` que resulta em um fundo cinza claro quase invisivel -- deveria ser amarelo como no painel de Membros Admin
2. A organizacao vinculada ao auditor precisa estar mais visivel no painel

## Correcoes

### 1. Badge amarelo "Auditor" na Sidebar (SidebarContent.tsx)
Alterar a classe do badge do auditor de `bg-accent text-accent-foreground` para `bg-yellow-500 text-white` (amarelo vibrante), mantendo o mesmo padrao visual do badge de "Auditor" na tela de Membros Admin.

**Linha 146 atual:**
```
hasManagerAccess ? "bg-primary text-primary-foreground" : isAuditor ? "bg-accent text-accent-foreground" : "bg-info text-white"
```

**Corrigido para:**
```
hasManagerAccess ? "bg-primary text-primary-foreground" : isAuditor ? "bg-yellow-500 text-white" : "bg-info text-white"
```

### 2. Organizacao visivel no dashboard do Auditor (AuditorDashboard.tsx)
Adicionar um badge/destaque com o nome da organizacao na area do cabecalho do painel, junto ao badge "Somente Leitura". A organizacao ja aparece na linha de subtitulo, mas sera reforcada com um badge visual dedicado com icone de Building2.

**Adicionar ao header (linhas 222-229):**
- Badge com icone Building2 e nome da organizacao em destaque
- Estilo visual claro para o auditor identificar rapidamente a org

### Resumo dos arquivos alterados
| Arquivo | Alteracao |
|---|---|
| `src/components/layout/SidebarContent.tsx` | Badge auditor amarelo (`bg-yellow-500 text-white`) |
| `src/pages/AuditorDashboard.tsx` | Badge com nome da organizacao no cabecalho |
