import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const ALLOWED_ORIGINS = [
  "https://sisconnecta.lovable.app",
  "https://www.innovago.app",
  "https://bolsago.innovago.app",
  "https://boundless-start-art.lovable.app",
  "https://id-preview--2b9d72d4-676d-41a6-bf6b-707f4c8b4527.lovable.app",
  "https://id-preview--48549f0c-244e-46f3-bcfd-486dcaec8bc7.lovable.app",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

function generateMessageEmail(
  recipientName: string,
  subject: string,
  body: string,
  senderName: string,
  logoUrl: string,
  isSystem: boolean = false
): string {
  const bodyHtml = body.replace(/\n/g, '<br/>');
  const emoji = isSystem ? '🔔' : '💬';
  const headerTitle = isSystem ? 'Notificação do Sistema' : 'Nova Mensagem';
  const fromLabel = isSystem ? 'Sistema BolsaGO' : senderName;
  
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject} | BolsaGO</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <div style="display: none; max-height: 0; overflow: hidden;">
    ${subject} - BolsaGO
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px;">
          <!-- Header -->
          <tr>
            <td style="background-color: #003366; border-radius: 8px 8px 0 0; padding: 24px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <img src="${logoUrl}" alt="InnovaGO" style="max-height: 40px; width: auto;" />
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="font-size: 12px; color: #ffffff; opacity: 0.9;">BolsaGO</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Title -->
          <tr>
            <td style="background-color: #ffffff; padding: 32px 32px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align: middle;">
                    <h1 style="margin: 0; font-size: 22px; font-weight: 600; color: #003366; line-height: 1.3;">
                      ${headerTitle}
                    </h1>
                    <p style="margin: 8px 0 0 0; font-size: 14px; color: #666666;">
                      De: <strong>${fromLabel}</strong>
                    </p>
                  </td>
                  <td width="64" align="right" style="vertical-align: middle;">
                    <div style="width: 56px; height: 56px; background-color: #e6f3ff; border-radius: 50%; text-align: center; line-height: 56px;">
                      <span style="font-size: 28px;">${emoji}</span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Subject -->
          <tr>
            <td style="background-color: #ffffff; padding: 0 32px 16px;">
              <p style="margin: 0; font-size: 18px; font-weight: 600; color: #333333;">
                ${subject}
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background-color: #ffffff; padding: 0 32px 32px;">
              <div style="background-color: #fafafa; border: 1px solid #e8e8e8; border-radius: 8px; padding: 24px;">
                <p style="margin: 0; font-size: 15px; color: #333333; line-height: 1.7;">
                  ${bodyHtml}
                </p>
              </div>
            </td>
          </tr>
          <!-- CTA -->
          <tr>
            <td style="background-color: #ffffff; padding: 0 32px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color: #003366; border-radius: 6px;">
                    <a href="https://bolsago.lovable.app/bolsista/mensagens" target="_blank" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600;">
                      Ver no BolsaGO
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #003366; border-radius: 0 0 8px 8px; padding: 24px 32px;">
              <p style="margin: 0; font-size: 12px; color: #ffffff; opacity: 0.8; line-height: 1.5;">
                © InnovaGO – Sistema de Gestão de Bolsas em Pesquisa e Desenvolvimento<br />
                <a href="https://www.innovago.app" style="color: #ffffff; text-decoration: underline;">www.innovago.app</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function getEmailTemplate(supabaseAdmin: any, orgId: string | null): Promise<string | null> {
  try {
    // Try to find a default template for the org first
    if (orgId) {
      const { data } = await supabaseAdmin
        .from('message_templates')
        .select('html_template')
        .eq('organization_id', orgId)
        .eq('is_default', true)
        .not('html_template', 'is', null)
        .limit(1)
        .single();
      if (data?.html_template) return data.html_template;
    }

    // Fallback to any default template
    const { data } = await supabaseAdmin
      .from('message_templates')
      .select('html_template')
      .eq('is_default', true)
      .not('html_template', 'is', null)
      .limit(1)
      .single();
    if (data?.html_template) return data.html_template;
  } catch {
    // No template found, use hardcoded fallback
  }
  return null;
}

function applyTemplate(
  template: string,
  vars: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    const placeholder = `{{${key}}}`;
    while (result.includes(placeholder)) {
      result = result.replace(placeholder, value);
    }
  }
  return result;
}

