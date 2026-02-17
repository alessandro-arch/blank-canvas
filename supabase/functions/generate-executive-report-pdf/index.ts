import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-request-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Max-Age": "86400",
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
  console.log(`[rid:${requestId}] generate-executive-report-pdf: request started`);
  try {
    // ─── 1) Auth ───
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Não autorizado" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
    if (!userRoles.includes("admin") && !userRoles.includes("manager")) {
      return jsonResponse({ error: "Acesso restrito a gestores e administradores" }, 403);
    }

    // ─── Parse input ───
    const body = await req.json();

    // ─── STATUS CHECK MODE: poll for job completion ───
    if (body.job_id) {
      const { data: log } = await db.from("pdf_logs").select("*").eq("id", body.job_id).maybeSingle();
      if (!log) return jsonResponse({ error: "Job não encontrado" }, 404);
      if (log.status === "processing") return jsonResponse({ status: "processing", jobId: body.job_id });
      if (log.status === "error") return jsonResponse({ status: "error", error: log.error_message, jobId: body.job_id });
      // Success - generate signed URL
      const { data: signedData } = await db.storage.from("relatorios").createSignedUrl(log.file_path, 900);
      return jsonResponse({ status: "success", signedUrl: signedData?.signedUrl, jobId: body.job_id });
    }

    // ─── GENERATION MODE: create job and process in background ───
    const projectId = body.projeto_id;
    if (!projectId) {
      return jsonResponse({ error: "projeto_id é obrigatório" }, 400);
    }

    // Quick check that the project exists
    const { data: tp, error: tpErr } = await db
      .from("thematic_projects")
      .select("id, organization_id")
      .eq("id", projectId)
      .maybeSingle();

    if (tpErr || !tp) {
      return jsonResponse({ error: "Projeto temático não encontrado" }, 404);
    }

    // Create job record
    const jobId = crypto.randomUUID();
    await db.from("pdf_logs").insert({
      id: jobId,
      user_id: userId,
      entity_type: "relatorio_executivo",
      entity_id: projectId,
      file_path: `pending/${jobId}`,
      status: "processing",
      organization_id: tp.organization_id,
    });

    console.log(`[rid:${requestId}] Job ${jobId} created, starting background generation`);

    // Start background processing
    // @ts-ignore - EdgeRuntime.waitUntil is available in Supabase Edge Functions
    EdgeRuntime.waitUntil(
      generateInBackground(db, jobId, projectId, userId, user.email || "usuário", requestId, startTime)
        .catch(async (err: any) => {
          console.error(`[rid:${requestId}] Background generation failed:`, err);
          await db.from("pdf_logs").update({
            status: "error",
            error_message: err.message || "Erro desconhecido na geração do PDF",
            generation_time_ms: Date.now() - startTime,
          }).eq("id", jobId);
        })
    );

    // Return immediately with job ID
    return jsonResponse({ jobId, status: "processing" });
  } catch (err: any) {
    console.error(`[rid:${requestId}] Executive report error:`, err);
    return jsonResponse({ error: err.message || "Erro interno", requestId }, 500);
  }
});

