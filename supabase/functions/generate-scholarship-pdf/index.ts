import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // 1) Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    // Service role client for storage upload
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check role (manager or admin)
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const userRoles = (roles || []).map((r: any) => r.role);
    if (!userRoles.includes("admin") && !userRoles.includes("manager")) {
      return new Response(
        JSON.stringify({ error: "Acesso restrito a gestores e administradores" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2) Parse input
    const body = await req.json();
    const bolsaId = body.bolsa_id;
    if (!bolsaId) {
      return new Response(JSON.stringify({ error: "bolsa_id é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3) Fetch data
    // Subproject (bolsa)
    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("*, thematic_projects(id, title, sponsor_name, status, start_date, end_date, organization_id)")
      .eq("id", bolsaId)
      .maybeSingle();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ error: "Subprojeto/bolsa não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const thematic = project.thematic_projects as any;
    const orgId = thematic?.organization_id || null;

    // Enrollment + scholar
    const { data: enrollments } = await supabaseAdmin
      .from("enrollments")
      .select("*")
      .eq("project_id", bolsaId)
      .order("created_at", { ascending: false })
      .limit(1);

    const enrollment = enrollments?.[0] || null;
    let scholarName = "Não atribuído";
    let scholarEmail = "";

    if (enrollment) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("full_name, email, institution, academic_level")
        .eq("user_id", enrollment.user_id)
        .maybeSingle();

      if (profile) {
        scholarName = profile.full_name || "Sem nome";
        scholarEmail = profile.email || "";
      }
    }

    // Reports
    const { data: reports } = await supabaseAdmin
      .from("reports")
      .select("id, reference_month, status, submitted_at, reviewed_at, installment_number")
      .eq("user_id", enrollment?.user_id || "00000000-0000-0000-0000-000000000000")
      .order("reference_month", { ascending: true });

    // Payments
    const { data: payments } = await supabaseAdmin
      .from("payments")
      .select("id, reference_month, status, amount, installment_number, paid_at")
      .eq("enrollment_id", enrollment?.id || "00000000-0000-0000-0000-000000000000")
      .order("reference_month", { ascending: true });

    // Grant term
    const { data: grantTerms } = await supabaseAdmin
      .from("grant_terms")
      .select("id, file_name, signed_at")
      .eq("user_id", enrollment?.user_id || "00000000-0000-0000-0000-000000000000")
      .limit(1);

    // 4) Build PDF
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const PAGE_WIDTH = 595.28; // A4
    const PAGE_HEIGHT = 841.89;
    const MARGIN = 50;
    const LINE_HEIGHT = 16;
    const COL_WIDTH = PAGE_WIDTH - 2 * MARGIN;

    let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN;

    const drawText = (text: string, x: number, yPos: number, size = 10, f = font) => {
      page.drawText(text, { x, y: yPos, size, font: f, color: rgb(0.1, 0.1, 0.1) });
    };

    const drawLine = (yPos: number) => {
      page.drawLine({
        start: { x: MARGIN, y: yPos },
        end: { x: PAGE_WIDTH - MARGIN, y: yPos },
        thickness: 0.5,
        color: rgb(0.7, 0.7, 0.7),
      });
    };

    const checkPageBreak = (needed: number) => {
      if (y - needed < MARGIN + 30) {
        page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - MARGIN;
      }
    };

    const formatDate = (d: string | null) => {
      if (!d) return "—";
      try {
        const date = new Date(d);
        return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
      } catch {
        return d;
      }
    };

    const formatCurrency = (v: number) =>
      `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

    const statusLabel = (s: string) => {
      const map: Record<string, string> = {
        active: "Ativo",
        inactive: "Inativo",
        archived: "Arquivado",
        pending: "Pendente",
        under_review: "Em Analise",
        approved: "Aprovado",
        rejected: "Recusado",
        eligible: "Liberado",
        paid: "Pago",
        cancelled: "Cancelado",
        suspended: "Suspenso",
        completed: "Concluido",
      };
      return map[s] || s;
    };

    // ---- HEADER ----
    drawText("RELATORIO DE BOLSA", MARGIN, y, 18, fontBold);
    y -= 10;
    drawText("Sistema BolsaGO - ICCA", MARGIN, y, 9);
    y -= 8;
    drawText(`Gerado em: ${formatDate(new Date().toISOString())}`, MARGIN, y, 8);
    y -= 20;
    drawLine(y);
    y -= 20;

    // ---- PROJETO TEMATICO ----
    drawText("PROJETO TEMATICO", MARGIN, y, 12, fontBold);
    y -= LINE_HEIGHT + 4;
    drawText(`Titulo: ${thematic?.title || "—"}`, MARGIN, y, 10);
    y -= LINE_HEIGHT;
    drawText(`Financiador: ${thematic?.sponsor_name || "—"}`, MARGIN, y, 10);
    y -= LINE_HEIGHT;
    drawText(`Status: ${statusLabel(thematic?.status || "")}`, MARGIN, y, 10);
    y -= LINE_HEIGHT;
    drawText(
      `Vigencia: ${formatDate(thematic?.start_date)} a ${formatDate(thematic?.end_date)}`,
      MARGIN,
      y,
      10
    );
    y -= LINE_HEIGHT + 10;

    // ---- SUBPROJETO / BOLSA ----
    drawText("SUBPROJETO / BOLSA", MARGIN, y, 12, fontBold);
    y -= LINE_HEIGHT + 4;
    drawText(`Codigo: ${project.code}`, MARGIN, y, 10);
    y -= LINE_HEIGHT;
    drawText(`Titulo: ${project.title}`, MARGIN, y, 10);
    y -= LINE_HEIGHT;
    drawText(`Orientador: ${project.orientador}`, MARGIN, y, 10);
    y -= LINE_HEIGHT;
    drawText(`Modalidade: ${project.modalidade_bolsa || "—"}`, MARGIN, y, 10);
    y -= LINE_HEIGHT;
    drawText(`Valor Mensal: ${formatCurrency(project.valor_mensal)}`, MARGIN, y, 10);
    y -= LINE_HEIGHT;
    drawText(
      `Vigencia: ${formatDate(project.start_date)} a ${formatDate(project.end_date)}`,
      MARGIN,
      y,
      10
    );
    y -= LINE_HEIGHT;
    drawText(`Status: ${statusLabel(project.status)}`, MARGIN, y, 10);
    y -= LINE_HEIGHT;
    if (project.coordenador_tecnico_icca) {
      drawText(`Coord. Tecnico ICCA: ${project.coordenador_tecnico_icca}`, MARGIN, y, 10);
      y -= LINE_HEIGHT;
    }
    y -= 10;

    // ---- BOLSISTA ----
    drawText("BOLSISTA", MARGIN, y, 12, fontBold);
    y -= LINE_HEIGHT + 4;
    drawText(`Nome: ${scholarName}`, MARGIN, y, 10);
    y -= LINE_HEIGHT;
    if (scholarEmail) {
      drawText(`E-mail: ${scholarEmail}`, MARGIN, y, 10);
      y -= LINE_HEIGHT;
    }
    if (enrollment) {
      drawText(`Status Vinculo: ${statusLabel(enrollment.status)}`, MARGIN, y, 10);
      y -= LINE_HEIGHT;
      drawText(
        `Periodo: ${formatDate(enrollment.start_date)} a ${formatDate(enrollment.end_date)}`,
        MARGIN,
        y,
        10
      );
      y -= LINE_HEIGHT;
      drawText(`Total Parcelas: ${enrollment.total_installments}`, MARGIN, y, 10);
      y -= LINE_HEIGHT;
    }
    y -= 10;

    // ---- DOCUMENTOS ----
    drawText("DOCUMENTOS", MARGIN, y, 12, fontBold);
    y -= LINE_HEIGHT + 4;
    const term = grantTerms?.[0];
    if (term) {
      drawText(`Termo de Outorga: ${term.file_name} (assinado em ${formatDate(term.signed_at)})`, MARGIN, y, 10);
    } else {
      drawText("Termo de Outorga: Pendente", MARGIN, y, 10);
    }
    y -= LINE_HEIGHT + 10;

    // ---- ENTREGAS (RELATORIOS) ----
    checkPageBreak(60);
    drawLine(y);
    y -= 15;
    drawText("RELATORIOS DE ATIVIDADES", MARGIN, y, 12, fontBold);
    y -= LINE_HEIGHT + 4;

    const reportList = reports || [];
    if (reportList.length === 0) {
      drawText("Nenhum relatorio registrado.", MARGIN, y, 10);
      y -= LINE_HEIGHT;
    } else {
      // Header row
      drawText("Competencia", MARGIN, y, 9, fontBold);
      drawText("Parcela", MARGIN + 100, y, 9, fontBold);
      drawText("Status", MARGIN + 160, y, 9, fontBold);
      drawText("Enviado em", MARGIN + 250, y, 9, fontBold);
      drawText("Revisado em", MARGIN + 350, y, 9, fontBold);
      y -= LINE_HEIGHT;
      drawLine(y + 4);
      y -= 4;

      for (const r of reportList) {
        checkPageBreak(LINE_HEIGHT + 5);
        drawText(r.reference_month, MARGIN, y, 9);
        drawText(String(r.installment_number), MARGIN + 100, y, 9);
        drawText(statusLabel(r.status), MARGIN + 160, y, 9);
        drawText(formatDate(r.submitted_at), MARGIN + 250, y, 9);
        drawText(formatDate(r.reviewed_at), MARGIN + 350, y, 9);
        y -= LINE_HEIGHT;
      }
    }

    const approvedReports = reportList.filter((r: any) => r.status === "approved").length;
    const pendingReports = reportList.filter(
      (r: any) => r.status === "under_review" || r.status === "pending"
    ).length;
    const rejectedReports = reportList.filter((r: any) => r.status === "rejected").length;

    y -= 6;
    drawText(
      `Resumo: ${approvedReports} aprovado(s), ${pendingReports} pendente(s), ${rejectedReports} recusado(s)`,
      MARGIN,
      y,
      9,
      fontBold
    );
    y -= LINE_HEIGHT + 10;

    // ---- PAGAMENTOS ----
    checkPageBreak(60);
    drawLine(y);
    y -= 15;
    drawText("PAGAMENTOS", MARGIN, y, 12, fontBold);
    y -= LINE_HEIGHT + 4;

    const paymentList = payments || [];
    if (paymentList.length === 0) {
      drawText("Nenhum pagamento registrado.", MARGIN, y, 10);
      y -= LINE_HEIGHT;
    } else {
      drawText("Competencia", MARGIN, y, 9, fontBold);
      drawText("Parcela", MARGIN + 100, y, 9, fontBold);
      drawText("Valor", MARGIN + 160, y, 9, fontBold);
      drawText("Status", MARGIN + 260, y, 9, fontBold);
      drawText("Pago em", MARGIN + 350, y, 9, fontBold);
      y -= LINE_HEIGHT;
      drawLine(y + 4);
      y -= 4;

      let totalPaid = 0;
      for (const p of paymentList) {
        checkPageBreak(LINE_HEIGHT + 5);
        drawText(p.reference_month, MARGIN, y, 9);
        drawText(String(p.installment_number), MARGIN + 100, y, 9);
        drawText(formatCurrency(p.amount), MARGIN + 160, y, 9);
        drawText(statusLabel(p.status), MARGIN + 260, y, 9);
        drawText(formatDate(p.paid_at), MARGIN + 350, y, 9);
        y -= LINE_HEIGHT;
        if (p.status === "paid") totalPaid += Number(p.amount);
      }

      y -= 6;
      drawText(`Total Pago: ${formatCurrency(totalPaid)}`, MARGIN, y, 10, fontBold);
      y -= LINE_HEIGHT;

      const paidCount = paymentList.filter((p: any) => p.status === "paid").length;
      const pendingPayments = paymentList.filter(
        (p: any) => p.status === "pending" || p.status === "eligible"
      ).length;
      drawText(
        `Resumo: ${paidCount} pago(s), ${pendingPayments} pendente(s)/liberado(s)`,
        MARGIN,
        y,
        9,
        fontBold
      );
      y -= LINE_HEIGHT + 10;
    }

    // ---- PROXIMOS EVENTOS ----
    checkPageBreak(60);
    drawLine(y);
    y -= 15;
    drawText("PROXIMOS EVENTOS / ALERTAS", MARGIN, y, 12, fontBold);
    y -= LINE_HEIGHT + 4;

    const today = new Date();

    // End of project
    if (project.end_date) {
      const endDate = new Date(project.end_date);
      const daysToEnd = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysToEnd <= 90 && daysToEnd > 0) {
        drawText(`⚠ Vigencia encerra em ${daysToEnd} dia(s) (${formatDate(project.end_date)})`, MARGIN, y, 10);
        y -= LINE_HEIGHT;
      } else if (daysToEnd <= 0) {
        drawText(`⚠ Vigencia encerrada em ${formatDate(project.end_date)}`, MARGIN, y, 10);
        y -= LINE_HEIGHT;
      }
    }

    // Pending reports
    if (pendingReports > 0) {
      drawText(`⚠ ${pendingReports} relatorio(s) aguardando revisao`, MARGIN, y, 10);
      y -= LINE_HEIGHT;
    }

    // Rejected reports needing resubmission
    if (rejectedReports > 0) {
      drawText(`⚠ ${rejectedReports} relatorio(s) recusado(s) - aguardando reenvio`, MARGIN, y, 10);
      y -= LINE_HEIGHT;
    }

    // Grant term pending
    if (!term) {
      drawText("⚠ Termo de Outorga pendente de upload", MARGIN, y, 10);
      y -= LINE_HEIGHT;
    }

    if (
      pendingReports === 0 &&
      rejectedReports === 0 &&
      term &&
      (!project.end_date || new Date(project.end_date).getTime() - today.getTime() > 90 * 24 * 60 * 60 * 1000)
    ) {
      drawText("Nenhum alerta no momento.", MARGIN, y, 10);
      y -= LINE_HEIGHT;
    }

    // ---- FOOTER ----
    y -= 20;
    drawLine(y);
    y -= 12;
    drawText(
      "Documento gerado automaticamente pelo sistema BolsaGO. Uso interno.",
      MARGIN,
      y,
      7
    );

    // 5) Serialize PDF
    const pdfBytes = await pdfDoc.save();

    // 6) Upload to storage
    const filePath = `tenant/${orgId || "global"}/bolsas/${bolsaId}/relatorio.pdf`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("relatorios")
      .upload(filePath, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      // Log failure
      await supabaseAdmin.from("pdf_logs").insert({
        user_id: userId,
        entity_type: "bolsa",
        entity_id: bolsaId,
        file_path: filePath,
        status: "error",
        error_message: uploadError.message,
        organization_id: orgId,
        generation_time_ms: Date.now() - startTime,
      });

      return new Response(
        JSON.stringify({ error: "Falha ao salvar PDF: " + uploadError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 7) Generate signed URL (15 min)
    const { data: signedData, error: signedError } = await supabaseAdmin.storage
      .from("relatorios")
      .createSignedUrl(filePath, 900);

    if (signedError) {
      console.error("Signed URL error:", signedError);
      return new Response(
        JSON.stringify({ error: "Falha ao gerar URL assinada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log success
    await supabaseAdmin.from("pdf_logs").insert({
      user_id: userId,
      entity_type: "bolsa",
      entity_id: bolsaId,
      file_path: filePath,
      file_size: pdfBytes.length,
      status: "success",
      organization_id: orgId,
      generation_time_ms: Date.now() - startTime,
    });

    return new Response(
      JSON.stringify({
        signedUrl: signedData.signedUrl,
        path: filePath,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("PDF generation error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Erro interno na geração do PDF" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
