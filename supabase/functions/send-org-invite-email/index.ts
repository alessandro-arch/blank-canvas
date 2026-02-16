import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Authenticate caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const callerUserId = user.id;

    const { invite_id } = await req.json();
    if (!invite_id) {
      return new Response(JSON.stringify({ error: 'invite_id is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Fetch invite details
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('organization_invites')
      .select('id, organization_id, invited_email, role, token, expires_at, status')
      .eq('id', invite_id)
      .single();

    if (inviteError || !invite) {
      return new Response(JSON.stringify({ error: 'Invite not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Verify caller is admin of this organization
    const { data: memberCheck } = await supabaseAdmin
      .from('organization_members')
      .select('id')
      .eq('user_id', callerUserId)
      .eq('organization_id', invite.organization_id)
      .eq('role', 'admin')
      .eq('is_active', true)
      .maybeSingle();

    // Also check global admin role
    const { data: globalAdmin } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('user_id', callerUserId)
      .eq('role', 'admin')
      .maybeSingle();

    if (!memberCheck && !globalAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: only org admins can send invite emails' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Fetch organization name
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('id', invite.organization_id)
      .single();

    const orgName = org?.name || 'Organização';

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      await supabaseAdmin.from('organization_invites').update({ send_error: 'RESEND_API_KEY not configured' }).eq('id', invite_id);
      return new Response(JSON.stringify({ error: 'Email service not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Format role label
    const roleLabels: Record<string, string> = {
      admin: 'Administrador',
      manager: 'Gestor',
      reviewer: 'Avaliador',
      beneficiary: 'Proponente',
    };
    const roleLabel = roleLabels[invite.role] || invite.role;

    // Format expiration
    const expiresDate = new Date(invite.expires_at).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    const inviteLink = `https://innovago.app/convite?token=${invite.token}`;
    const logoUrl = `${supabaseUrl}/storage/v1/object/public/email-assets/logo-innovago.png?v=1`;

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Convite InnovaGO</title></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;">
<tr><td align="center" style="padding:40px 20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
<tr><td style="background-color:#003366;border-radius:8px 8px 0 0;padding:24px 32px;">
<table role="presentation" width="100%"><tr>
<td><img src="${logoUrl}" alt="InnovaGO" style="max-height:40px;width:auto;" /></td>
<td align="right" style="vertical-align:middle;"><span style="font-size:12px;color:#fff;opacity:0.9;">BolsaGO</span></td>
</tr></table></td></tr>
<tr><td style="background-color:#fff;padding:32px;">
<h1 style="margin:0 0 16px;font-size:22px;color:#003366;">📩 Convite para ${orgName}</h1>
<p style="margin:0 0 16px;font-size:15px;color:#333;line-height:1.7;">
Você foi convidado(a) para acessar a plataforma <strong>InnovaGO</strong> como <strong>${roleLabel}</strong> da organização <strong>${orgName}</strong>.
</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr>
<td style="background-color:#003366;border-radius:6px;">
<a href="${inviteLink}" target="_blank" style="display:inline-block;padding:14px 32px;color:#fff;text-decoration:none;font-size:15px;font-weight:600;">Aceitar Convite</a>
</td></tr></table>
<p style="margin:0 0 8px;font-size:13px;color:#666;">⏰ Este convite expira em: <strong>${expiresDate}</strong></p>
<p style="margin:0;font-size:13px;color:#999;">Se você não solicitou este convite, pode ignorar este e-mail com segurança.</p>
</td></tr>
<tr><td style="background-color:#003366;border-radius:0 0 8px 8px;padding:24px 32px;">
<p style="margin:0;font-size:12px;color:#fff;opacity:0.8;">© InnovaGO – Sistema de Gestão de Bolsas<br/>
<a href="https://www.innovago.app" style="color:#fff;text-decoration:underline;">www.innovago.app</a></p>
</td></tr>
</table></td></tr></table></body></html>`;

    const resend = new Resend(resendApiKey);
    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: 'InnovaGO <contato@innovago.app>',
      to: [invite.invited_email],
      subject: `Convite para acessar a InnovaGO (${orgName})`,
      html,
    });

    if (emailError) {
      console.error('Resend error:', emailError);
      await supabaseAdmin.from('organization_invites').update({
        send_error: JSON.stringify(emailError).substring(0, 500),
      }).eq('id', invite_id);
      return new Response(JSON.stringify({ error: 'Email send failed', details: emailError }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Update invite with email tracking
    await supabaseAdmin.from('organization_invites').update({
      email_sent_at: new Date().toISOString(),
      email_provider_id: emailResult?.id || null,
      send_error: null,
    }).eq('id', invite_id);

    // Audit log
    await supabaseAdmin.from('audit_logs').insert({
      user_id: callerUserId,
      action: 'invite_email_sent',
      entity_type: 'organization_invite',
      entity_id: invite_id,
      organization_id: invite.organization_id,
      details: { email: invite.invited_email, role: invite.role },
      user_email: user.email,
    });

    console.log(`Invite email sent to ${invite.invited_email} for invite ${invite_id}`);

    return new Response(JSON.stringify({ success: true, message_id: emailResult?.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('send-org-invite-email error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
