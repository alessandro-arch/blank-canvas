
# Notificacoes Automaticas para Decisao de Relatorio Mensal

## Contexto Atual

O sistema ja possui:
- Trigger `notify_report_status_change` na tabela **legacy** `reports` (cria notificacao + mensagem inbox + dispara e-mail via `send-system-email`)
- Trigger `queue_system_message_email` na tabela `messages` que chama a Edge Function `send-system-email` via `net.http_post`
- Coluna `email_notifications_enabled` na tabela `organizations` para controle por org
- Funcoes RPC `approve_monthly_report` e `return_monthly_report` que ja gravam audit_logs mas **nao criam notificacoes**

O que falta: um trigger equivalente na tabela `monthly_reports` para gerar notificacao, mensagem inbox (que automaticamente dispara e-mail) e log de auditoria de notificacao.

## Plano de Implementacao

### Fase 1: Migration SQL (trigger + tabela de log)

Criar uma migration com:

1. **Tabela `notification_delivery_logs`** para auditoria de entregas:
   - `id` uuid PK
   - `user_id` uuid NOT NULL
   - `report_id` uuid NOT NULL (ref monthly_reports)
   - `status` text NOT NULL (approved, returned)
   - `sent_in_app` boolean DEFAULT false
   - `sent_email` boolean DEFAULT false
   - `created_at` timestamptz DEFAULT now()
   - Indice unico em `(report_id, status)` para prevenir duplicidade
   - RLS: leitura para admins/managers da org

2. **Funcao `notify_monthly_report_decision()`** (trigger AFTER UPDATE em monthly_reports):
   - Dispara quando `OLD.status != NEW.status` e `NEW.status IN ('approved', 'returned')`
   - Verifica duplicidade: se ja existe log para `(report_id, status)`, retorna sem agir
   - Monta titulo e mensagem com periodo formatado (ex: "Fevereiro/2026")
   - Insere na tabela `notifications` (notificacao bell)
   - Insere na tabela `messages` com `type = 'SYSTEM'` e `event_type` adequado (isso automaticamente aciona o trigger `queue_system_message_email` existente, que chama `send-system-email` via Resend)
   - Insere log na `notification_delivery_logs`
   - Respeita `organizations.email_notifications_enabled`

3. **Trigger** `trigger_notify_monthly_report_decision` AFTER UPDATE em `monthly_reports`

### Fase 2: Template de e-mail diferenciado (Edge Function)

Atualizar a Edge Function `send-system-email` para detectar `event_type` de relatorio mensal e usar templates HTML especificos:

- `MONTHLY_REPORT_APPROVED`: template verde com icone de aprovacao, link para `/bolsista/relatorios`
- `MONTHLY_REPORT_RETURNED`: template com alerta, exibindo motivo da devolucao, link para `/bolsista/relatorios`

Os dados dinamicos (nome do bolsista, periodo, projeto, comentarios do gestor) serao passados via campos da mensagem.

### Fase 3: Nenhuma alteracao no frontend

O componente `NotificationBell` ja consome a tabela `notifications` com real-time subscription, entao as notificacoes aparecerao automaticamente no sino do bolsista sem alteracao de codigo.

## Detalhes Tecnicos

### Trigger SQL (pseudocodigo)

```text
FUNCTION notify_monthly_report_decision()
  -- Skip if no status change
  IF OLD.status = NEW.status THEN RETURN NEW
  
  -- Only for final decisions
  IF NEW.status NOT IN ('approved', 'returned') THEN RETURN NEW
  
  -- Dedup check
  IF EXISTS(SELECT 1 FROM notification_delivery_logs 
            WHERE report_id = NEW.id AND status = NEW.status) THEN RETURN NEW
  
  -- Build message
  periodo = nome_mes(NEW.period_month) || '/' || NEW.period_year
  
  IF NEW.status = 'approved':
    titulo = 'Relatorio Mensal Aprovado'
    mensagem = 'Seu relatorio de {periodo} foi aprovado!'
    tipo_notif = 'success'
    event_type = 'MONTHLY_REPORT_APPROVED'
  ELSE: -- returned
    titulo = 'Relatorio Devolvido para Ajustes'
    mensagem = 'Seu relatorio de {periodo} foi devolvido. Motivo: {return_reason}'
    tipo_notif = 'warning'
    event_type = 'MONTHLY_REPORT_RETURNED'
  
  -- Bell notification
  INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id)
  VALUES (NEW.beneficiary_user_id, titulo, mensagem, tipo_notif, 'monthly_report', NEW.id)
  
  -- Inbox message (triggers email automatically via queue_system_message_email)
  INSERT INTO messages (recipient_id, sender_id, subject, body, type, event_type, 
                        link_url, organization_id)
  VALUES (NEW.beneficiary_user_id, NULL, titulo, mensagem, 'SYSTEM', event_type,
          '/bolsista/relatorios', NEW.organization_id)
  
  -- Delivery log
  INSERT INTO notification_delivery_logs (user_id, report_id, status, sent_in_app, sent_email)
  VALUES (NEW.beneficiary_user_id, NEW.id, NEW.status, true, v_email_enabled)
```

### Edge Function send-system-email

Adicionar deteccao do `event_type` via lookup na tabela `messages` para personalizar o template HTML quando for `MONTHLY_REPORT_APPROVED` ou `MONTHLY_REPORT_RETURNED`.

### Arquivos Modificados

| Arquivo | Alteracao |
|---------|-----------|
| Nova migration SQL | Tabela + funcao + trigger |
| `supabase/functions/send-system-email/index.ts` | Templates diferenciados por event_type |

### Sem alteracoes necessarias

| Arquivo | Motivo |
|---------|--------|
| `NotificationBell.tsx` | Ja consome notifications com real-time |
| `useNotifications.ts` | Ja funciona com qualquer notificacao |
| `MonthlyReportsReviewManagement.tsx` | Ja chama RPCs que alteram status |
