

## Correcao do Template de E-mail de Convite

### Problema Raiz

A variavel `APP_URL` (ou o header `origin`/`referer` usado como fallback) esta sendo resolvida **sem o protocolo `https://`**. Isso faz com que o `href` do botao fique como `bolsago.innovago.app/convite?token=...` em vez de `https://bolsago.innovago.app/convite?token=...`. Clientes de e-mail interpretam links sem protocolo como texto puro entre colchetes, nao como link clicavel.

### Alteracoes no arquivo `supabase/functions/send-org-invite-email/index.ts`

#### 1. Garantir protocolo HTTPS na URL (Problema 1)

Apos resolver `appUrl` (linha ~129), adicionar normalizacao para garantir que sempre comece com `https://`:

```text
// Remove trailing slash and ensure https://
appUrl = appUrl.replace(/\/+$/, '');
if (!/^https?:\/\//i.test(appUrl)) {
  appUrl = 'https://' + appUrl;
}
```

#### 2. Adicionar link de fallback abaixo do botao (Problema 1 - seguranca extra)

Apos a tabela do botao (linha ~183), inserir paragrafo com link em texto puro:

```text
<p style="margin:16px 0 0;font-size:12px;color:#888888;text-align:center;">
  Se o botao nao funcionar, copie e cole este link no navegador:<br/>
  <a href="${inviteLink}" style="color:#003366;word-break:break-all;font-size:11px;">${inviteLink}</a>
</p>
```

#### 3. Revisar contraste de textos (Problema 2)

O template atual ja usa `color:#ffffff` nos textos sobre fundo azul. Nenhuma alteracao necessaria neste ponto -- o problema visual reportado decorre do link quebrado, nao de cores.

#### 4. CSS inline (Problema 3)

O template atual ja usa 100% CSS inline e layout baseado em tabelas. Nenhuma alteracao necessaria.

### Resumo tecnico

| Item | Acao |
|------|------|
| Protocolo HTTPS | Normalizar `appUrl` para sempre incluir `https://` |
| Fallback textual | Adicionar link em texto puro abaixo do botao |
| Contraste cores | Ja correto, sem alteracao |
| CSS inline | Ja correto, sem alteracao |

Apos salvar, a Edge Function sera deployada automaticamente.