// ─── Background PDF generation ───
async function generateInBackground(
  db: any, jobId: string, projectId: string,
  userId: string, userEmail: string, requestId: string, startTime: number,
) {
  console.log(`[rid:${requestId}] Background: fetching data for project ${projectId}`);

  // ─── Fetch thematic project (full) ───
  const { data: tp, error: tpErr } = await db
    .from("thematic_projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();

  if (tpErr || !tp) throw new Error("Projeto temático não encontrado");

  const orgId = tp.organization_id || "00000000-0000-0000-0000-000000000000";

  // Parallel fetches
  const [orgResult, subsResult, auditResult] = await Promise.all([
    tp.organization_id
      ? db.from("organizations").select("name, logo_url, primary_color, secondary_color, watermark_text, report_footer_text").eq("id", tp.organization_id).maybeSingle()
      : Promise.resolve({ data: null }),
    db.from("projects").select("*").eq("thematic_project_id", projectId).order("code", { ascending: true }),
    db.from("audit_logs").select("action, entity_type, details, created_at, user_email").or(`entity_id.eq.${projectId},organization_id.eq.${orgId}`).order("created_at", { ascending: false }).limit(20),
  ]);

  let orgBranding = { name: "Instituição", primary_color: "#1e3a5f", secondary_color: "#f0f4f8", logo_url: null as string | null, watermark_text: null as string | null, report_footer_text: null as string | null };
  if (orgResult.data) {
    const org = orgResult.data;
    orgBranding = { name: org.name, primary_color: org.primary_color || "#1e3a5f", secondary_color: org.secondary_color || "#f0f4f8", logo_url: org.logo_url, watermark_text: org.watermark_text || null, report_footer_text: org.report_footer_text || null };
  }

  const subs = subsResult.data || [];
  const subIds = subs.map((s: any) => s.id);
  const activeSubs = subs.filter((s: any) => s.status === "active");
  const auditLogs = auditResult.data || [];

  let enrollments: any[] = [];
  if (subIds.length > 0) {
    const { data } = await db.from("enrollments").select("*").in("project_id", subIds);
    enrollments = data || [];
  }

  const activeEnrollments = enrollments.filter((e: any) => e.status === "active");
  const scholarUserIds = [...new Set(enrollments.map((e: any) => e.user_id))];
  const enrollmentIds = enrollments.map((e: any) => e.id);

  const [profilesResult, paymentsResult, reportsResult, termsResult] = await Promise.all([
    scholarUserIds.length > 0 ? db.from("profiles").select("user_id, full_name, email").in("user_id", scholarUserIds) : Promise.resolve({ data: [] }),
    enrollmentIds.length > 0 ? db.from("payments").select("*").in("enrollment_id", enrollmentIds) : Promise.resolve({ data: [] }),
    scholarUserIds.length > 0 ? db.from("reports").select("*").in("user_id", scholarUserIds) : Promise.resolve({ data: [] }),
    scholarUserIds.length > 0 ? db.from("grant_terms").select("user_id").in("user_id", scholarUserIds) : Promise.resolve({ data: [] }),
  ]);

  const allPayments = paymentsResult.data || [];
  const allReports = reportsResult.data || [];

  let grantTermsMap: Record<string, boolean> = {};
  for (const t of termsResult.data || []) grantTermsMap[t.user_id] = true;

  // ─── Calculate financial indicators ───
  const totalMensal = activeSubs.reduce((sum: number, s: any) => sum + Number(s.valor_mensal), 0);

  const calcMonthsDiff = (startStr: string, endStr: string): number => {
    const s = new Date(startStr);
    const e = new Date(endStr);
    return (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1;
  };
  let duracaoMeses = 0;
  if (tp.start_date && tp.end_date) {
    duracaoMeses = Math.max(1, calcMonthsDiff(tp.start_date, tp.end_date));
  }
  const valorTotalEstimadoBolsas = totalMensal * duracaoMeses;

  let valorTotalAtribuido = 0;
  for (const enr of activeEnrollments) {
    const sub = subs.find((s: any) => s.id === enr.project_id);
    if (!sub) continue;
    const months = Math.max(1, calcMonthsDiff(enr.start_date, enr.end_date));
    valorTotalAtribuido += months * Number(enr.grant_value);
  }

  if (tp.atribuicao_modo === "manual" && tp.valor_total_atribuido_bolsas_manual != null) {
    valorTotalAtribuido = Number(tp.valor_total_atribuido_bolsas_manual);
  }

  const diferencaAtribuicao = valorTotalEstimadoBolsas - valorTotalAtribuido;
  const percentualAtribuido = valorTotalEstimadoBolsas > 0 ? (valorTotalAtribuido / valorTotalEstimadoBolsas) * 100 : 0;

  const valorTotalProjeto = Number(tp.valor_total_projeto || 0);
  const taxaAdm = Number(tp.taxa_administrativa_percentual || 0);
  const impostos = Number(tp.impostos_percentual || 0);
  const valorTaxaAdm = valorTotalProjeto * (taxaAdm / 100);
  const valorImpostos = valorTotalProjeto * (impostos / 100);
  const encargosPrevistos = valorTaxaAdm + valorImpostos;
  const custoOperacionalBruto = valorTotalProjeto + encargosPrevistos;
  const percentualBolsasTeto = valorTotalProjeto > 0 ? (valorTotalEstimadoBolsas / valorTotalProjeto) * 100 : 0;

  const totalPaid = allPayments.filter((p: any) => p.status === "paid").reduce((s: number, p: any) => s + Number(p.amount), 0);
  const percentualExecutado = valorTotalEstimadoBolsas > 0 ? (totalPaid / valorTotalEstimadoBolsas) * 100 : 0;

  let percentualTemporal = 0;
  let mesesDecorridos = 0;
  if (tp.start_date && tp.end_date) {
    const start = new Date(tp.start_date).getTime();
    const end = new Date(tp.end_date).getTime();
    const now = Date.now();
    percentualTemporal = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
    mesesDecorridos = Math.max(0, Math.min(duracaoMeses, calcMonthsDiff(tp.start_date, new Date().toISOString().split("T")[0])));
  }

  const pendingReports = allReports.filter((r: any) => ["under_review", "pending"].includes(r.status)).length;
  const rejectedReports = allReports.filter((r: any) => r.status === "rejected").length;
  const pendingDocs = scholarUserIds.filter((uid) => !grantTermsMap[uid]).length;
  const pendingPayments = allPayments.filter((p: any) => ["pending", "eligible"].includes(p.status)).length;
  const pendingPaymentsValue = allPayments.filter((p: any) => ["pending", "eligible"].includes(p.status)).reduce((s: number, p: any) => s + Number(p.amount), 0);
  const cancelledPayments = allPayments.filter((p: any) => p.status === "cancelled").length;

  // Risk Score
  const riskPctComprometido = valorTotalProjeto > 0 ? valorTotalEstimadoBolsas / valorTotalProjeto : 0;
  const riskSaldo = valorTotalProjeto - valorTotalEstimadoBolsas;
  const riskExecFin = valorTotalProjeto > 0 ? totalPaid / valorTotalProjeto : 0;
  const riskExecTempo = duracaoMeses > 0 ? mesesDecorridos / duracaoMeses : 0;
  const riskDesvio = riskExecTempo - riskExecFin;

  let riskA = 0;
  if (riskPctComprometido <= 0.95) riskA = 0;
  else if (riskPctComprometido <= 1.00) riskA = 10;
  else if (riskPctComprometido <= 1.05) riskA = 25;
  else if (riskPctComprometido <= 1.10) riskA = 35;
  else riskA = 40;

  let riskB = 0;
  if (riskSaldo >= 0) riskB = 0;
  else {
    const ratio = valorTotalProjeto > 0 ? Math.abs(riskSaldo) / valorTotalProjeto : 1;
    if (ratio <= 0.02) riskB = 10;
    else if (ratio <= 0.05) riskB = 20;
    else riskB = 30;
  }

  let riskC = 0;
  if (riskDesvio <= 0.10) riskC = 0;
  else if (riskDesvio <= 0.20) riskC = 8;
  else if (riskDesvio <= 0.35) riskC = 14;
  else riskC = 20;

  let riskD = 0;
  if (pendingPaymentsValue === 0 && pendingPayments === 0) riskD = 0;
  else {
    const ratioP = valorTotalProjeto > 0 ? pendingPaymentsValue / valorTotalProjeto : 0;
    if (ratioP <= 0.01) riskD = 4;
    else if (ratioP <= 0.03) riskD = 7;
    else riskD = 10;
  }

  const riskScore = riskA + riskB + riskC + riskD;
  const riskLevel = riskScore <= 24 ? "BAIXO" : riskScore <= 49 ? "MODERADO" : "ALTO";

  const alerts: string[] = [];
  if (percentualAtribuido < 80) alerts.push(`Apenas ${percentualAtribuido.toFixed(1)}% do orçamento estimado foi atribuído a bolsas.`);
  if (percentualExecutado > percentualTemporal + 15) alerts.push("Execução financeira está acima do cronograma temporal.");
  if (percentualExecutado < percentualTemporal - 20) alerts.push("Execução financeira está significativamente abaixo do cronograma.");
  if (pendingDocs > 0) alerts.push(`${pendingDocs} bolsista(s) sem Termo de Outorga.`);
  if (rejectedReports > 0) alerts.push(`${rejectedReports} relatório(s) reprovado(s) aguardando reenvio.`);
  if (cancelledPayments > 0) alerts.push(`${cancelledPayments} pagamento(s) cancelado(s).`);
  if (riskLevel === "ALTO") alerts.push(`Índice de Risco Financeiro: ${riskLevel} (${riskScore}/100).`);

  console.log(`[rid:${requestId}] Background: building PDF`);

  const reportUuid = crypto.randomUUID();
  const pdfBytes = await buildExecutivePdf({
    orgName: orgBranding.name,
    primaryColor: orgBranding.primary_color,
    watermarkText: orgBranding.watermark_text,
    reportFooterText: orgBranding.report_footer_text,
    projectTitle: tp.title,
    sponsor: tp.sponsor_name,
    status: tp.status,
    startDate: tp.start_date,
    endDate: tp.end_date,
    duracaoMeses,
    valorTotalProjeto, valorTotalEstimadoBolsas, valorTotalAtribuido,
    diferencaAtribuicao, percentualAtribuido, taxaAdm, impostos,
    valorTaxaAdm, valorImpostos, encargosPrevistos, custoOperacionalBruto,
    percentualBolsasTeto, totalMensal, totalPaid, percentualExecutado, percentualTemporal,
    totalBolsas: subs.length, activeBolsas: activeSubs.length,
    activeEnrollments: activeEnrollments.length,
    pendingReports, rejectedReports, pendingDocs,
    pendingPayments, pendingPaymentsValue, cancelledPayments,
    riskScore, riskLevel, riskA, riskB, riskC, riskD,
    riskPctComprometido, riskSaldo, riskDesvio, alerts,
    auditLogs: auditLogs.map((l: any) => ({
      date: l.created_at, action: l.action, entityType: l.entity_type,
      userEmail: l.user_email || "sistema",
      details: typeof l.details === "object" ? JSON.stringify(l.details) : String(l.details || ""),
    })),
    reportId: reportUuid,
    generatedAt: new Date().toISOString(),
    generatedBy: userEmail,
  });

  // Upload
  const uploadOrgId = tp.organization_id || "global";
  const filePath = `tenant/${uploadOrgId}/relatorios/executivos/${reportUuid}.pdf`;

  console.log(`[rid:${requestId}] Background: uploading PDF (${pdfBytes.length} bytes)`);

  const { error: uploadError } = await db.storage
    .from("relatorios")
    .upload(filePath, pdfBytes, { contentType: "application/pdf", upsert: true });

  if (uploadError) {
    console.error(`[rid:${requestId}] Upload error:`, uploadError);
    await db.from("pdf_logs").update({
      status: "error",
      error_message: "Falha ao salvar PDF: " + uploadError.message,
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

// ─── PDF Builder ─────────────────────────────────────────────────────────────

interface ExecutiveData {
  orgName: string;
  primaryColor: string;
  watermarkText: string | null;
  reportFooterText: string | null;
  projectTitle: string;
  sponsor: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  duracaoMeses: number;
  valorTotalProjeto: number;
  valorTotalEstimadoBolsas: number;
  valorTotalAtribuido: number;
  diferencaAtribuicao: number;
  percentualAtribuido: number;
  taxaAdm: number;
  impostos: number;
  valorTaxaAdm: number;
  valorImpostos: number;
  encargosPrevistos: number;
  custoOperacionalBruto: number;
  percentualBolsasTeto: number;
  totalMensal: number;
  totalPaid: number;
  percentualExecutado: number;
  percentualTemporal: number;
  totalBolsas: number;
  activeBolsas: number;
  activeEnrollments: number;
  pendingReports: number;
  rejectedReports: number;
  pendingDocs: number;
  pendingPayments: number;
  pendingPaymentsValue: number;
  cancelledPayments: number;
  riskScore: number;
  riskLevel: string;
  riskA: number;
  riskB: number;
  riskC: number;
  riskD: number;
  riskPctComprometido: number;
  riskSaldo: number;
  riskDesvio: number;
  alerts: string[];
  auditLogs: { date: string; action: string; entityType: string; userEmail: string; details: string }[];
  reportId: string;
  generatedAt: string;
  generatedBy: string;
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  return rgb(r, g, b);
}

async function buildExecutivePdf(data: ExecutiveData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const W = 595.28;  // A4 portrait
  const H = 841.89;
  const M = 40;
  const LH = 14;
  const COL = W - 2 * M;

  const primaryRgb = hexToRgb(data.primaryColor);
  const darkText = rgb(0.1, 0.1, 0.12);
  const grayText = rgb(0.45, 0.45, 0.5);
  const lightGray = rgb(0.88, 0.88, 0.88);
  const white = rgb(1, 1, 1);
  const greenColor = rgb(0.08, 0.5, 0.24);
  const orangeColor = rgb(0.85, 0.47, 0.02);
  const redColor = rgb(0.86, 0.15, 0.15);

  let page = pdfDoc.addPage([W, H]);
  let y = H - M;

  const txt = (text: string, x: number, yy: number, size = 9, f = font, color = darkText) => {
    const maxChars = Math.floor((W - x - M) / (size * 0.48));
    const t = text.length > maxChars ? text.substring(0, maxChars - 2) + "…" : text;
    page.drawText(t, { x, y: yy, size, font: f, color });
  };

  const line = (yy: number, thick = 0.5) => {
    page.drawLine({ start: { x: M, y: yy }, end: { x: W - M, y: yy }, thickness: thick, color: lightGray });
  };

  const check = (needed: number) => {
    if (y - needed < M + 30) {
      drawPageFooter();
      if (data.watermarkText) drawWatermark();
      page = pdfDoc.addPage([W, H]);
      y = H - M;
    }
  };

  const drawWatermark = () => {
    const wText = data.watermarkText || "";
    if (!wText) return;
    // Draw diagonal watermark text across page
    page.drawText(wText, {
      x: W / 2 - wText.length * 6,
      y: H / 2,
      size: 48,
      font,
      color: rgb(0.9, 0.9, 0.9),
      opacity: 0.15,
      rotate: { type: "degrees" as const, angle: -45 },
    });
  };

  const drawPageFooter = () => {
    const pageNum = pdfDoc.getPageCount();
    txt(`${data.orgName} — Relatório Executivo`, M, 22, 6, font, grayText);
    txt(`Página ${pageNum}`, W - M - 40, 22, 6, font, grayText);
  };

  const fmtDate = (d: string | null) => {
    if (!d) return "—";
    try {
      const dt = new Date(d);
      return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
    } catch { return d; }
  };

  const fmtDatetime = (d: string | null) => {
    if (!d) return "—";
    try {
      const dt = new Date(d);
      return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()} ${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
    } catch { return d; }
  };

  const fmtCur = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtPct = (v: number) => `${v.toFixed(1)}%`;

  const sLabel: Record<string, string> = { active: "Ativo", inactive: "Inativo", archived: "Arquivado" };

  const sectionTitle = (title: string, num: string) => {
    check(40);
    y -= 8;
    page.drawRectangle({ x: M, y: y - 4, width: 18, height: 18, color: primaryRgb });
    txt(num, M + 5, y, 9, fontBold, white);
    txt(title, M + 24, y, 11, fontBold, primaryRgb);
    y -= 8;
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 1.5, color: primaryRgb });
    y -= LH + 2;
  };

  const kv = (label: string, value: string, x = M, bold = false) => {
    check(LH + 2);
    txt(label, x, y, 7, fontBold, grayText);
    txt(value, x + 4, y - 11, bold ? 11 : 9, bold ? fontBold : font);
    y -= 22;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // CAPA
  // ═══════════════════════════════════════════════════════════════════════════

  // Top stripe
  page.drawRectangle({ x: 0, y: H - 80, width: W, height: 80, color: primaryRgb });
  txt(data.orgName.toUpperCase(), M, H - 35, 10, fontBold, white);
  txt("RELATÓRIO EXECUTIVO DE BOLSAS", M, H - 55, 18, fontBold, white);
  txt(fmtDate(data.generatedAt), W - M - 80, H - 35, 8, font, rgb(0.8, 0.85, 0.95));

  y = H - 120;

  // Project info block
  page.drawRectangle({ x: M, y: y - 90, width: COL, height: 100, borderColor: primaryRgb, borderWidth: 1.5 });
  txt("PROJETO TEMÁTICO", M + 12, y - 6, 7, fontBold, grayText);
  txt(data.projectTitle, M + 12, y - 22, 13, fontBold, primaryRgb);
  txt("FINANCIADOR:", M + 12, y - 42, 7, fontBold, grayText);
  txt(data.sponsor, M + 12, y - 55, 10, font);
  txt("STATUS:", W / 2, y - 42, 7, fontBold, grayText);
  txt(sLabel[data.status] || data.status, W / 2, y - 55, 10, fontBold);
  txt("VIGÊNCIA:", M + 12, y - 72, 7, fontBold, grayText);
  txt(`${fmtDate(data.startDate)} a ${fmtDate(data.endDate)} (${data.duracaoMeses} meses)`, M + 12, y - 84, 9, font);

  y -= 110;

  // Cover KPIs
  check(90);
  const coverKpiW = (COL - 20) / 3;
  const coverKpis = [
    { label: "BOLSAS ATIVAS", value: `${data.activeBolsas} / ${data.totalBolsas}`, color: primaryRgb },
    { label: "% EXECUTADO", value: fmtPct(data.percentualExecutado), color: data.percentualExecutado > 0 ? greenColor : orangeColor },
    { label: "TOTAL PAGO", value: fmtCur(data.totalPaid), color: greenColor },
  ];

  for (let i = 0; i < coverKpis.length; i++) {
    const kx = M + i * (coverKpiW + 10);
    page.drawRectangle({ x: kx, y: y - 50, width: coverKpiW, height: 60, color: rgb(0.96, 0.97, 0.98), borderColor: lightGray, borderWidth: 0.5 });
    txt(coverKpis[i].label, kx + 10, y - 8, 7, fontBold, grayText);
    txt(coverKpis[i].value, kx + 10, y - 28, 14, fontBold, coverKpis[i].color);
  }

  y -= 75;

  // Alerts on cover
  if (data.alerts.length > 0) {
    check(30 + data.alerts.length * 14);
    page.drawRectangle({ x: M, y: y - 10 - data.alerts.length * 14, width: COL, height: 20 + data.alerts.length * 14, color: rgb(1, 0.97, 0.94), borderColor: orangeColor, borderWidth: 1 });
    txt("⚠  ALERTAS ESTRATÉGICOS", M + 10, y - 2, 8, fontBold, orangeColor);
    for (let i = 0; i < data.alerts.length; i++) {
      txt(`• ${data.alerts[i]}`, M + 14, y - 16 - i * 13, 8, font, rgb(0.4, 0.3, 0.15));
    }
    y -= 24 + data.alerts.length * 13;
  }

  txt(`Gerado por: ${data.generatedBy}`, M, y - 10, 7, font, grayText);
  txt(`ID: ${data.reportId}`, W - M - 180, y - 10, 7, font, grayText);

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 2+: VISÃO FINANCEIRA
  // ═══════════════════════════════════════════════════════════════════════════
  if (data.watermarkText) drawWatermark();
  drawPageFooter();
  page = pdfDoc.addPage([W, H]);
  y = H - M;

  // ═══════════════════════════════════════════════════════════════════════════
  // SEÇÃO: ESTRUTURA ORÇAMENTÁRIA DO PROJETO
  // ═══════════════════════════════════════════════════════════════════════════
  sectionTitle("ESTRUTURA ORÇAMENTÁRIA DO PROJETO", "1");

  // Texto institucional explicativo
  check(80);
  const orcTexto = [
    `O projeto "${data.projectTitle}", financiado por ${data.sponsor}, possui orcamento total aprovado de ${fmtCur(data.valorTotalProjeto)}.`,
    `Desse montante, o teto destinado as bolsas e de ${fmtCur(data.valorTotalEstimadoBolsas)}, representando ${fmtPct(data.percentualBolsasTeto)} do orcamento total.`,
    `Os encargos previstos totalizam ${fmtCur(data.encargosPrevistos)}, compostos por ISS (${fmtCur(data.valorImpostos)}) e Taxa Administrativa (${fmtCur(data.valorTaxaAdm)}).`,
    `O custo operacional bruto e de ${fmtCur(data.custoOperacionalBruto)} (orcamento + encargos), valor informativo para o financiador.`,
  ];
  for (const linha of orcTexto) {
    check(LH + 2);
    txt(linha, M, y, 8.5, font);
    y -= LH + 2;
  }
  y -= 6;

  // Tabela orçamentária
  check(140);
  const orcRows = [
    { label: "Orcamento Total Aprovado (Teto do Projeto)", value: fmtCur(data.valorTotalProjeto), bold: true, highlight: true },
    { label: "Teto em Bolsas", value: fmtCur(data.valorTotalEstimadoBolsas), bold: true, highlight: true },
    { label: `ISS (${fmtPct(data.impostos)})`, value: fmtCur(data.valorImpostos), bold: false, highlight: false },
    { label: `Taxa Administrativa (${fmtPct(data.taxaAdm)})`, value: fmtCur(data.valorTaxaAdm), bold: false, highlight: false },
    { label: "Encargos Previstos (ISS + Tx. Adm.)", value: fmtCur(data.encargosPrevistos), bold: true, highlight: false },
    { label: "Custo Operacional Bruto (Teto + Encargos)", value: fmtCur(data.custoOperacionalBruto), bold: true, highlight: true },
  ];

  // Table header
  page.drawRectangle({ x: M, y: y - 4, width: COL, height: LH + 6, color: primaryRgb });
  txt("ITEM", M + 6, y, 8, fontBold, white);
  txt("VALOR", W - M - 110, y, 8, fontBold, white);
  y -= LH + 6;

  for (const row of orcRows) {
    check(LH + 4);
    if (row.highlight) {
      page.drawRectangle({ x: M, y: y - 4, width: COL, height: LH + 4, color: rgb(0.96, 0.97, 0.98) });
    }
    txt(row.label, M + 6, y, 9, row.bold ? fontBold : font);
    txt(row.value, W - M - 110, y, 10, row.bold ? fontBold : font, row.bold ? primaryRgb : darkText);
    y -= LH + 4;
  }

  // Indicador percentual
  y -= 4;
  check(LH + 4);
  page.drawRectangle({ x: M, y: y - 4, width: COL, height: LH + 6, color: rgb(0.94, 0.96, 0.99), borderColor: primaryRgb, borderWidth: 0.5 });
  txt("% do orcamento destinado a bolsas:", M + 6, y, 8, fontBold, grayText);
  txt(fmtPct(data.percentualBolsasTeto), W - M - 110, y, 11, fontBold, primaryRgb);
  y -= LH + 10;

  // ═══════════════════════════════════════════════════════════════════════════
  // VISÃO FINANCEIRA (EXECUÇÃO)
  // ═══════════════════════════════════════════════════════════════════════════
  sectionTitle("EXECUÇÃO FINANCEIRA", "2");

  const finRows = [
    { label: "Valor Total Atribuido a Bolsas", value: fmtCur(data.valorTotalAtribuido), bold: true },
    { label: "Diferenca (Estimado - Atribuido)", value: fmtCur(data.diferencaAtribuicao), bold: false },
    { label: "% Atribuido", value: fmtPct(data.percentualAtribuido), bold: true },
    { label: "Valor Mensal Total (bolsas ativas)", value: fmtCur(data.totalMensal), bold: false },
    { label: "Total Efetivamente Pago", value: fmtCur(data.totalPaid), bold: true },
    { label: "% Execução de Bolsas (pago/teto bolsas)", value: fmtPct(data.percentualExecutado), bold: true },
  ];

  for (const row of finRows) {
    check(LH + 4);
    if (row.bold) {
      page.drawRectangle({ x: M, y: y - 4, width: COL, height: LH + 4, color: rgb(0.96, 0.97, 0.98) });
    }
    txt(row.label, M + 6, y, 9, row.bold ? fontBold : font);
    txt(row.value, W - M - 120, y, 10, row.bold ? fontBold : font, row.bold ? primaryRgb : darkText);
    y -= LH + 4;
  }

  y -= 10;

  // ═══ INDICADORES ESTRATÉGICOS ═══
  sectionTitle("INDICADORES ESTRATÉGICOS", "3");

  const indicatorKpiW = (COL - 10) / 2;
  const indicatorRows = [
    [
      { label: "Duração do Projeto", value: `${data.duracaoMeses} meses` },
      { label: "Execução Temporal", value: fmtPct(data.percentualTemporal) },
    ],
    [
      { label: "Bolsas Cadastradas", value: `${data.totalBolsas}` },
      { label: "Bolsas Ativas", value: `${data.activeBolsas}` },
    ],
    [
      { label: "Bolsistas Vinculados", value: `${data.activeEnrollments}` },
      { label: "Termos de Outorga Pendentes", value: `${data.pendingDocs}` },
    ],
  ];

  for (const row of indicatorRows) {
    check(42);
    for (let i = 0; i < row.length; i++) {
      const kx = M + i * (indicatorKpiW + 10);
      page.drawRectangle({ x: kx, y: y - 28, width: indicatorKpiW, height: 36, borderColor: lightGray, borderWidth: 0.5 });
      txt(row[i].label, kx + 8, y - 6, 7, fontBold, grayText);
      txt(row[i].value, kx + 8, y - 21, 12, fontBold, primaryRgb);
    }
    y -= 44;
  }

  y -= 6;

  // ═══ ANÁLISE AUTOMÁTICA ═══
  sectionTitle("ANÁLISE AUTOMÁTICA", "4");

  // Progress bars comparison
  check(60);
  txt("Execução Financeira vs Temporal", M, y, 9, fontBold);
  y -= 16;

  // Financial bar
  txt("Financeiro:", M, y, 7, fontBold, grayText);
  const barX = M + 70;
  const barW = COL - 80;
  const barH = 12;
  page.drawRectangle({ x: barX, y: y - 2, width: barW, height: barH, color: rgb(0.92, 0.92, 0.92) });
  const finFill = Math.min(1, data.percentualExecutado / 100);
  page.drawRectangle({ x: barX, y: y - 2, width: barW * finFill, height: barH, color: greenColor });
  txt(fmtPct(data.percentualExecutado), barX + barW + 4, y, 8, fontBold, greenColor);
  y -= 20;

  // Temporal bar
  txt("Temporal:", M, y, 7, fontBold, grayText);
  page.drawRectangle({ x: barX, y: y - 2, width: barW, height: barH, color: rgb(0.92, 0.92, 0.92) });
  const tempFill = Math.min(1, data.percentualTemporal / 100);
  page.drawRectangle({ x: barX, y: y - 2, width: barW * tempFill, height: barH, color: primaryRgb });
  txt(fmtPct(data.percentualTemporal), barX + barW + 4, y, 8, fontBold, primaryRgb);
  y -= 30;

  // Diagnosis
  check(30);
  const gap = data.percentualExecutado - data.percentualTemporal;
  let diagnosis = "";
  let diagColor = greenColor;
  if (Math.abs(gap) < 10) {
    diagnosis = "Execução financeira alinhada com o cronograma temporal.";
    diagColor = greenColor;
  } else if (gap > 0) {
    diagnosis = `Execução financeira está ${fmtPct(gap)} acima do cronograma. Atenção ao consumo acelerado do orçamento.`;
    diagColor = orangeColor;
  } else {
    diagnosis = `Execução financeira está ${fmtPct(Math.abs(gap))} abaixo do cronograma. Possível atraso nos pagamentos.`;
    diagColor = orangeColor;
  }
  page.drawRectangle({ x: M, y: y - 6, width: COL, height: 20, color: rgb(0.96, 0.98, 0.96), borderColor: diagColor, borderWidth: 0.5 });
  txt(`Diagnóstico: ${diagnosis}`, M + 8, y, 8, font, diagColor);
  y -= 30;

  // ═══ GOVERNANÇA FINANCEIRA E RISCO ═══
  sectionTitle("GOVERNANÇA FINANCEIRA E RISCO", "5");

  // Classification badge
  check(50);
  const riskColor = data.riskLevel === "BAIXO" ? greenColor : data.riskLevel === "MODERADO" ? orangeColor : redColor;
  const riskBg = data.riskLevel === "BAIXO" ? rgb(0.92, 0.98, 0.93) : data.riskLevel === "MODERADO" ? rgb(1, 0.97, 0.91) : rgb(1, 0.93, 0.93);
  page.drawRectangle({ x: M, y: y - 30, width: COL, height: 40, color: riskBg, borderColor: riskColor, borderWidth: 1.5 });
  txt("ÍNDICE DE RISCO FINANCEIRO", M + 10, y - 6, 8, fontBold, grayText);
  txt(data.riskLevel, M + 10, y - 22, 16, fontBold, riskColor);
  txt(`Score: ${data.riskScore}/100`, M + 120, y - 22, 12, fontBold, riskColor);
  txt("Base: teto_projeto. Encargos previstos não geram risco.", W - M - 260, y - 6, 7, font, grayText);
  y -= 48;

  // Indicators summary
  check(60);
  const riskIndicators = [
    { label: "Comprometimento (teto bolsas / teto projeto)", value: fmtPct(data.riskPctComprometido * 100) },
    { label: "Saldo disponível", value: fmtCur(data.riskSaldo) },
    { label: "Desvio tempo × financeiro", value: fmtPct(data.riskDesvio * 100) },
    { label: "Pagamentos pendentes", value: `${data.pendingPayments} (${fmtCur(data.pendingPaymentsValue)})` },
  ];
  for (const ind of riskIndicators) {
    check(LH + 4);
    txt(ind.label, M + 6, y, 9, font);
    txt(ind.value, W - M - 140, y, 10, fontBold);
    y -= LH + 3;
  }
  y -= 6;

  // Factors table
  check(90);
  txt("DECOMPOSIÇÃO DO SCORE", M, y, 8, fontBold, grayText);
  y -= LH;

  page.drawRectangle({ x: M, y: y - 4, width: COL, height: LH + 6, color: primaryRgb });
  txt("FATOR", M + 6, y, 8, fontBold, white);
  txt("PONTOS", W - M - 110, y, 8, fontBold, white);
  txt("MÁXIMO", W - M - 55, y, 8, fontBold, white);
  y -= LH + 6;

  const riskFactors = [
    { label: "A) Comprometimento orçamentário", score: data.riskA, max: 40 },
    { label: "B) Saldo financeiro", score: data.riskB, max: 30 },
    { label: "C) Desvio tempo × financeiro", score: data.riskC, max: 20 },
    { label: "D) Pendências operacionais", score: data.riskD, max: 10 },
  ];

  for (let i = 0; i < riskFactors.length; i++) {
    check(LH + 4);
    const f = riskFactors[i];
    if (i % 2 === 0) {
      page.drawRectangle({ x: M, y: y - 4, width: COL, height: LH + 4, color: rgb(0.96, 0.97, 0.98) });
    }
    txt(f.label, M + 6, y, 9, font);
    const fColor = f.score > f.max * 0.6 ? redColor : f.score > f.max * 0.3 ? orangeColor : greenColor;
    txt(String(f.score), W - M - 110, y, 10, fontBold, fColor);
    txt(String(f.max), W - M - 55, y, 10, font, grayText);
    y -= LH + 4;
  }

  // Total row
  check(LH + 6);
  page.drawRectangle({ x: M, y: y - 4, width: COL, height: LH + 6, color: riskBg, borderColor: riskColor, borderWidth: 0.5 });
  txt("TOTAL", M + 6, y, 10, fontBold);
  txt(String(data.riskScore), W - M - 110, y, 12, fontBold, riskColor);
  txt("100", W - M - 55, y, 10, font, grayText);
  y -= LH + 10;

  // ═══ PENDÊNCIAS ═══
  sectionTitle("PENDÊNCIAS DOCUMENTAIS E OPERACIONAIS", "6");

  const pendItems = [
    { label: "Relatórios em análise/pendentes", value: data.pendingReports, color: data.pendingReports > 0 ? orangeColor : greenColor },
    { label: "Relatórios reprovados (aguardando reenvio)", value: data.rejectedReports, color: data.rejectedReports > 0 ? redColor : greenColor },
    { label: "Termos de Outorga pendentes", value: data.pendingDocs, color: data.pendingDocs > 0 ? orangeColor : greenColor },
    { label: "Pagamentos pendentes/liberados", value: data.pendingPayments, color: data.pendingPayments > 0 ? orangeColor : greenColor },
    { label: "Pagamentos cancelados", value: data.cancelledPayments, color: data.cancelledPayments > 0 ? redColor : greenColor },
  ];

  for (const item of pendItems) {
    check(LH + 4);
    const icon = item.value > 0 ? "-" : "o";
    txt(icon, M + 2, y, 8, fontBold, item.color);
    txt(item.label, M + 16, y, 9, font);
    txt(String(item.value), W - M - 30, y, 10, fontBold, item.color);
    y -= LH + 3;
  }
  y -= 8;

  // ═══ HISTÓRICO DE ALTERAÇÕES ═══
  sectionTitle("HISTÓRICO DE ALTERAÇÕES RECENTES", "7");

  if (data.auditLogs.length === 0) {
    txt("Nenhum registro de alteração encontrado.", M, y, 9, font, grayText);
    y -= LH;
  } else {
    // Table header
    check(LH + 4);
    txt("DATA/HORA", M, y, 7, fontBold, grayText);
    txt("AÇÃO", M + 110, y, 7, fontBold, grayText);
    txt("TIPO", M + 260, y, 7, fontBold, grayText);
    txt("USUÁRIO", M + 360, y, 7, fontBold, grayText);
    y -= 4;
    line(y);
    y -= LH;

    for (const log of data.auditLogs.slice(0, 15)) {
      check(LH + 2);
      txt(fmtDatetime(log.date), M, y, 7, font);
      txt(log.action.substring(0, 25), M + 110, y, 7, font);
      txt(log.entityType.substring(0, 18), M + 260, y, 7, font);
      txt(log.userEmail.substring(0, 25), M + 360, y, 7, font, grayText);
      y -= LH;
    }

    if (data.auditLogs.length > 15) {
      txt(`... e mais ${data.auditLogs.length - 15} registro(s)`, M, y, 7, font, grayText);
      y -= LH;
    }
  }
  y -= 8;

  // ═══ ALERTAS ═══
  if (data.alerts.length > 0) {
    sectionTitle("ALERTAS", "8");
    for (const alert of data.alerts) {
      check(LH + 4);
      txt("▲", M + 2, y, 8, fontBold, orangeColor);
      txt(alert, M + 16, y, 9, font);
      y -= LH + 3;
    }
    y -= 8;
  }

  // ═══ FINAL FOOTER ═══
  check(60);
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 2, color: primaryRgb });
  y -= 14;
  if (data.reportFooterText) {
    txt(data.reportFooterText, M, y, 7, font, grayText);
    y -= 10;
  }
  txt("Documento gerado automaticamente pelo sistema InnovaGO. Uso interno e institucional.", M, y, 7, font, grayText);
  y -= 10;
  txt("Os indicadores são recalculados no momento da geração e refletem a situação atual do projeto.", M, y, 7, font, grayText);
  y -= 10;
  txt(`ID: ${data.reportId} | Gerado em: ${fmtDatetime(data.generatedAt)} | Por: ${data.generatedBy}`, M, y, 6, font, grayText);

  if (data.watermarkText) drawWatermark();
  drawPageFooter();

  return await pdfDoc.save();
}
