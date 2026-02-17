import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";
import { renderRelatorioBolsaHtml, type RelatorioBolsaData, type EventoProximo, type DocumentoAnexo, type RelatorioItem, type PagamentoItem } from "./template.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // ─── 1) Auth ───
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Não autorizado" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const appUrl = Deno.env.get("APP_URL") || "https://boundless-start-art.lovable.app";

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return jsonResponse({ error: "Token inválido" }, 401);
    }
    const userId = claimsData.claims.sub as string;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check role
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const userRoles = (roles || []).map((r: any) => r.role);
    if (!userRoles.includes("admin") && !userRoles.includes("manager")) {
      return jsonResponse({ error: "Acesso restrito a gestores e administradores" }, 403);
    }

    // ─── 2) Parse input ───
    const body = await req.json();
    const bolsaId = body.bolsa_id;
    if (!bolsaId) {
      return jsonResponse({ error: "bolsa_id é obrigatório" }, 400);
    }

    // ─── 3) Fetch all data ───

    // Subproject
    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("*, thematic_projects(id, title, sponsor_name, status, start_date, end_date, organization_id)")
      .eq("id", bolsaId)
      .maybeSingle();

    if (projectError || !project) {
      return jsonResponse({ error: "Subprojeto/bolsa não encontrado" }, 404);
    }

    const thematic = project.thematic_projects as any;
    const orgId = thematic?.organization_id || null;

    // Enrollment
    const { data: enrollments } = await supabaseAdmin
      .from("enrollments")
      .select("*")
      .eq("project_id", bolsaId)
      .order("created_at", { ascending: false })
      .limit(1);

    const enrollment = enrollments?.[0] || null;

    // Scholar profile
    let scholarName = "Não atribuído";
    let scholarEmail = "";
    let institution: string | null = null;
    let academicLevel: string | null = null;

    if (enrollment) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("full_name, email, institution, academic_level")
        .eq("user_id", enrollment.user_id)
        .maybeSingle();

      if (profile) {
        scholarName = profile.full_name || "Sem nome";
        scholarEmail = profile.email || "";
        institution = profile.institution;
        academicLevel = profile.academic_level;
      }
    }

    const scholarUserId = enrollment?.user_id || "00000000-0000-0000-0000-000000000000";

    // Reports
    const { data: reports } = await supabaseAdmin
      .from("reports")
      .select("id, reference_month, status, submitted_at, reviewed_at, installment_number")
      .eq("user_id", scholarUserId)
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
      .eq("user_id", scholarUserId)
      .order("created_at", { ascending: false })
      .limit(1);

    // ─── 4) Build template data ───

    const reportList = reports || [];
    const paymentList = payments || [];
    const term = grantTerms?.[0] || null;

    const approvedReports = reportList.filter((r: any) => r.status === "approved").length;
    const pendingReports = reportList.filter((r: any) => ["under_review", "pending"].includes(r.status)).length;
    const rejectedReports = reportList.filter((r: any) => r.status === "rejected").length;
    const paidPayments = paymentList.filter((p: any) => p.status === "paid");
    const totalPaid = paidPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
    const pendingPayments = paymentList.filter((p: any) => ["pending", "eligible"].includes(p.status)).length;

    // Conformidade: % of expected deliverables completed
    const expectedDeliverables = enrollment?.total_installments || 1;
    const completedDeliverables = approvedReports + (term ? 1 : 0);
    const conformidade = Math.min(100, Math.round((completedDeliverables / (expectedDeliverables + 1)) * 100));

    // Determine situação
    let situacao = enrollment?.status || "active";
    if (situacao === "active" && pendingReports > 0) {
      situacao = "pending_report";
    }

    // Build eventos
    const eventos: EventoProximo[] = [];
    const today = new Date();

    if (project.end_date) {
      const endDate = new Date(project.end_date);
      const daysToEnd = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysToEnd <= 0) {
        eventos.push({ tipo: "vigencia", descricao: "Vigência encerrada", data: project.end_date, urgencia: "critico" });
      } else if (daysToEnd <= 30) {
        eventos.push({ tipo: "vigencia", descricao: `Vigência encerra em ${daysToEnd} dia(s)`, data: project.end_date, urgencia: "critico" });
      } else if (daysToEnd <= 90) {
        eventos.push({ tipo: "vigencia", descricao: `Vigência encerra em ${daysToEnd} dia(s)`, data: project.end_date, urgencia: "atencao" });
      }
    }

    if (pendingReports > 0) {
      eventos.push({ tipo: "relatorio", descricao: `${pendingReports} relatório(s) aguardando revisão`, data: null, urgencia: "atencao" });
    }
    if (rejectedReports > 0) {
      eventos.push({ tipo: "relatorio", descricao: `${rejectedReports} relatório(s) recusado(s) — aguardando reenvio`, data: null, urgencia: "critico" });
    }
    if (!term) {
      eventos.push({ tipo: "alerta", descricao: "Termo de Outorga pendente de upload", data: null, urgencia: "atencao" });
    }

    // Build documentos
    const documentos: DocumentoAnexo[] = [];
    if (term) {
      documentos.push({
        nome: term.file_name,
        tipo: "Termo de Outorga",
        status: "anexado",
        dataUpload: term.signed_at,
        dataAssinatura: term.signed_at,
      });
    } else {
      documentos.push({
        nome: "Termo de Outorga",
        tipo: "Termo de Outorga",
        status: "pendente",
        dataUpload: null,
        dataAssinatura: null,
      });
    }

    // Map reports and payments
    const relatorioItems: RelatorioItem[] = reportList.map((r: any) => ({
      competencia: r.reference_month,
      parcela: r.installment_number,
      status: r.status,
      enviadoEm: r.submitted_at,
      revisadoEm: r.reviewed_at,
    }));

    const pagamentoItems: PagamentoItem[] = paymentList.map((p: any) => ({
      competencia: p.reference_month,
      parcela: p.installment_number,
      valor: Number(p.amount),
      status: p.status,
      pagoEm: p.paid_at,
    }));

    const reportId = crypto.randomUUID();
    const bolsaUrl = `${appUrl}/projetos-tematicos/${project.thematic_project_id}`;

    const templateData: RelatorioBolsaData = {
      reportId,
      generatedAt: new Date().toISOString(),
      bolsaUrl,

      financiador: thematic?.sponsor_name || "—",
      projetoTematicoTitulo: thematic?.title || "—",
      projetoTematicoStatus: thematic?.status || "—",
      subprojetoCodigo: project.code,
      subprojetoTitulo: project.title,
      modalidade: project.modalidade_bolsa || "—",
      valorMensal: project.valor_mensal,
      vigenciaInicio: project.start_date,
      vigenciaFim: project.end_date,
      coordenadorTecnico: project.coordenador_tecnico_icca,

      bolsistaNome: scholarName,
      bolsistaEmail: scholarEmail,
      orientador: project.orientador,
      instituicao: institution,
      nivelAcademico: academicLevel,

      situacao,
      enrollmentStartDate: enrollment?.start_date || null,
      enrollmentEndDate: enrollment?.end_date || null,
      totalParcelas: enrollment?.total_installments || 0,

      eventos,

      indicadores: {
        totalRelatorios: reportList.length,
        relatoriosAprovados: approvedReports,
        relatoriosPendentes: pendingReports,
        relatoriosRecusados: rejectedReports,
        totalPagamentos: paymentList.length,
        pagamentosRealizados: paidPayments.length,
        pagamentosPendentes: pendingPayments,
        totalPago: totalPaid,
        termoOutorgaAnexado: !!term,
        conformidade,
      },

      documentos,
      relatorios: relatorioItems,
      pagamentos: pagamentoItems,
    };

    // ─── 5) Render HTML ───
    const html = renderRelatorioBolsaHtml(templateData);

    // ─── 6) Convert HTML to PDF with pdf-lib ───
    // Since Deno edge functions can't run a browser engine,
    // we build a structured PDF from the same data using pdf-lib.
    const pdfBytes = await buildPdfFromData(templateData);

    // ─── 7) Upload to storage ───
    const filePath = `tenant/${orgId || "global"}/bolsas/${bolsaId}/relatorio.pdf`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("relatorios")
      .upload(filePath, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
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
      return jsonResponse({ error: "Falha ao salvar PDF: " + uploadError.message }, 500);
    }

    // Also save the HTML version
    const htmlPath = `tenant/${orgId || "global"}/bolsas/${bolsaId}/relatorio.html`;
    await supabaseAdmin.storage
      .from("relatorios")
      .upload(htmlPath, new TextEncoder().encode(html), {
        contentType: "text/html; charset=utf-8",
        upsert: true,
      });

    // ─── 8) Generate signed URL ───
    const { data: signedData, error: signedError } = await supabaseAdmin.storage
      .from("relatorios")
      .createSignedUrl(filePath, 900);

    if (signedError) {
      console.error("Signed URL error:", signedError);
      return jsonResponse({ error: "Falha ao gerar URL assinada" }, 500);
    }

    // HTML signed URL
    const { data: htmlSignedData } = await supabaseAdmin.storage
      .from("relatorios")
      .createSignedUrl(htmlPath, 900);

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

    return jsonResponse({
      signedUrl: signedData.signedUrl,
      htmlUrl: htmlSignedData?.signedUrl || null,
      path: filePath,
      reportId,
    });
  } catch (err: any) {
    console.error("PDF generation error:", err);
    return jsonResponse({ error: err.message || "Erro interno na geração do PDF" }, 500);
  }
});

