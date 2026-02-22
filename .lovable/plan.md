

# Selo de Verificada + Alerta de Rejeicao + E-mail

## Visao Geral

Tres melhorias no fluxo de instituicoes:

1. **Selo "Verificada"** nas instituicoes aprovadas (InstitutionCombobox e MyAccount)
2. **Alerta na pagina Minha Conta** quando a instituicao do usuario foi rejeitada
3. **E-mail ao usuario** quando sua instituicao e rejeitada pelo admin

---

## 1. Selo de Verificada no InstitutionCombobox

No componente `InstitutionCombobox`, ao exibir uma instituicao aprovada, mostrar um badge verde com icone de verificado:

- Status `approved` -> Badge verde "Verificada" com icone CheckCircle
- Status `pending` -> Badge amarelo "Pendente" (ja existe)
- Status `rejected` -> Badge vermelho "Rejeitada"

Arquivo: `src/components/my-account/InstitutionCombobox.tsx`
- Linha ~372: adicionar badges para `approved` e `rejected` alem do `pending` existente
- Na lista de resultados do combobox (~linha 397): exibir icone de verificado ao lado de instituicoes aprovadas

## 2. Alerta na pagina Minha Conta

Na pagina `MyAccount.tsx`, apos carregar os dados do perfil, verificar o status da instituicao do usuario. Se `rejected`, exibir um banner de alerta vermelho acima dos cards, com:
- Icone de alerta
- Texto: "Sua instituicao/empresa foi rejeitada. Motivo: [motivo]"
- Botao para cadastrar novamente

Para isso, buscar tambem `rejection_reason` da tabela `institutions` quando carregar a instituicao do usuario.

Arquivo: `src/pages/MyAccount.tsx`
- Adicionar estado para `rejectionReason`
- Na query de instituicao (linha ~60), incluir `rejection_reason` no select
- Renderizar banner de alerta quando `institutionData.status === "rejected"`

## 3. E-mail de rejeicao ao usuario

Quando o admin rejeita uma instituicao em `InstitutionsManagement.tsx`, enviar e-mail ao usuario que a cadastrou (campo `submitted_by`).

Fluxo:
1. No `handleReject`, apos atualizar o status, buscar o e-mail e nome do usuario via `submitted_by`
2. Criar uma notificacao na tabela `notifications` para o usuario
3. Chamar a edge function `send-system-email` para enviar e-mail com motivo da rejeicao

Arquivo: `src/pages/InstitutionsManagement.tsx`
- Apos o update bem-sucedido no `handleReject`:
  - Buscar perfil e e-mail do usuario (`submitted_by`)
  - Inserir registro na tabela `notifications`
  - Invocar `send-system-email` para envio de e-mail

Tambem: na aprovacao (`handleApprove`), criar notificacao informando que foi aprovada.

## 4. Notificacao in-app

Inserir na tabela `notifications` tanto na aprovacao quanto na rejeicao para que o sino de notificacoes mostre o evento ao usuario.

---

## Arquivos Modificados

| Arquivo | Alteracao |
|---|---|
| `src/components/my-account/InstitutionCombobox.tsx` | Adicionar badges de "Verificada" e "Rejeitada" |
| `src/pages/MyAccount.tsx` | Banner de alerta para instituicao rejeitada |
| `src/pages/InstitutionsManagement.tsx` | Enviar notificacao + e-mail na aprovacao e rejeicao |

Nenhuma migracao SQL necessaria (tabela `notifications` ja existe).

