import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";
import { renderRelatorioBolsaHtml, type RelatorioBolsaData, type EventoProximo, type DocumentoAnexo, type RelatorioItem, type PagamentoItem } from "./template.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-request-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const startTime = Date.now();
  const requestId = req.headers.get("x-request-id") || `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
  console.log(`[rid:${requestId}] generate-scholarship-pdf: request started`);

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

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: "Token inválido" }, 401);
    }
    const userId = user.id;

    const db = createClient(supabaseUrl, supabaseServiceKey);

    // Check role
    const { data: roles } = await db.from("user_roles").select("role").eq("user_id", userId);
    const userRoles = (roles || []).map((r: any) => r.role);
    if (!userRoles.includes("admin") && !userRoles.includes("manager") && !userRoles.includes("auditor")) {
      return jsonResponse({ error: "Acesso restrito a gestores, administradores e auditores" }, 403);
    }

    // ─── Parse input ───
    const body = await req.json();

    // ─── STATUS CHECK MODE ───
    if (body.job_id) {
      const { data: log } = await db.from("pdf_logs").select("*").eq("id", body.job_id).maybeSingle();
      if (!log) return jsonResponse({ error: "Job não encontrado" }, 404);
      if (log.status === "processing") return jsonResponse({ status: "processing", jobId: body.job_id });
      if (log.status === "error") return jsonResponse({ status: "error", error: log.error_message, jobId: body.job_id });
      const { data: signedData } = await db.storage.from("relatorios").createSignedUrl(log.file_path, 900);
      return jsonResponse({ status: "success", signedUrl: signedData?.signedUrl, jobId: body.job_id });
    }

    // ─── GENERATION MODE ───
    const bolsaId = body.bolsa_id;
    if (!bolsaId) {
      return jsonResponse({ error: "bolsa_id é obrigatório" }, 400);
    }

    // Quick check project exists
    const { data: project, error: projectError } = await db
      .from("projects")
      .select("id, thematic_project_id, thematic_projects(organization_id)")
      .eq("id", bolsaId)
      .maybeSingle();

    if (projectError || !project) {
      return jsonResponse({ error: "Subprojeto/bolsa não encontrado" }, 404);
    }

    const orgId = (project.thematic_projects as any)?.organization_id || null;

    // Create job record
    const jobId = crypto.randomUUID();
    await db.from("pdf_logs").insert({
      id: jobId,
      user_id: userId,
      entity_type: "bolsa",
      entity_id: bolsaId,
      file_path: `pending/${jobId}`,
      status: "processing",
      organization_id: orgId,
    });

    console.log(`[rid:${requestId}] Job ${jobId} created, starting background generation`);

    // @ts-ignore - EdgeRuntime.waitUntil is available in Supabase Edge Functions
    EdgeRuntime.waitUntil(
      generateInBackground(db, jobId, bolsaId, userId, appUrl, requestId, startTime)
        .catch(async (err: any) => {
          console.error(`[rid:${requestId}] Background generation failed:`, err);
          await db.from("pdf_logs").update({
            status: "error",
            error_message: err.message || "Erro desconhecido na geração do PDF",
            generation_time_ms: Date.now() - startTime,
          }).eq("id", jobId);
        })
    );

    return jsonResponse({ jobId, status: "processing" });
  } catch (err: any) {
    console.error("PDF generation error:", err);
    return jsonResponse({ error: err.message || "Erro interno na geração do PDF" }, 500);
  }
});

// ─── Background PDF generation ───
async function generateInBackground(
  db: any, jobId: string, bolsaId: string,
  userId: string, appUrl: string, requestId: string, startTime: number,
) {
  console.log(`[rid:${requestId}] Background: fetching data for bolsa ${bolsaId}`);

  // Subproject
  const { data: project, error: projectError } = await db
    .from("projects")
    .select("*, thematic_projects(id, title, sponsor_name, status, start_date, end_date, organization_id)")
    .eq("id", bolsaId)
    .maybeSingle();

  if (projectError || !project) throw new Error("Subprojeto/bolsa não encontrado");

  const thematic = project.thematic_projects as any;
  const orgId = thematic?.organization_id || null;

  // Fetch organization branding
  let orgBranding = { name: "Instituição", primary_color: "#1e3a5f", watermark_text: null as string | null, report_footer_text: null as string | null };
  if (orgId) {
    const { data: org } = await db
      .from("organizations")
      .select("name, primary_color, watermark_text, report_footer_text")
      .eq("id", orgId)
      .maybeSingle();
    if (org) {
      orgBranding = {
        name: org.name,
        primary_color: org.primary_color || "#1e3a5f",
        watermark_text: org.watermark_text || null,
        report_footer_text: org.report_footer_text || null,
      };
    }
  }

  // Enrollment
  const { data: enrollments } = await db
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
    const { data: profile } = await db
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

  // Reports & Payments & Grant terms
  const [reportsResult, paymentsResult, grantTermsResult] = await Promise.all([
    db.from("reports").select("id, reference_month, status, submitted_at, reviewed_at, installment_number").eq("user_id", scholarUserId).order("reference_month", { ascending: true }),
    db.from("payments").select("id, reference_month, status, amount, installment_number, paid_at").eq("enrollment_id", enrollment?.id || "00000000-0000-0000-0000-000000000000").order("reference_month", { ascending: true }),
    db.from("grant_terms").select("id, file_name, signed_at").eq("user_id", scholarUserId).order("created_at", { ascending: false }).limit(1),
  ]);

  const reportList = reportsResult.data || [];
  const paymentList = paymentsResult.data || [];
  const term = grantTermsResult.data?.[0] || null;

  const approvedReports = reportList.filter((r: any) => r.status === "approved").length;
  const pendingReports = reportList.filter((r: any) => ["under_review", "pending"].includes(r.status)).length;
  const rejectedReports = reportList.filter((r: any) => r.status === "rejected").length;
  const paidPayments = paymentList.filter((p: any) => p.status === "paid");
  const totalPaid = paidPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
  const pendingPayments = paymentList.filter((p: any) => ["pending", "eligible"].includes(p.status)).length;

  const expectedDeliverables = enrollment?.total_installments || 1;
  const completedDeliverables = approvedReports + (term ? 1 : 0);
  const conformidade = Math.min(100, Math.round((completedDeliverables / (expectedDeliverables + 1)) * 100));

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
    documentos.push({ nome: term.file_name, tipo: "Termo de Outorga", status: "anexado", dataUpload: term.signed_at, dataAssinatura: term.signed_at });
  } else {
    documentos.push({ nome: "Termo de Outorga", tipo: "Termo de Outorga", status: "pendente", dataUpload: null, dataAssinatura: null });
  }

  const relatorioItems: RelatorioItem[] = reportList.map((r: any) => ({
    competencia: r.reference_month, parcela: r.installment_number, status: r.status, enviadoEm: r.submitted_at, revisadoEm: r.reviewed_at,
  }));

  const pagamentoItems: PagamentoItem[] = paymentList.map((p: any) => ({
    competencia: p.reference_month, parcela: p.installment_number, valor: Number(p.amount), status: p.status, pagoEm: p.paid_at,
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

  // Render HTML
  const html = renderRelatorioBolsaHtml(templateData);

  // Build PDF
  console.log(`[rid:${requestId}] Background: building PDF`);
  const pdfBytes = await buildPdfFromData(templateData, orgBranding);

  // Upload PDF + HTML
  const filePath = `tenant/${orgId || "global"}/bolsas/${bolsaId}/relatorio.pdf`;
  const htmlPath = `tenant/${orgId || "global"}/bolsas/${bolsaId}/relatorio.html`;

  console.log(`[rid:${requestId}] Background: uploading PDF (${pdfBytes.length} bytes)`);

  const [uploadResult, htmlUploadResult] = await Promise.all([
    db.storage.from("relatorios").upload(filePath, pdfBytes, { contentType: "application/pdf", upsert: true }),
    db.storage.from("relatorios").upload(htmlPath, new TextEncoder().encode(html), { contentType: "text/html; charset=utf-8", upsert: true }),
  ]);

  if (uploadResult.error) {
    console.error(`[rid:${requestId}] Upload error:`, uploadResult.error);
    await db.from("pdf_logs").update({
      status: "error",
      error_message: "Falha ao salvar PDF: " + uploadResult.error.message,
      generation_time_ms: Date.now() - startTime,
    }).eq("id", jobId);
    return;
  }

  // Update job as success
  await db.from("pdf_logs").update({
    status: "success",
    file_path: filePath,
    file_size: pdfBytes.length,
    generation_time_ms: Date.now() - startTime,
  }).eq("id", jobId);

  console.log(`[rid:${requestId}] Background: PDF generation complete (${Date.now() - startTime}ms)`);
}

// ─── PDF Builder using pdf-lib ───────────────────────────────────────────────

interface OrgBranding {
  name: string;
  primary_color: string;
  watermark_text: string | null;
  report_footer_text: string | null;
}

function hexToRgbScholar(hex: string) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  return rgb(r, g, b);
}

function sanitize(text: string): string {
  return text
    .replace(/[\u2713\u2714]/g, "OK")
    .replace(/\u2716/g, "X")
    .replace(/\u2022/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2013/g, "-")
    .replace(/\u2014/g, "--")
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "");
}

async function buildPdfFromData(data: RelatorioBolsaData, branding: OrgBranding): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const primaryRgb = hexToRgbScholar(branding.primary_color);

  const W = 595.28;
  const H = 841.89;
  const M = 50;
  const LH = 15;
  const COL = W - 2 * M;

  let page = pdfDoc.addPage([W, H]);
  let y = H - M;

  const txt = (text: string, x: number, yy: number, size = 9.5, f = font, color = rgb(0.1, 0.1, 0.12)) => {
    const safe = sanitize(text);
    const maxChars = Math.floor((W - x - M) / (size * 0.5));
    const t = safe.length > maxChars ? safe.substring(0, maxChars - 2) + '...' : safe;
    page.drawText(t, { x, y: yy, size, font: f, color });
  };

  // Word-wrap text within a max pixel width
  const wrapText = (text: string, maxWidth: number, size: number, f = font): string[] => {
    const safe = sanitize(text);
    const words = safe.split(/\s+/);
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      const w = f.widthOfTextAtSize(test, size);
      if (w > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines.length > 0 ? lines : [""];
  };

  // Draw wrapped text, advancing y, and return how many lines were drawn
  const drawWrapped = (text: string, x: number, maxWidth: number, size = 9.5, f = font, color = rgb(0.1, 0.1, 0.12)): number => {
    const lines = wrapText(text, maxWidth, size, f);
    for (const ln of lines) {
      check(LH);
      page.drawText(ln, { x, y, size, font: f, color });
      y -= LH;
    }
    return lines.length;
  };

  // Draw two wrapped columns side by side, advancing y by the taller one
  const drawTwoCol = (
    leftText: string, leftX: number, leftMaxW: number,
    rightText: string, rightX: number, rightMaxW: number,
    size = 9.5, f = font, color = rgb(0.1, 0.1, 0.12),
  ) => {
    const leftLines = wrapText(leftText, leftMaxW, size, f);
    const rightLines = wrapText(rightText, rightMaxW, size, f);
    const maxLines = Math.max(leftLines.length, rightLines.length);
    check(maxLines * LH);
    const startY = y;
    for (let i = 0; i < maxLines; i++) {
      const ly = startY - i * LH;
      if (leftLines[i]) page.drawText(leftLines[i], { x: leftX, y: ly, size, font: f, color });
      if (rightLines[i]) page.drawText(rightLines[i], { x: rightX, y: ly, size, font: f, color });
    }
    y -= maxLines * LH;
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
    if (!d) return '--';
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
    page.drawRectangle({ x: M, y: y - 4, width: 16, height: 16, color: primaryRgb, borderColor: primaryRgb });
    txt(num, M + 5, y, 8, fontBold, rgb(1, 1, 1));
    txt(title, M + 22, y, 10.5, fontBold, primaryRgb);
    y -= 8;
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 1, color: primaryRgb });
    y -= LH;
  };

  // ═══ HEADER ═══
  page.drawRectangle({ x: M, y: y - 4, width: 30, height: 30, color: primaryRgb, borderColor: primaryRgb });
  txt('BG', M + 7, y + 4, 12, fontBold, rgb(1, 1, 1));
  txt('BolsaGO', M + 36, y + 8, 18, fontBold, primaryRgb);
  txt('Relatorio de Bolsa', M + 36, y - 6, 9, font, rgb(0.5, 0.5, 0.55));

  txt(branding.name, W - M - 180, y + 8, 8, fontBold, rgb(0.5, 0.5, 0.55));
  const genDate = fmtDate(data.generatedAt);
  txt(`Gerado em: ${genDate}`, W - M - 120, y - 4, 8, font, rgb(0.5, 0.5, 0.55));

  y -= 20;
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 2.5, color: primaryRgb });
  y -= 20;

  // ═══ SEÇÃO 1 ═══
  sectionTitle('DADOS DA BOLSA', '1');

  const col2X = M + COL / 2 + 10;
  const leftColW = col2X - M - 10;
  const rightColW = W - M - col2X;

  check(LH * 3);
  txt('FINANCIADOR:', M, y, 7.5, fontBold, rgb(0.5, 0.5, 0.55));
  txt('PROJETO TEMATICO:', col2X, y, 7.5, fontBold, rgb(0.5, 0.5, 0.55));
  y -= 11;
  drawTwoCol(data.financiador, M, leftColW, data.projetoTematicoTitulo, col2X, rightColW, 9.5, font);
  y -= 2;

  txt('SUBPROJETO:', M, y, 7.5, fontBold, rgb(0.5, 0.5, 0.55));
  txt('MODALIDADE:', col2X, y, 7.5, fontBold, rgb(0.5, 0.5, 0.55));
  y -= 11;
  drawTwoCol(`${data.subprojetoCodigo} -- ${data.subprojetoTitulo}`, M, leftColW, data.modalidade, col2X, rightColW, 9.5, font);
  y -= 2;

  txt('VALOR MENSAL:', M, y, 7.5, fontBold, rgb(0.5, 0.5, 0.55));
  txt('VIGENCIA:', col2X, y, 7.5, fontBold, rgb(0.5, 0.5, 0.55));
  y -= 11;
  drawTwoCol(fmtCur(data.valorMensal), M, leftColW, `${fmtDate(data.vigenciaInicio)} a ${fmtDate(data.vigenciaFim)}`, col2X, rightColW, 9.5, font);
  y -= 6;

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
    check(LH * 2);
    txt('DOCUMENTO', M, y, 7.5, fontBold, rgb(0.5, 0.5, 0.55));
    txt('TIPO', M + 200, y, 7.5, fontBold, rgb(0.5, 0.5, 0.55));
    txt('STATUS', M + 310, y, 7.5, fontBold, rgb(0.5, 0.5, 0.55));
    txt('DATA', M + 400, y, 7.5, fontBold, rgb(0.5, 0.5, 0.55));
    y -= 4;
    line(y);
    y -= LH - 2;

    for (const doc of data.documentos) {
      const docNameLines = wrapText(doc.nome, 190, 8.5);
      const rowLines = docNameLines.length;
      check(rowLines * LH + 2);
      const startY = y;
      for (let li = 0; li < docNameLines.length; li++) {
        page.drawText(docNameLines[li], { x: M, y: startY - li * LH, size: 8.5, font, color: rgb(0.1, 0.1, 0.12) });
      }
      txt(doc.tipo, M + 200, startY, 8.5);
      txt(sLabel(doc.status), M + 310, startY, 8.5);
      txt(fmtDate(doc.dataUpload || doc.dataAssinatura), M + 400, startY, 8.5);
      y -= rowLines * LH;
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

    check(LH + 4);
    line(y + 4);
    y -= 2;
    txt('TOTAL PAGO', M, y, 9, fontBold);
    txt(fmtCur(data.indicadores.totalPago), M + 120, y, 9, fontBold);
    y -= LH + 6;
  }

  // ═══ FOOTER ═══
  check(50);
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 2, color: primaryRgb });
  y -= 14;
  if (branding.report_footer_text) {
    txt(branding.report_footer_text, M, y, 7, font, rgb(0.5, 0.5, 0.55));
    y -= 10;
  }
  txt('Documento gerado automaticamente pelo sistema BolsaGO. Uso interno e institucional.', M, y, 7, font, rgb(0.5, 0.5, 0.55));
  y -= 10;
  txt('Os dados refletem a situacao no momento da geracao. Para informacoes atualizadas, consulte o sistema.', M, y, 7, font, rgb(0.5, 0.5, 0.55));
  y -= 12;
  txt(`ID: ${data.reportId}`, M, y, 7, font, rgb(0.4, 0.4, 0.45));

  // Draw watermark on all pages
  if (branding.watermark_text) {
    const pages = pdfDoc.getPages();
    for (const pg of pages) {
      pg.drawText(sanitize(branding.watermark_text), {
        x: W / 2 - branding.watermark_text.length * 6,
        y: H / 2,
        size: 48,
        font,
        color: rgb(0.9, 0.9, 0.9),
        opacity: 0.15,
        rotate: { type: "degrees" as const, angle: -45 },
      });
    }
  }

  return await pdfDoc.save();
}

function getSitInfo(s: string) {
  const map: Record<string, { label: string; emoji: string; fgColor: any; bgColor: any }> = {
    active:         { label: 'ATIVA',               emoji: '[OK]', fgColor: rgb(0.08, 0.5, 0.24), bgColor: rgb(0.86, 0.98, 0.9) },
    suspended:      { label: 'SUSPENSA',            emoji: '[!]', fgColor: rgb(0.7, 0.33, 0.04), bgColor: rgb(1, 0.97, 0.88) },
    completed:      { label: 'ENCERRADA',           emoji: '[OK]', fgColor: rgb(0.42, 0.42, 0.5), bgColor: rgb(0.95, 0.95, 0.96) },
    cancelled:      { label: 'CANCELADA',           emoji: '[X]', fgColor: rgb(0.86, 0.15, 0.15), bgColor: rgb(1, 0.89, 0.89) },
    pending_report: { label: 'PEND. RELATORIO',     emoji: '[*]', fgColor: rgb(0.85, 0.47, 0.02), bgColor: rgb(1, 0.98, 0.92) },
  };
  return map[s] || { label: s.toUpperCase(), emoji: '?', fgColor: rgb(0.22, 0.22, 0.28), bgColor: rgb(0.95, 0.95, 0.96) };
}