// ─── PDF Builder using pdf-lib ───────────────────────────────────────────────

async function buildPdfFromData(data: RelatorioBolsaData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const W = 595.28;
  const H = 841.89;
  const M = 50;
  const LH = 15;
  const COL = W - 2 * M;

  let page = pdfDoc.addPage([W, H]);
  let y = H - M;

  const txt = (text: string, x: number, yy: number, size = 9.5, f = font, color = rgb(0.1, 0.1, 0.12)) => {
    // Truncate if too long
    const maxChars = Math.floor((W - x - M) / (size * 0.5));
    const t = text.length > maxChars ? text.substring(0, maxChars - 2) + '…' : text;
    page.drawText(t, { x, y: yy, size, font: f, color });
  };

  const line = (yy: number, thick = 0.5) => {
    page.drawLine({ start: { x: M, y: yy }, end: { x: W - M, y: yy }, thickness: thick, color: rgb(0.78, 0.78, 0.78) });
  };

  const check = (needed: number) => {
    if (y - needed < M + 20) {
      page = pdfDoc.addPage([W, H]);
      y = H - M;
    }
  };

  const fmtDate = (d: string | null) => {
    if (!d) return '—';
    try { const dt = new Date(d); return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`; } catch { return d; }
  };

  const fmtCur = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

  const sLabel = (s: string) => {
    const m: Record<string,string> = { active:'Ativo', inactive:'Inativo', archived:'Arquivado', pending:'Pendente', under_review:'Em Analise', approved:'Aprovado', rejected:'Recusado', eligible:'Liberado', paid:'Pago', cancelled:'Cancelado', suspended:'Suspenso', completed:'Concluido', pending_report:'Pend. Relatorio' };
    return m[s] || s;
  };

  const sectionTitle = (title: string, num: string) => {
    check(40);
    y -= 6;
    // Draw number box
    page.drawRectangle({ x: M, y: y - 4, width: 16, height: 16, color: rgb(0.1, 0.1, 0.12), borderColor: rgb(0.1,0.1,0.12) });
    txt(num, M + 5, y, 8, fontBold, rgb(1, 1, 1));
    txt(title, M + 22, y, 10.5, fontBold);
    y -= 8;
    line(y);
    y -= LH;
  };

  const field = (label: string, value: string, x = M, bold = false) => {
    check(LH + 4);
    txt(label + ':', x, y, 7.5, fontBold, rgb(0.5, 0.5, 0.55));
    y -= 11;
    txt(value, x, y, 9.5, bold ? fontBold : font);
    y -= LH;
  };

  const fieldInline = (label: string, value: string, x = M) => {
    check(LH);
    txt(label + ': ', x, y, 8, fontBold, rgb(0.5, 0.5, 0.55));
    txt(value, x + label.length * 4.5 + 8, y, 9.5);
    y -= LH;
  };

  // ═══ HEADER ═══
  page.drawRectangle({ x: M, y: y - 4, width: 30, height: 30, color: rgb(0.1, 0.1, 0.12), borderColor: rgb(0.1,0.1,0.12) });
  txt('BG', M + 7, y + 4, 12, fontBold, rgb(1, 1, 1));
  txt('BolsaGO', M + 36, y + 8, 18, fontBold);
  txt('Relatorio de Bolsa', M + 36, y - 6, 9, font, rgb(0.5, 0.5, 0.55));

  // Right side: date
  const genDate = fmtDate(data.generatedAt);
  txt(`Gerado em: ${genDate}`, W - M - 120, y + 2, 8, font, rgb(0.5, 0.5, 0.55));

  y -= 20;
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 2.5, color: rgb(0.1, 0.1, 0.12) });
  y -= 20;

  // ═══ SEÇÃO 1 ═══
  sectionTitle('DADOS DA BOLSA', '1');

  const col2X = M + COL / 2 + 10;

  // Row 1
  check(LH * 3);
  txt('FINANCIADOR:', M, y, 7.5, fontBold, rgb(0.5, 0.5, 0.55));
  txt('PROJETO TEMATICO:', col2X, y, 7.5, fontBold, rgb(0.5, 0.5, 0.55));
  y -= 11;
  txt(data.financiador, M, y, 10.5, fontBold);
  txt(data.projetoTematicoTitulo, col2X, y, 9.5);
  y -= LH + 2;

  // Row 2
  txt('SUBPROJETO:', M, y, 7.5, fontBold, rgb(0.5, 0.5, 0.55));
  txt('MODALIDADE:', col2X, y, 7.5, fontBold, rgb(0.5, 0.5, 0.55));
  y -= 11;
  txt(`${data.subprojetoCodigo} — ${data.subprojetoTitulo}`, M, y, 9.5);
  txt(data.modalidade, col2X, y, 9.5);
  y -= LH + 2;

  // Row 3
  txt('VALOR MENSAL:', M, y, 7.5, fontBold, rgb(0.5, 0.5, 0.55));
  txt('VIGENCIA:', col2X, y, 7.5, fontBold, rgb(0.5, 0.5, 0.55));
  y -= 11;
  txt(fmtCur(data.valorMensal), M, y, 11, fontBold);
  txt(`${fmtDate(data.vigenciaInicio)} a ${fmtDate(data.vigenciaFim)}`, col2X, y, 9.5);
  y -= LH + 6;

  // ═══ SEÇÃO 2 ═══
  sectionTitle('BOLSISTA E ORIENTACAO', '2');

  txt('BOLSISTA:', M, y, 7.5, fontBold, rgb(0.5, 0.5, 0.55));
  txt('ORIENTADOR:', col2X, y, 7.5, fontBold, rgb(0.5, 0.5, 0.55));
  y -= 11;
  txt(data.bolsistaNome, M, y, 10.5, fontBold);
  txt(data.orientador, col2X, y, 9.5);
  y -= LH + 2;

  txt('E-MAIL:', M, y, 7.5, fontBold, rgb(0.5, 0.5, 0.55));
  txt('INSTITUICAO:', col2X, y, 7.5, fontBold, rgb(0.5, 0.5, 0.55));
  y -= 11;
  txt(data.bolsistaEmail || '—', M, y, 9.5);
  txt(data.instituicao || '—', col2X, y, 9.5);
  y -= LH + 2;

  txt('NIVEL ACADEMICO:', M, y, 7.5, fontBold, rgb(0.5, 0.5, 0.55));
  txt('TOTAL PARCELAS:', col2X, y, 7.5, fontBold, rgb(0.5, 0.5, 0.55));
  y -= 11;
  txt(data.nivelAcademico || '—', M, y, 9.5);
  txt(String(data.totalParcelas), col2X, y, 9.5);
  y -= LH + 6;

  // ═══ SEÇÃO 3 ═══
  sectionTitle('SITUACAO ATUAL', '3');
  check(40);

  // Status highlight box
  const sitInfo = getSitInfo(data.situacao);
  page.drawRectangle({
    x: M, y: y - 22, width: COL, height: 34,
    color: sitInfo.bgColor,
    borderColor: sitInfo.fgColor,
    borderWidth: 1.5,
  });
  txt(`${sitInfo.emoji}  ${sitInfo.label}`, M + 12, y - 6, 13, fontBold, sitInfo.fgColor);
  txt(`Vinculo: ${fmtDate(data.enrollmentStartDate)} a ${fmtDate(data.enrollmentEndDate)}`, M + 12, y - 18, 8, font, rgb(0.4, 0.4, 0.45));
  y -= 44;

  // ═══ SEÇÃO 4 ═══
  sectionTitle('PROXIMOS EVENTOS E ALERTAS', '4');

  if (data.eventos.length === 0) {
    txt('Nenhum evento ou alerta registrado no momento.', M, y, 9, font, rgb(0.5, 0.5, 0.55));
    y -= LH;
  } else {
    for (const ev of data.eventos) {
      check(LH + 4);
      const icon = ev.urgencia === 'critico' ? '[!]' : ev.urgencia === 'atencao' ? '[*]' : '[i]';
      const evColor = ev.urgencia === 'critico' ? rgb(0.86, 0.15, 0.15) : ev.urgencia === 'atencao' ? rgb(0.85, 0.47, 0.02) : rgb(0.15, 0.38, 0.88);
      txt(icon, M, y, 8, fontBold, evColor);
      txt(ev.descricao, M + 22, y, 9);
      if (ev.data) txt(fmtDate(ev.data), W - M - 60, y, 8, font, rgb(0.5, 0.5, 0.55));
      y -= LH;
    }
  }
  y -= 6;

  // ═══ SEÇÃO 5 ═══
  sectionTitle('INDICADORES-CHAVE', '5');
  check(60);

  const kpiW = (COL - 30) / 4;
  const kpis = [
    { value: `${data.indicadores.relatoriosAprovados}/${data.indicadores.totalRelatorios}`, label: 'Entregas Aprovadas', color: rgb(0.08, 0.5, 0.24) },
    { value: String(data.indicadores.relatoriosPendentes), label: 'Pendentes', color: rgb(0.85, 0.47, 0.02) },
    { value: `${data.indicadores.pagamentosRealizados}/${data.indicadores.totalPagamentos}`, label: 'Pagamentos', color: rgb(0.15, 0.38, 0.88) },
    { value: fmtCur(data.indicadores.totalPago), label: 'Total Pago', color: rgb(0.1, 0.1, 0.12) },
  ];

  for (let i = 0; i < kpis.length; i++) {
    const kx = M + i * (kpiW + 10);
    page.drawRectangle({ x: kx, y: y - 34, width: kpiW, height: 44, borderColor: rgb(0.88, 0.88, 0.88), borderWidth: 1 });
    txt(kpis[i].value, kx + 8, y - 4, 14, fontBold, kpis[i].color);
    txt(kpis[i].label, kx + 8, y - 22, 7, fontBold, rgb(0.5, 0.5, 0.55));
  }
  y -= 54;

  // Conformidade bar
  check(24);
  txt('CONFORMIDADE GERAL:', M, y, 7.5, fontBold, rgb(0.5, 0.5, 0.55));
  const confColor = data.indicadores.conformidade >= 80 ? rgb(0.08, 0.5, 0.24) : data.indicadores.conformidade >= 50 ? rgb(0.85, 0.47, 0.02) : rgb(0.86, 0.15, 0.15);
  txt(`${data.indicadores.conformidade}%`, M + COL - 30, y, 9, fontBold, confColor);
  y -= 10;
  page.drawRectangle({ x: M, y: y - 2, width: COL, height: 6, color: rgb(0.95, 0.95, 0.95) });
  page.drawRectangle({ x: M, y: y - 2, width: COL * (data.indicadores.conformidade / 100), height: 6, color: confColor });
  y -= 18;

  // ═══ SEÇÃO 6 ═══
  sectionTitle('DOCUMENTOS ANEXADOS', '6');

  if (data.documentos.length === 0) {
    txt('Nenhum documento registrado.', M, y, 9, font, rgb(0.5, 0.5, 0.55));
    y -= LH;
  } else {
    // Table header
    check(LH * 2);
    txt('DOCUMENTO', M, y, 7.5, fontBold, rgb(0.5, 0.5, 0.55));
    txt('TIPO', M + 200, y, 7.5, fontBold, rgb(0.5, 0.5, 0.55));
    txt('STATUS', M + 310, y, 7.5, fontBold, rgb(0.5, 0.5, 0.55));
    txt('DATA', M + 400, y, 7.5, fontBold, rgb(0.5, 0.5, 0.55));
    y -= 4;
    line(y);
    y -= LH - 2;

    for (const doc of data.documentos) {
      check(LH + 2);
      txt(doc.nome, M, y, 8.5);
      txt(doc.tipo, M + 200, y, 8.5);
      txt(sLabel(doc.status), M + 310, y, 8.5);
      txt(fmtDate(doc.dataUpload || doc.dataAssinatura), M + 400, y, 8.5);
      y -= LH;
    }
  }
  y -= 6;

  // ═══ RELATÓRIOS TABLE ═══
  if (data.relatorios.length > 0) {
    check(40);
    y -= 4;
    txt('RELATORIOS DE ATIVIDADES — DETALHAMENTO', M, y, 9, fontBold);
    y -= LH;

    txt('COMPET.', M, y, 7, fontBold, rgb(0.5,0.5,0.55));
    txt('PARC.', M + 80, y, 7, fontBold, rgb(0.5,0.5,0.55));
    txt('STATUS', M + 120, y, 7, fontBold, rgb(0.5,0.5,0.55));
    txt('ENVIADO', M + 220, y, 7, fontBold, rgb(0.5,0.5,0.55));
    txt('REVISADO', M + 340, y, 7, fontBold, rgb(0.5,0.5,0.55));
    y -= 4;
    line(y);
    y -= LH - 2;

    for (const r of data.relatorios) {
      check(LH + 2);
      txt(r.competencia, M, y, 8.5);
      txt(String(r.parcela), M + 80, y, 8.5);
      txt(sLabel(r.status), M + 120, y, 8.5);
      txt(fmtDate(r.enviadoEm), M + 220, y, 8.5);
      txt(fmtDate(r.revisadoEm), M + 340, y, 8.5);
      y -= LH;
    }
    y -= 6;
  }

  // ═══ PAGAMENTOS TABLE ═══
  if (data.pagamentos.length > 0) {
    check(40);
    y -= 4;
    txt('PAGAMENTOS — DETALHAMENTO', M, y, 9, fontBold);
    y -= LH;

    txt('COMPET.', M, y, 7, fontBold, rgb(0.5,0.5,0.55));
    txt('PARC.', M + 80, y, 7, fontBold, rgb(0.5,0.5,0.55));
    txt('VALOR', M + 120, y, 7, fontBold, rgb(0.5,0.5,0.55));
    txt('STATUS', M + 220, y, 7, fontBold, rgb(0.5,0.5,0.55));
    txt('PAGO EM', M + 340, y, 7, fontBold, rgb(0.5,0.5,0.55));
    y -= 4;
    line(y);
    y -= LH - 2;

    for (const p of data.pagamentos) {
      check(LH + 2);
      txt(p.competencia, M, y, 8.5);
      txt(String(p.parcela), M + 80, y, 8.5);
      txt(fmtCur(p.valor), M + 120, y, 8.5);
      txt(sLabel(p.status), M + 220, y, 8.5);
      txt(fmtDate(p.pagoEm), M + 340, y, 8.5);
      y -= LH;
    }

    // Total row
    check(LH + 4);
    line(y + 4);
    y -= 2;
    txt('TOTAL PAGO', M, y, 9, fontBold);
    txt(fmtCur(data.indicadores.totalPago), M + 120, y, 9, fontBold);
    y -= LH + 6;
  }

  // ═══ FOOTER ═══
  check(40);
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 2, color: rgb(0.1, 0.1, 0.12) });
  y -= 14;
  txt('Documento gerado automaticamente pelo sistema BolsaGO. Uso interno e institucional.', M, y, 7, font, rgb(0.5, 0.5, 0.55));
  y -= 10;
  txt('Os dados refletem a situacao no momento da geracao. Para informacoes atualizadas, consulte o sistema.', M, y, 7, font, rgb(0.5, 0.5, 0.55));
  y -= 12;
  txt(`ID: ${data.reportId}`, M, y, 7, font, rgb(0.4, 0.4, 0.45));

  return await pdfDoc.save();
}

function getSitInfo(s: string) {
  const map: Record<string, { label: string; emoji: string; fgColor: any; bgColor: any }> = {
    active:         { label: 'ATIVA',               emoji: '✓', fgColor: rgb(0.08, 0.5, 0.24), bgColor: rgb(0.86, 0.98, 0.9) },
    suspended:      { label: 'SUSPENSA',            emoji: '⏸', fgColor: rgb(0.7, 0.33, 0.04), bgColor: rgb(1, 0.97, 0.88) },
    completed:      { label: 'ENCERRADA',           emoji: '✓', fgColor: rgb(0.42, 0.42, 0.5), bgColor: rgb(0.95, 0.95, 0.96) },
    cancelled:      { label: 'CANCELADA',           emoji: '✕', fgColor: rgb(0.86, 0.15, 0.15), bgColor: rgb(1, 0.89, 0.89) },
    pending_report: { label: 'PEND. RELATORIO',     emoji: '⏳', fgColor: rgb(0.85, 0.47, 0.02), bgColor: rgb(1, 0.98, 0.92) },
  };
  return map[s] || { label: s.toUpperCase(), emoji: '?', fgColor: rgb(0.22, 0.22, 0.28), bgColor: rgb(0.95, 0.95, 0.96) };
}
