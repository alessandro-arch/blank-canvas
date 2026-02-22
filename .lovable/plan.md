

# Melhorar cores do Painel do Auditor

## Problema
O dashboard do auditor esta visualmente apagado/claro comparado ao painel do Admin. Faltam cores nos KPI cards, badges e icones. O pill "Auditor" deve ser amarelo.

## Alteracoes

### 1. `src/pages/AuditorDashboard.tsx`

**KPI Cards** - Adicionar fundo colorido sutil nos cards (como no Admin), com borda esquerda colorida mais visivel:
- Cada card tera `bg-{color}/5` para dar um tom de fundo sutil
- Borda esquerda com `border-l-4` (mais grossa) em vez de `border-l-3`

**Badge "Somente Leitura"** - Trocar de `variant="outline"` (cinza claro) para um estilo com fundo amarelo sutil (`bg-yellow-100 text-yellow-800 border-yellow-300`)

**Badge "Auditor"** - Ja esta amarelo (`bg-yellow-500`), manter

**Badge da Organizacao** - Dar mais destaque com fundo primario sutil (`bg-primary/10 text-primary border-primary/30`)

**Icone Eye** - Trocar de `text-primary` para `text-yellow-600` para alinhar com a identidade do auditor

**Titulo e subtitulo** - Manter como esta (ja esta bom)

**Grafico** - Usar cor amarela/amber (`hsl(45, 93%, 47%)`) nas barras em vez de primary (azul escuro), para diferenciar do admin e dar mais vida

### 2. `src/components/layout/SidebarContent.tsx`
O pill "Auditor" na sidebar ja esta correto (`bg-yellow-500 text-white`). Nenhuma alteracao necessaria.

### Resumo dos arquivos alterados

| Arquivo | Alteracao |
|---|---|
| `src/pages/AuditorDashboard.tsx` | Cores mais vibrantes nos KPIs, badges, grafico e icones |
