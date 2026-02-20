import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-request-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FROM_EMAIL = 'BolsaGo <contato@innovago.app>';

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  manager: 'Gestor',
  reviewer: 'Avaliador',
  beneficiary: 'Proponente',
};

Deno.serve(async (req) => {
  

  function jsonRes(body: Record<string, unknown>, status: number) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  let inviteId: string | null = null;

  try {
    // 1. Authenticate caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonRes({ error: 'Unauthorized' }, 401);
    }

    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return jsonRes({ error: 'Unauthorized' }, 401);
    }
    const callerUserId = user.id;

    // 2. Parse input
    const body = await req.json();
    inviteId = body.invite_id;
    if (!inviteId) {
      return jsonRes({ error: 'invite_id is required' }, 400);
    }

    // 3. Fetch invite
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('organization_invites')
      .select('id, organization_id, invited_email, role, token, expires_at, status, send_attempts')
      .eq('id', inviteId)
      .single();

    if (inviteError || !invite) {
      return jsonRes({ error: 'Convite nao encontrado' }, 404);
    }

    // 4. Validate status
    if (invite.status !== 'pending') {
      return jsonRes({ error: 'Convite nao esta pendente.' }, 400);
    }

    if (new Date(invite.expires_at) < new Date()) {
      await supabaseAdmin.from('organization_invites')
        .update({ status: 'expired' })
        .eq('id', inviteId);
      return jsonRes({ error: 'Convite expirado. Gere um novo convite.' }, 400);
    }

    // 5. Verify caller is admin
    const { data: memberCheck } = await supabaseAdmin
      .from('organization_members')
      .select('id')
      .eq('user_id', callerUserId)
      .eq('organization_id', invite.organization_id)
      .eq('role', 'admin')
      .eq('is_active', true)
      .maybeSingle();

    const { data: globalAdmin } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('user_id', callerUserId)
      .eq('role', 'admin')
      .maybeSingle();

    if (!memberCheck && !globalAdmin) {
      return jsonRes({ error: 'Apenas admin pode enviar convites.' }, 403);
    }

    // 6. Increment send_attempts
    const newAttempts = (invite.send_attempts || 0) + 1;
    await supabaseAdmin.from('organization_invites')
      .update({ send_attempts: newAttempts })
      .eq('id', inviteId);

    // 7. Resolve APP_URL
    let appUrl = Deno.env.get('APP_URL');
    if (!appUrl) {
      const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/+$/, '').split('/').slice(0, 3).join('/');
      if (origin) {
        appUrl = origin;
      } else {
        // Record failure
        await supabaseAdmin.from('organization_invites')
          .update({ send_error: 'APP_URL nao configurado.' })
          .eq('id', inviteId);
        console.error('APP_URL not configured. Set the APP_URL secret.');
        return jsonRes({ error: 'Configuração do servidor incompleta.' }, 500);
      }
    }

    // 8. Check RESEND_API_KEY
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      await supabaseAdmin.from('organization_invites')
        .update({ send_error: 'RESEND_API_KEY nao configurado.' })
        .eq('id', inviteId);
      return jsonRes({ error: 'Servico de e-mail nao configurado.' }, 500);
    }

    // 9. Fetch org name
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('id', invite.organization_id)
      .single();
    const orgName = org?.name || 'Organizacao';

    // 10. Build email
    const roleLabel = roleLabels[invite.role] || invite.role;
    const expiresDate = new Date(invite.expires_at).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    const inviteLink = `${appUrl}/convite?token=${invite.token}`;
    const logoUrl = `${supabaseUrl}/storage/v1/object/public/email-assets/logo-innovago.png?v=1`;

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Convite BolsaGo</title></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;">
<tr><td align="center" style="padding:40px 20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
<tr><td style="background-color:#003366;border-radius:8px 8px 0 0;padding:24px 32px;">
<table role="presentation" width="100%"><tr>
<td><img src="${logoUrl}" alt="InnovaGO" style="max-height:40px;width:auto;" /></td>
<td align="right" style="vertical-align:middle;"><span style="font-size:12px;color:#fff;opacity:0.9;">BolsaGo</span></td>
</tr></table></td></tr>
<tr><td style="background-color:#fff;padding:32px;">
<h1 style="margin:0 0 16px;font-size:22px;color:#003366;">Convite para ${orgName}</h1>
<p style="margin:0 0 16px;font-size:15px;color:#333;line-height:1.7;">
Ola! Voce foi convidado(a) para acessar a plataforma <strong>BolsaGo</strong> como <strong>${roleLabel}</strong> da organizacao <strong>${orgName}</strong>.
</p>
<p style="margin:0 0 16px;font-size:15px;color:#333;line-height:1.7;">
Clique no botao abaixo para aceitar o convite e criar sua conta (caso ainda nao tenha).
</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr>
<td style="background-color:#003366;border-radius:6px;">
<a href="${inviteLink}" target="_blank" style="display:inline-block;padding:14px 32px;color:#fff;text-decoration:none;font-size:15px;font-weight:600;">Aceitar Convite</a>
</td></tr></table>
<p style="margin:0 0 8px;font-size:13px;color:#666;">Este convite expira em: <strong>${expiresDate}</strong></p>
<hr style="border:none;border-top:1px solid #eee;margin:16px 0;" />
<p style="margin:0 0 4px;font-size:12px;color:#999;">Se voce nao solicitou este convite, pode ignorar este e-mail com seguranca.</p>
<p style="margin:0;font-size:11px;color:#bbb;">Seus dados serao tratados exclusivamente para gestao de acesso e governanca do programa, conforme a LGPD.</p>
</td></tr>
<tr><td style="background-color:#003366;border-radius:0 0 8px 8px;padding:24px 32px;">
<p style="margin:0;font-size:12px;color:#fff;opacity:0.8;">InnovaGO. Sistema de Gestao de Bolsas<br/>
<a href="https://www.innovago.app" style="color:#fff;text-decoration:underline;">www.innovago.app</a></p>
</td></tr>
</table></td></tr></table></body></html>`;

    // 11. Send via Resend
    const resend = new Resend(resendApiKey);
    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [invite.invited_email],
      subject: `Convite para acessar o BolsaGo. InnovaGO`,
      html,
    });

    if (emailError) {
      const errorMsg = typeof emailError === 'object' ? JSON.stringify(emailError).substring(0, 300) : String(emailError);
      console.error('Resend error:', errorMsg);

      await supabaseAdmin.from('organization_invites')
        .update({ send_error: errorMsg })
        .eq('id', inviteId);

      // Audit: failure
      await supabaseAdmin.from('audit_logs').insert({
        user_id: callerUserId,
        action: 'invite_email_failed',
        entity_type: 'organization_invite',
        entity_id: inviteId,
        organization_id: invite.organization_id,
        details: { role: invite.role, attempt: newAttempts },
      });

      return jsonRes({ error: 'Falha ao enviar e-mail.' }, 500);
    }

    // 12. Success: update tracking
    await supabaseAdmin.from('organization_invites')
      .update({
        email_sent_at: new Date().toISOString(),
        email_provider_id: emailResult?.id || null,
        send_error: null,
      })
      .eq('id', inviteId);

    // 13. Audit: success
    await supabaseAdmin.from('audit_logs').insert({
      user_id: callerUserId,
      action: 'invite_email_sent',
      entity_type: 'organization_invite',
      entity_id: inviteId,
      organization_id: invite.organization_id,
      details: {
        role: invite.role,
        provider_id: emailResult?.id || null,
        attempt: newAttempts,
      },
    });

    return jsonRes({ success: true, message_id: emailResult?.id }, 200);
  } catch (error: unknown) {
    console.error('send-org-invite-email error:', error);
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';

    // Try to record error on invite
    if (inviteId) {
      try {
        await supabaseAdmin.from('organization_invites')
          .update({ send_error: errorMsg.substring(0, 300) })
          .eq('id', inviteId);
      } catch (_) { /* best effort */ }
    }

    return jsonRes({ error: 'Erro interno do servidor.' }, 500);
  }
});
