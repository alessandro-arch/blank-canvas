import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-request-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    console.log(`[monthly-report-reminder] Running for month: ${currentMonth}`);

    // Get active scholars with active enrollments
    const { data: activeEnrollments, error: enrollError } = await supabase
      .from('enrollments')
      .select(`
        user_id,
        project_id,
        projects!inner (
          thematic_project_id,
          thematic_projects!inner (
            organization_id
          )
        )
      `)
      .eq('status', 'active');

    if (enrollError) {
      console.error('Error fetching enrollments:', enrollError);
      throw enrollError;
    }

    if (!activeEnrollments || activeEnrollments.length === 0) {
      console.log('[monthly-report-reminder] No active enrollments found');
      return new Response(JSON.stringify({ message: 'No active enrollments', count: 0 }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Get scholars who already submitted a report for the current month
    const userIds = [...new Set(activeEnrollments.map(e => e.user_id))];
    const { data: existingReports } = await supabase
      .from('reports')
      .select('user_id')
      .eq('reference_month', currentMonth)
      .in('user_id', userIds);

    const submittedUserIds = new Set((existingReports || []).map(r => r.user_id));

    // Filter scholars who haven't submitted
    const pendingScholars = activeEnrollments.filter(e => !submittedUserIds.has(e.user_id));

    if (pendingScholars.length === 0) {
      console.log('[monthly-report-reminder] All scholars have submitted reports');
      return new Response(JSON.stringify({ message: 'All reports submitted', count: 0 }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Deduplicate by user_id (scholar may have multiple enrollments)
    const uniqueScholars = new Map<string, { user_id: string; org_id: string | null }>();
    for (const enrollment of pendingScholars) {
      if (!uniqueScholars.has(enrollment.user_id)) {
        const projects = enrollment.projects as any;
        const orgId = projects?.thematic_projects?.organization_id || null;
        uniqueScholars.set(enrollment.user_id, { user_id: enrollment.user_id, org_id: orgId });
      }
    }

    // Get profiles for pending scholars
    const pendingUserIds = [...uniqueScholars.keys()];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, email')
      .in('user_id', pendingUserIds);

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

    // Get orgs with email settings
    const orgIds = [...new Set([...uniqueScholars.values()].map(s => s.org_id).filter(Boolean))] as string[];
    const orgSettings = new Map<string, boolean>();
    if (orgIds.length > 0) {
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, settings')
        .in('id', orgIds);
      for (const org of (orgs || [])) {
        const settings = org.settings as Record<string, any> | null;
        orgSettings.set(org.id, settings?.email_notifications_enabled !== false);
      }
    }

    const subject = 'Lembrete: Enviar Relatório Mensal';
    const body = `Olá! Este é um lembrete para enviar seu relatório mensal referente a ${currentMonth}. Acesse o sistema para submeter seu relatório antes do final do mês.`;
    const logoUrl = `${supabaseUrl}/storage/v1/object/public/email-assets/logo-innovago.png?v=1`;

    let messagesCreated = 0;
    let emailsSent = 0;

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    for (const [userId, scholarData] of uniqueScholars) {
      const profile = profileMap.get(userId);
      if (!profile) continue;

      // Insert inbox message
      const { data: msg, error: msgError } = await supabase
        .from('messages')
        .insert({
          recipient_id: userId,
          sender_id: null,
          subject,
          body,
          type: 'SYSTEM',
          event_type: 'MONTHLY_REMINDER',
          link_url: '/bolsista/pagamentos-relatorios',
          organization_id: scholarData.org_id,
        })
        .select('id')
        .single();

      if (msgError) {
        console.error(`Error creating message for ${userId}:`, msgError);
        continue;
      }

      messagesCreated++;

      // Send email if org allows and profile has email
      const emailEnabled = scholarData.org_id ? (orgSettings.get(scholarData.org_id) ?? true) : true;
      if (emailEnabled && profile.email && resend && msg) {
        try {
          const recipientName = profile.full_name || 'Bolsista';
          const bodyHtml = body.replace(/\n/g, '<br/>');
          const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${subject} | BolsaGO</title></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;">
<tr><td align="center" style="padding:40px 20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
<tr><td style="background-color:#003366;border-radius:8px 8px 0 0;padding:24px 32px;">
<img src="${logoUrl}" alt="InnovaGO" style="max-height:40px;width:auto;" />
</td></tr>
<tr><td style="background-color:#ffffff;padding:32px;">
<h1 style="margin:0 0 16px;font-size:22px;color:#003366;">⏰ ${subject}</h1>
<p style="margin:0 0 8px;font-size:14px;color:#666;">Olá, <strong>${recipientName}</strong></p>
<div style="background-color:#fafafa;border:1px solid #e8e8e8;border-radius:8px;padding:24px;margin:16px 0;">
<p style="margin:0;font-size:15px;color:#333;line-height:1.7;">${bodyHtml}</p>
</div>
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="background-color:#003366;border-radius:6px;">
<a href="https://bolsago.lovable.app/bolsista/pagamentos-relatorios" target="_blank" style="display:inline-block;padding:14px 32px;color:#fff;text-decoration:none;font-size:15px;font-weight:600;">Enviar Relatório</a>
</td></tr></table>
</td></tr>
<tr><td style="background-color:#003366;border-radius:0 0 8px 8px;padding:24px 32px;">
<p style="margin:0;font-size:12px;color:#fff;opacity:0.8;">© InnovaGO – Sistema de Gestão de Bolsas<br/>
<a href="https://www.innovago.app" style="color:#fff;text-decoration:underline;">www.innovago.app</a></p>
</td></tr>
</table></td></tr></table></body></html>`;

          const { error: emailErr } = await resend.emails.send({
            from: 'BolsaGO <contato@innovago.app>',
            to: [profile.email],
            subject: `${subject} • BolsaGO`,
            html,
          });

          if (emailErr) {
            console.error(`Email failed for ${profile.email}:`, emailErr);
            await supabase.from('messages').update({ email_status: 'failed', email_error: JSON.stringify(emailErr).substring(0, 500) }).eq('id', msg.id);
          } else {
            emailsSent++;
            await supabase.from('messages').update({ email_status: 'sent' }).eq('id', msg.id);
          }
        } catch (emailCatchErr) {
          console.error(`Email exception for ${profile.email}:`, emailCatchErr);
        }
      }
    }

    console.log(`[monthly-report-reminder] Done: ${messagesCreated} messages, ${emailsSent} emails`);

    return new Response(
      JSON.stringify({ success: true, messages_created: messagesCreated, emails_sent: emailsSent }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error('[monthly-report-reminder] Error:', error);
    console.error('Detailed error:', error instanceof Error ? error.message : error);
    return new Response(
      JSON.stringify({ error: 'Erro interno' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
