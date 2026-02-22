

# Padronizacao Visual do Botao "Sair" + Remocao do Campo "Cargo/Funcao"

## Resumo

Duas alteracoes pontuais: (1) padronizar o botao "Sair" no dropdown do usuario para usar o estilo primario do sistema, e (2) remover o campo "Cargo / Funcao" da pagina Minha Conta.

---

## Parte 1 -- Botao "Sair"

**Arquivo:** `src/components/layout/Header.tsx`

Substituir o estilo atual do `DropdownMenuItem` de logout (fundo cinza escuro + texto amarelo) pelo estilo primario do sistema (`bg-primary text-primary-foreground hover:bg-primary/90`).

**De:**
```text
className="bg-gray-800 dark:bg-gray-900 text-yellow-400 font-bold hover:!bg-gray-700 dark:hover:!bg-gray-800 focus:!bg-gray-700 focus:!text-yellow-400 rounded-md"
```

**Para:**
```text
className="bg-primary text-primary-foreground font-bold hover:!bg-primary/90 focus:!bg-primary/90 focus:!text-primary-foreground rounded-md"
```

Nenhuma alteracao funcional -- apenas visual.

---

## Parte 2 -- Remocao do Campo "Cargo / Funcao"

**Arquivo:** `src/pages/MyAccount.tsx`

Remover o bloco do campo "Cargo / Funcao" (linhas ~178-183 aproximadamente):

```text
<div className="space-y-2">
  <Label htmlFor="cargo">Cargo / Função</Label>
  <Input id="cargo" disabled placeholder="Em breve" className="bg-muted/50" />
  <p className="text-xs text-muted-foreground">Em breve — campo será salvo quando disponível no banco.</p>
</div>
```

Nenhuma alteracao no banco de dados. Dados existentes permanecem intactos.

---

## Arquivos Modificados

| Arquivo | Alteracao |
|---|---|
| `src/components/layout/Header.tsx` | Estilo do botao "Sair" para primario |
| `src/pages/MyAccount.tsx` | Remocao do campo "Cargo / Funcao" |

