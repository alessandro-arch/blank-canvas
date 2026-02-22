

# Configurar E-mail de Confirmação Personalizado (BolsaGO)

## Problema
O Supabase está enviando o e-mail de confirmação de conta padrão (em inglês, sem branding, vindo de noreply@mail.app.supabase.io). O projeto já possui uma Edge Function `send-confirmation-email` com um template profissional alinhado à marca InnovaGO, mas ela não está sendo acionada.

## Causa Raiz
O **Auth Email Hook** do Supabase não está configurado para direcionar os e-mails de autenticação para a Edge Function customizada.

## Solução

### Passo 1 — Configurar o Auth Hook no Supabase Dashboard (ação manual do usuário)

Acessar o painel do Supabase e configurar o hook:

1. Ir para **Authentication > Hooks** no dashboard do Supabase
2. Localizar o hook **"Send Email"** (ou "Custom Email Sender")
3. Ativar o hook e configurar:
   - **Type**: HTTP Request
   - **URL**: `https://rykbyzediigwcstuzvnf.supabase.co/functions/v1/send-confirmation-email`
   - **HTTP Headers**: Adicionar o header `Authorization: Bearer` com a chave `service_role` do projeto (encontrada em Settings > API)
4. Salvar

### Passo 2 — Ajustar a Edge Function para lidar com o formato do Auth Hook

O Auth Hook do Supabase envia o payload com uma assinatura de webhook (usando `standardwebhooks`). A função `send-confirmation-email` atual faz parse simples do JSON sem verificar a assinatura. Precisamos:

- Adicionar suporte ao header de verificação do webhook (usando a secret `SEND_EMAIL_HOOK_SECRET` que o Supabase configura)
- Alternativamente, manter o parse simples de JSON se a verificação de assinatura não for obrigatória (depende da configuração do hook)

A função atual já está preparada para o payload correto (`user.email`, `email_data.token_hash`, etc.), então o ajuste é mínimo.

### Passo 3 — Garantir que a secret SEND_EMAIL_HOOK_SECRET está configurada

Verificar se a secret está presente nas configurações das Edge Functions do Supabase. Se não estiver, será necessário adicioná-la (o valor é gerado automaticamente pelo Supabase ao ativar o hook).

### Passo 4 — Expandir o suporte a outros tipos de e-mail

A função atual só trata `signup` e `email_change`. Para cobrir todos os cenários de autenticação do auditor (e outros perfis), expandir para incluir:
- `recovery` (redefinição de senha)
- `magic_link` (se aplicável)

Criar templates HTML adicionais para cada tipo, mantendo o mesmo padrão visual.

## Resultado Esperado
- E-mails de confirmação enviados com a marca BolsaGO/InnovaGO
- Template em português (PT-BR)
- Remetente: `InnovaGO <noreply@bolsaconecta.com.br>` (via Resend)
- Design institucional com logo, cores e rodapé da plataforma

## Resumo Técnico

| Item | Detalhe |
|------|---------|
| Função existente | `send-confirmation-email` (já deployada, verify_jwt = false) |
| Template | HTML institucional com logo InnovaGO, cores #003366, em PT-BR |
| Serviço de envio | Resend (RESEND_API_KEY já configurada) |
| Remetente | noreply@bolsaconecta.com.br |
| Ação necessária do usuário | Configurar Auth Hook no dashboard do Supabase |
| Ajuste no código | Adicionar suporte a verificacao webhook e templates para `recovery` |