async function sendEmailForMessage(
  supabaseAdmin: any,
  messageId: string,
  recipientEmail: string,
  recipientName: string,
  subject: string,
  body: string,
  senderName: string,
  logoUrl: string,
  isSystem: boolean,
  orgId: string | null = null
) {
  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      await supabaseAdmin.from('messages').update({ email_status: 'failed', email_error: 'RESEND_API_KEY not configured' }).eq('id', messageId);
      return false;
    }

    const resend = new Resend(resendApiKey);

    // Try to use a DB template first
    const dbTemplate = await getEmailTemplate(supabaseAdmin, orgId);
    
    const bodyHtml = body.replace(/\n/g, '<br/>');
    let html: string;

    if (dbTemplate) {
      html = applyTemplate(dbTemplate, {
        subject,
        body: bodyHtml,
        recipient_name: recipientName,
        sender_name: senderName,
        logo_url: logoUrl,
        org_name: 'InnovaGO',
        cta_url: 'https://bolsago.lovable.app/bolsista/mensagens',
        cta_text: 'Ver no BolsaGO',
        footer_text: '© InnovaGO – Sistema de Gestão de Bolsas em Pesquisa e Desenvolvimento<br /><a href="https://www.innovago.app" style="color: #ffffff; text-decoration: underline;">www.innovago.app</a>',
      });
    } else {
      html = generateMessageEmail(recipientName, subject, body, senderName, logoUrl, isSystem);
    }

    const { error: emailError } = await resend.emails.send({
      from: 'BolsaGO <contato@innovago.app>',
      to: [recipientEmail],
      subject: `${subject} • BolsaGO`,
      html,
    });

    if (emailError) {
      console.error('Resend error:', emailError);
      await supabaseAdmin.from('messages').update({ 
        email_status: 'failed', 
        email_error: JSON.stringify(emailError).substring(0, 500) 
      }).eq('id', messageId);
      return false;
    }

    await supabaseAdmin.from('messages').update({ email_status: 'sent' }).eq('id', messageId);
    return true;
  } catch (err) {
    console.error('Email send error:', err);
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    await supabaseAdmin.from('messages').update({ email_status: 'failed', email_error: errorMsg.substring(0, 500) }).eq('id', messageId);
    return false;
  }
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify the sender is authenticated and is a manager/admin
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isManagerOrAdmin = roles?.some(r => r.role === 'manager' || r.role === 'admin');
    if (!isManagerOrAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: only managers/admins can send messages' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { recipient_id, subject, body, link_url, organization_id: reqOrgId } = await req.json();

    if (!recipient_id || !subject || !body) {
      return new Response(JSON.stringify({ error: 'Missing required fields: recipient_id, subject, body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Get recipient profile
    const { data: recipientProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email, organization_id')
      .eq('user_id', recipient_id)
      .single();

    if (!recipientProfile?.email) {
      return new Response(JSON.stringify({ error: 'Recipient not found or has no email' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Get sender profile
    const { data: senderProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .single();

    const senderName = 'Equipe de Gestão';
    const recipientName = recipientProfile.full_name || 'Bolsista';

    // Use org_id from request if provided; otherwise resolve from recipient
    let orgId: string | null = reqOrgId || null;
    if (!orgId) {
      const { data: enrollmentOrg } = await supabaseAdmin
        .from('enrollments')
        .select('project_id')
        .eq('user_id', recipient_id)
        .limit(1)
        .single();
      
      if (enrollmentOrg) {
        const { data: projectData } = await supabaseAdmin
          .from('projects')
          .select('thematic_project_id')
          .eq('id', enrollmentOrg.project_id)
          .single();
        if (projectData) {
          const { data: tpData } = await supabaseAdmin
            .from('thematic_projects')
            .select('organization_id')
            .eq('id', projectData.thematic_project_id)
            .single();
          orgId = tpData?.organization_id || null;
        }
      }
    }

    // Insert message into database with new fields
    const { data: insertedMessage, error: insertError } = await supabaseAdmin
      .from('messages')
      .insert({
        sender_id: user.id,
        recipient_id,
        subject,
        body,
        type: 'GESTOR',
        event_type: 'GENERAL',
        organization_id: orgId,
        link_url: link_url || null,
      })
      .select('id')
      .single();

    if (insertError || !insertedMessage) {
      console.error('Error inserting message:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to save message' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Check if org has email enabled
    let emailEnabled = true; // default to true
    if (orgId) {
      const { data: org } = await supabaseAdmin
        .from('organizations')
        .select('settings')
        .eq('id', orgId)
        .single();
      if (org?.settings && typeof org.settings === 'object') {
        const settings = org.settings as Record<string, any>;
        if (settings.email_notifications_enabled === false) {
          emailEnabled = false;
        }
      }
    }

    let emailSent = false;
    if (emailEnabled) {
      const logoUrl = `${supabaseUrl}/storage/v1/object/public/email-assets/logo-innovago.png?v=1`;
      emailSent = await sendEmailForMessage(
        supabaseAdmin,
        insertedMessage.id,
        recipientProfile.email,
        recipientName,
        subject,
        body,
        senderName,
        logoUrl,
        false,
        orgId
      );
    }

    console.log(`Message sent to ${recipientProfile.email} by ${senderName}, email: ${emailSent}`);

    return new Response(
      JSON.stringify({ success: true, email_sent: emailSent }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error('Error in send-message-email:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor.' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
