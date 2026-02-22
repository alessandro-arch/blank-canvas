import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-request-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildApprovedTemplate(logoUrl: string, name: string, subject: string, bodyHtml: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${subject} | BolsaGO</title></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;">
<tr><td align="center" style="padding:40px 20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
<tr><td style="background-color:#003366;border-radius:8px 8px 0 0;padding:24px 32px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td><img src="${logoUrl}" alt="InnovaGO" style="max-height:40px;width:auto;" /></td>
<td align="right" style="vertical-align:middle;"><span style="font-size:12px;color:#fff;opacity:0.9;">BolsaGO</span></td>
</tr></table></td></tr>
<tr><td style="background-color:#fff;padding:32px;">
<div style="text-align:center;margin-bottom:24px;">
<div style="display:inline-block;background-color:#e8f5e9;border-radius:50%;width:64px;height:64px;line-height:64px;font-size:32px;">✅</div>
</div>
<h1 style="margin:0 0 16px;font-size:22px;color:#2e7d32;text-align:center;">Relatório Aprovado!</h1>
<p style="margin:0 0 8px;font-size:14px;color:#666;">Olá, <strong>${name}</strong></p>
<div style="background-color:#e8f5e9;border:1px solid #c8e6c9;border-radius:8px;padding:24px;margin:16px 0;">
<p style="margin:0;font-size:15px;color:#333;line-height:1.7;">${bodyHtml}</p>
</div>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto 0;"><tr>
<td style="background-color:#2e7d32;border-radius:6px;">
<a href="https://bolsago.lovable.app/bolsista/relatorios" target="_blank" style="display:inline-block;padding:14px 32px;color:#fff;text-decoration:none;font-size:15px;font-weight:600;">Ver Meus Relatórios</a>
</td></tr></table>
</td></tr>
<tr><td style="background-color:#003366;border-radius:0 0 8px 8px;padding:24px 32px;">
<p style="margin:0;font-size:12px;color:#fff;opacity:0.8;">© InnovaGO – Sistema de Gestão de Bolsas<br/>
<a href="https://www.innovago.app" style="color:#fff;text-decoration:underline;">www.innovago.app</a></p>
</td></tr>
</table></td></tr></table></body></html>`;
}

function buildReturnedTemplate(logoUrl: string, name: string, subject: string, bodyHtml: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${subject} | BolsaGO</title></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;">
<tr><td align="center" style="padding:40px 20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
<tr><td style="background-color:#003366;border-radius:8px 8px 0 0;padding:24px 32px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td><img src="${logoUrl}" alt="InnovaGO" style="max-height:40px;width:auto;" /></td>
<td align="right" style="vertical-align:middle;"><span style="font-size:12px;color:#fff;opacity:0.9;">BolsaGO</span></td>
</tr></table></td></tr>
<tr><td style="background-color:#fff;padding:32px;">
<div style="text-align:center;margin-bottom:24px;">
<div style="display:inline-block;background-color:#fff3e0;border-radius:50%;width:64px;height:64px;line-height:64px;font-size:32px;">⚠️</div>
</div>
<h1 style="margin:0 0 16px;font-size:22px;color:#e65100;text-align:center;">Relatório Devolvido para Ajustes</h1>
<p style="margin:0 0 8px;font-size:14px;color:#666;">Olá, <strong>${name}</strong></p>
<div style="background-color:#fff3e0;border:1px solid #ffe0b2;border-radius:8px;padding:24px;margin:16px 0;">
<p style="margin:0;font-size:15px;color:#333;line-height:1.7;">${bodyHtml}</p>
</div>
<p style="margin:16px 0 0;font-size:13px;color:#666;">Por favor, revise as observações do gestor e reenvie o relatório corrigido.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto 0;"><tr>
<td style="background-color:#e65100;border-radius:6px;">
<a href="https://bolsago.lovable.app/bolsista/relatorios" target="_blank" style="display:inline-block;padding:14px 32px;color:#fff;text-decoration:none;font-size:15px;font-weight:600;">Revisar e Corrigir</a>
</td></tr></table>
</td></tr>
<tr><td style="background-color:#003366;border-radius:0 0 8px 8px;padding:24px 32px;">
<p style="margin:0;font-size:12px;color:#fff;opacity:0.8;">© InnovaGO – Sistema de Gestão de Bolsas<br/>
<a href="https://www.innovago.app" style="color:#fff;text-decoration:underline;">www.innovago.app</a></p>
</td></tr>
</table></td></tr></table></body></html>`;
}

