import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, attempt_count } = await req.json();

    if (!email || !attempt_count) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find the user's organization admins
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id, full_name")
      .eq("email", email)
      .maybeSingle();

    if (!profile?.organization_id) {
      console.log(`No org found for ${email}, skipping admin notification`);
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get org admin emails
    const { data: adminMembers } = await supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", profile.organization_id)
      .eq("role", "admin")
      .eq("is_active", true);

    if (!adminMembers?.length) {
      console.log("No active admins found for org");
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const adminIds = adminMembers.map((m) => m.user_id);
    const { data: adminProfiles } = await supabase
      .from("profiles")
      .select("email")
      .in("user_id", adminIds);

    const adminEmails = adminProfiles
      ?.map((p) => p.email)
      .filter(Boolean) as string[];

    if (!adminEmails.length) {
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "No API key" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const userName = profile.full_name || email;
    const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const logoUrl = `${supabaseUrl}/storage/v1/object/public/email-assets/logo-innovago.png?v=1`;

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Alerta de Segurança | BolsaGO</title></head>
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
<h1 style="margin:0 0 16px;font-size:22px;color:#c53030;">🔒 Alerta de Segurança</h1>
<p style="margin:0 0 16px;font-size:15px;color:#333;line-height:1.6;">
Uma conta foi <strong>bloqueada temporariamente</strong> por excesso de tentativas de login.
</p>
<div style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:20px;margin-bottom:20px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%">
<tr><td style="padding:4px 0;font-size:14px;color:#666;">Conta:</td><td style="padding:4px 0;font-size:14px;color:#333;font-weight:600;">${userName}</td></tr>
<tr><td style="padding:4px 0;font-size:14px;color:#666;">Email:</td><td style="padding:4px 0;font-size:14px;color:#333;">${email}</td></tr>
<tr><td style="padding:4px 0;font-size:14px;color:#666;">Tentativas:</td><td style="padding:4px 0;font-size:14px;color:#c53030;font-weight:600;">${attempt_count} falhas consecutivas</td></tr>
<tr><td style="padding:4px 0;font-size:14px;color:#666;">Data/Hora:</td><td style="padding:4px 0;font-size:14px;color:#333;">${now}</td></tr>
<tr><td style="padding:4px 0;font-size:14px;color:#666;">Bloqueio:</td><td style="padding:4px 0;font-size:14px;color:#333;">15 minutos</td></tr>
</table>
</div>
<p style="margin:0 0 16px;font-size:14px;color:#666;line-height:1.6;">
O bloqueio é automático e será removido após 15 minutos. Caso suspeite de atividade maliciosa, considere verificar os logs de auditoria.
</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="background-color:#003366;border-radius:6px;">
<a href="https://bolsago.lovable.app/admin/trilha-auditoria" target="_blank" style="display:inline-block;padding:14px 32px;color:#fff;text-decoration:none;font-size:15px;font-weight:600;">Ver Trilha de Auditoria</a>
</td></tr></table>
</td></tr>
<tr><td style="background-color:#003366;border-radius:0 0 8px 8px;padding:24px 32px;">
<p style="margin:0;font-size:12px;color:#fff;opacity:0.8;">© InnovaGO – Sistema de Gestão de Bolsas<br/>
Este é um alerta automático de segurança. Em conformidade com a LGPD.</p>
</td></tr>
</table></td></tr></table></body></html>`;

    const resend = new Resend(resendApiKey);
    const { error: emailError } = await resend.emails.send({
      from: "BolsaGO <contato@innovago.app>",
      to: adminEmails,
      subject: `🔒 Alerta: Conta bloqueada – ${userName} • BolsaGO`,
      html,
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      return new Response(JSON.stringify({ error: "Email failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Lockout alert sent to ${adminEmails.length} admin(s) for ${email}`);
    return new Response(JSON.stringify({ success: true, notified: adminEmails.length }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    console.error("notify-lockout error:", error);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
