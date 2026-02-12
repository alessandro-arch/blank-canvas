import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);

const ALLOWED_ORIGINS = [
  "https://sisconnecta.lovable.app",
  "https://www.innovago.app",
  "https://id-preview--2b9d72d4-676d-41a6-bf6b-707f4c8b4527.lovable.app",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

function generateConfirmationEmail(userEmail: string, confirmationUrl: string, logoUrl?: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmação de E-mail | InnovaGO</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  
  <!-- Preheader text -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    Confirme seu e-mail para acessar o InnovaGO - Sistema de Gestão de Bolsas Institucionais
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        
        <!-- Main Container -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px;">
          
          <!-- Dark Header -->
          <tr>
            <td style="background-color: #003366; border-radius: 8px 8px 0 0; padding: 24px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    ${logoUrl 
                      ? `<img src="${logoUrl}" alt="InnovaGO" style="max-height: 40px; width: auto;" />`
                      : `<span style="font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: 1px;">InnovaGO</span>`
                    }
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="font-size: 12px; color: #ffffff; opacity: 0.9;">Gestão de Bolsas</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Title Section with Icon -->
          <tr>
            <td style="background-color: #ffffff; padding: 32px 32px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align: middle;">
                    <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #003366; line-height: 1.3;">
                      Confirmação de E-mail
                    </h1>
                  </td>
                  <td width="64" align="right" style="vertical-align: middle;">
                    <div style="width: 56px; height: 56px; background-color: #e6f3ff; border-radius: 50%; text-align: center; line-height: 56px;">
                      <span style="font-size: 28px;">✉️</span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Card -->
          <tr>
            <td style="background-color: #ffffff; padding: 0 32px 32px;">
              <div style="background-color: #fafafa; border: 1px solid #e8e8e8; border-radius: 8px; padding: 24px;">
                <p style="margin: 0 0 16px 0; font-size: 16px; color: #333333; line-height: 1.6;">
                  Olá,
                </p>
                <p style="margin: 0; font-size: 16px; color: #333333; line-height: 1.6;">
                  Bem-vindo(a) ao <strong>InnovaGO</strong>. Para ativar sua conta e acessar todos os recursos do portal de gestão de bolsas, por favor confirme seu endereço de e-mail clicando no botão abaixo.
                </p>
              </div>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="background-color: #ffffff; padding: 0 32px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color: #003366; border-radius: 6px;">
                    <a href="${confirmationUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600;">
                      Confirmar E-mail
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Security Notice Box -->
          <tr>
            <td style="background-color: #ffffff; padding: 0 32px 32px;">
              <div style="background-color: #e6f3ff; border-left: 4px solid #003366; border-radius: 0 8px 8px 0; padding: 16px 20px;">
                <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #003366;">
                  Informações de Segurança
                </p>
                <p style="margin: 0; font-size: 14px; color: #555555; line-height: 1.5;">
                  <strong>Validade do link:</strong> 1 hora<br />
                  Se você não solicitou este cadastro, ignore este e-mail.
                </p>
              </div>
            </td>
          </tr>

          <!-- Alternative Link -->
          <tr>
            <td style="background-color: #ffffff; padding: 0 32px 32px;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #666666;">
                Caso o botão não funcione, copie e cole o link abaixo no seu navegador:
              </p>
              <p style="margin: 0; font-size: 12px; color: #003366; word-break: break-all; line-height: 1.5;">
                ${confirmationUrl}
              </p>
            </td>
          </tr>

          <!-- Signature Section -->
          <tr>
            <td style="background-color: #ffffff; padding: 0 32px 32px; border-bottom: 1px solid #e8e8e8;">
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #333333;">
                Atenciosamente,
              </p>
              <p style="margin: 0; font-size: 15px; font-weight: 600; color: #003366;">
                Equipe InnovaGO
              </p>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #666666;">
                Sistema de Gestão de Bolsas Institucionais
              </p>
            </td>
          </tr>

          <!-- Blue Footer -->
          <tr>
            <td style="background-color: #003366; border-radius: 0 0 8px 8px; padding: 24px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #ffffff;">
                      Seu parceiro em inovação e conhecimento
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #ffffff; opacity: 0.8; line-height: 1.5;">
                      © InnovaGO – Sistema de Gestão de Bolsas Institucionais<br />
                      <a href="https://www.innovago.app" style="color: #ffffff; text-decoration: underline;">www.innovago.app</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

        <!-- Email Tips -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin-top: 24px;">
          <tr>
            <td align="center">
              <p style="margin: 0; font-size: 12px; color: #999999; line-height: 1.5;">
                E-mail não está na caixa de entrada? Verifique sua pasta de spam.
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>
  `;
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
    const payload = await req.text();
    let data;

    try {
      data = JSON.parse(payload);
    } catch {
      console.error('Failed to parse payload as JSON');
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('Received auth hook payload:', JSON.stringify(data, null, 2));

    const { user, email_data } = data;

    if (!user?.email || !email_data) {
      console.error('Missing required fields in payload');
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const { token_hash, redirect_to, email_action_type } = email_data;

    console.log(`Processing ${email_action_type} email for: ${user.email}`);

    if (email_action_type !== 'signup' && email_action_type !== 'email_change') {
      console.log(`Skipping email type: ${email_action_type}`);
      return new Response(
        JSON.stringify({ message: 'Email type not handled by this function' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const finalRedirectTo = redirect_to || `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/auth`;
    const confirmationUrl = `${supabaseUrl}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${encodeURIComponent(finalRedirectTo)}`;

    const logoUrl = `${supabaseUrl}/storage/v1/object/public/email-assets/logo-innovago.png?v=1`;

    const html = generateConfirmationEmail(user.email, confirmationUrl, logoUrl);

    const { error } = await resend.emails.send({
      from: 'InnovaGO <noreply@bolsaconecta.com.br>',
      to: [user.email],
      subject: 'Confirmação de E-mail • InnovaGO',
      html,
    });

    if (error) {
      console.error('Resend error:', error);
      throw error;
    }

    console.log(`Confirmation email sent successfully to: ${user.email}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error('Error in send-confirmation-email function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorCode = (error as { code?: number })?.code || 500;
    return new Response(
      JSON.stringify({
        error: {
          http_code: errorCode,
          message: errorMessage,
        },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