function buildDefaultTemplate(logoUrl: string, name: string, subject: string, bodyHtml: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${subject} | BolsaGO</title></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;">
<tr><td align="center" style="padding:40px 20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
<tr><td style="background-color:#003366;border-radius:8px 8px 0 0;padding:24px 32px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td><img src="${logoUrl}" alt="InnovaGO" style="max-height:40px;width:auto;" /></td>
<td align="right" style="vertical-align:middle;"><span style="font-size:12px;color:#fff;opacity:0.9;">BolsaGO</span></td>
</tr></table></td></tr>
<tr><td style="background-color:#fff;padding:32px;">
<h1 style="margin:0 0 16px;font-size:22px;color:#003366;">🔔 Notificação do Sistema</h1>
<p style="margin:0 0 8px;font-size:14px;color:#666;">Olá, <strong>${name}</strong></p>
<p style="margin:0 0 16px;font-size:18px;font-weight:600;color:#333;">${subject}</p>
<div style="background-color:#fafafa;border:1px solid #e8e8e8;border-radius:8px;padding:24px;">
<p style="margin:0;font-size:15px;color:#333;line-height:1.7;">${bodyHtml}</p>
</div>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;"><tr>
<td style="background-color:#003366;border-radius:6px;">
<a href="https://bolsago.lovable.app/bolsista/mensagens" target="_blank" style="display:inline-block;padding:14px 32px;color:#fff;text-decoration:none;font-size:15px;font-weight:600;">Ver no BolsaGO</a>
</td></tr></table>
</td></tr>
<tr><td style="background-color:#003366;border-radius:0 0 8px 8px;padding:24px 32px;">
<p style="margin:0;font-size:12px;color:#fff;opacity:0.8;">© InnovaGO – Sistema de Gestão de Bolsas<br/>
<a href="https://www.innovago.app" style="color:#fff;text-decoration:underline;">www.innovago.app</a></p>
</td></tr>
</table></td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message_id, recipient_email, recipient_name, subject, body } = await req.json();

    if (!message_id || !recipient_email || !subject || !body) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      await supabase.from('messages').update({ email_status: 'failed', email_error: 'RESEND_API_KEY not configured' }).eq('id', message_id);
      return new Response(JSON.stringify({ error: 'No API key' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    // Lookup event_type from messages table
    let eventType: string | null = null;
    const { data: msgData } = await supabase
      .from('messages')
      .select('event_type')
      .eq('id', message_id)
      .single();
    if (msgData) {
      eventType = msgData.event_type;
    }

    const logoUrl = `${supabaseUrl}/storage/v1/object/public/email-assets/logo-innovago.png?v=1`;
    const bodyHtml = body.replace(/\n/g, '<br/>');
    const name = recipient_name || 'Bolsista';

    let html: string;

    if (eventType === 'MONTHLY_REPORT_APPROVED') {
      html = buildApprovedTemplate(logoUrl, name, subject, bodyHtml);
    } else if (eventType === 'MONTHLY_REPORT_RETURNED') {
      html = buildReturnedTemplate(logoUrl, name, subject, bodyHtml);
    } else {
      html = buildDefaultTemplate(logoUrl, name, subject, bodyHtml);
    }

    const resend = new Resend(resendApiKey);
    const { error: emailError } = await resend.emails.send({
      from: 'BolsaGO <contato@innovago.app>',
      to: [recipient_email],
      subject: `${subject} • BolsaGO`,
      html,
    });

    if (emailError) {
      console.error('Resend error:', emailError);
      await supabase.from('messages').update({ email_status: 'failed', email_error: JSON.stringify(emailError).substring(0, 500) }).eq('id', message_id);
      return new Response(JSON.stringify({ error: 'Email failed' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    await supabase.from('messages').update({ email_status: 'sent' }).eq('id', message_id);
    console.log(`System email sent to ${recipient_email} for message ${message_id} (event: ${eventType || 'default'})`);

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  } catch (error: unknown) {
    console.error('send-system-email error:', error);
    console.error('Detailed error:', error instanceof Error ? error.message : error);
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
