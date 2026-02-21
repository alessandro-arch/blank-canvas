import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

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
  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();

  try {
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

    const db = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();

    // ─── STATUS CHECK MODE ───
    if (body.job_id) {
      const { data: doc } = await db
        .from("monthly_report_documents")
        .select("*")
        .eq("id", body.job_id)
        .maybeSingle();

      if (!doc) return jsonResponse({ status: "processing", jobId: body.job_id });
      
      const { data: signedData } = await db.storage
        .from("relatorios")
        .createSignedUrl(doc.storage_path, 900);

      return jsonResponse({
        status: "success",
        signedUrl: signedData?.signedUrl,
        jobId: body.job_id,
        sha256: doc.sha256,
      });
    }

    // ─── GENERATION MODE ───
    const reportId = body.report_id;
    if (!reportId) {
      return jsonResponse({ error: "report_id é obrigatório" }, 400);
    }

    // Verify report exists and is submitted
    const { data: report, error: reportError } = await db
      .from("monthly_reports")
      .select("*")
      .eq("id", reportId)
      .maybeSingle();

    if (reportError || !report) {
      return jsonResponse({ error: "Relatório não encontrado" }, 404);
    }

    if (report.status !== "submitted") {
      return jsonResponse({ error: "Relatório deve estar com status 'submitted'" }, 400);
    }

    const jobId = crypto.randomUUID();
    console.log(`[rid:${requestId}] Job ${jobId} started for report ${reportId}`);

    // @ts-ignore
    EdgeRuntime.waitUntil(
      generatePdfInBackground(db, jobId, reportId, report, user.id, requestId, startTime)
        .catch(async (err: any) => {
          console.error(`[rid:${requestId}] Background PDF generation failed:`, err);
        })
    );

    return jsonResponse({ jobId, status: "processing" });
  } catch (err: any) {
    console.error("PDF generation error:", err);
    return jsonResponse({ error: err.message || "Erro interno" }, 500);
  }
});

// ─── Background PDF generation ───
async function generatePdfInBackground(
  db: any,
  jobId: string,
  reportId: string,
  report: any,
  userId: string,
  requestId: string,
  startTime: number,
) {
  console.log(`[rid:${requestId}] Fetching data for monthly report ${reportId}`);

  // Fetch payload
  const { data: fields } = await db
    .from("monthly_report_fields")
    .select("payload")
    .eq("report_id", reportId)
    .maybeSingle();

  const payload = fields?.payload || {};

  // Fetch scholar profile
  const { data: profile } = await db
    .from("profiles")
    .select("full_name, email, institution")
    .eq("user_id", report.beneficiary_user_id)
    .maybeSingle();

  // Fetch project info
  const { data: project } = await db
    .from("projects")
    .select("code, title, orientador, thematic_projects(title, sponsor_name, organization_id)")
    .eq("id", report.project_id)
    .maybeSingle();

  // Fetch org branding
  let orgName = "Instituição";
  let primaryColor = "#1e3a5f";
  if (report.organization_id) {
    const { data: org } = await db
      .from("organizations")
      .select("name, primary_color")
      .eq("id", report.organization_id)
      .maybeSingle();
    if (org) {
      orgName = org.name;
      primaryColor = org.primary_color || "#1e3a5f";
    }
  }

  const scholarName = profile?.full_name || "Sem nome";
  const scholarEmail = profile?.email || "";
  const thematic = project?.thematic_projects as any;
  const periodLabel = `${String(report.period_month).padStart(2, "0")}/${report.period_year}`;
  const submittedAtStr = report.submitted_at
    ? new Date(report.submitted_at).toISOString()
    : new Date().toISOString();

  // Build PDF
  console.log(`[rid:${requestId}] Building PDF`);
  const pdfBytes = await buildMonthlyReportPdf({
    payload,
    scholarName,
    scholarEmail,
    institution: profile?.institution || null,
    projectCode: project?.code || "—",
    projectTitle: project?.title || "—",
    orientador: project?.orientador || "—",
    thematicTitle: thematic?.title || "—",
    sponsorName: thematic?.sponsor_name || "—",
    orgName,
    primaryColor,
    periodLabel,
    submittedAt: submittedAtStr,
    reportId,
  });

  // Calculate SHA-256 of the plain PDF (for integrity verification)
  const hashBuffer = await crypto.subtle.digest("SHA-256", pdfBytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const sha256 = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  // Encrypt PDF with AES-256-GCM before upload
  const cryptoKek = Deno.env.get("CRYPTO_KEK");
  let uploadBytes: Uint8Array;
  let storagePath: string;
  const basePath = `monthly-reports/${report.organization_id}/${report.project_id}/${report.beneficiary_user_id}/${report.period_year}-${String(report.period_month).padStart(2, "0")}`;

  if (cryptoKek && cryptoKek.length === 32) {
    // Encrypt: IV (12 bytes) + ciphertext + tag
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", enc.encode(cryptoKek), "AES-GCM", false, ["encrypt"]);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv, tagLength: 128 }, key, pdfBytes);
    const encBuf = new Uint8Array(encrypted);
    // Prepend IV to ciphertext+tag
    uploadBytes = new Uint8Array(iv.length + encBuf.length);
    uploadBytes.set(iv, 0);
    uploadBytes.set(encBuf, iv.length);
    storagePath = `${basePath}/relatorio_oficial_v${Date.now()}.pdf.enc`;
    console.log(`[rid:${requestId}] PDF encrypted with AES-256-GCM`);
  } else {
    // Fallback: upload plain PDF if KEK not configured
    uploadBytes = pdfBytes;
    storagePath = `${basePath}/relatorio_oficial_v${Date.now()}.pdf`;
    console.warn(`[rid:${requestId}] CRYPTO_KEK not configured — uploading plain PDF`);
  }

  const { error: uploadError } = await db.storage
    .from("relatorios")
    .upload(storagePath, uploadBytes, { contentType: "application/octet-stream", upsert: true });

  if (uploadError) {
    console.error(`[rid:${requestId}] Upload error:`, uploadError);
    return;
  }

  // Insert document record
  await db.from("monthly_report_documents").insert({
    id: jobId,
    report_id: reportId,
    type: "official_pdf",
    storage_path: storagePath,
    sha256,
    generated_by_user_id: userId,
    metadata: { pages: 1, period: periodLabel },
  });

  // Update monthly_reports with sha256 for integrity verification
  await db.from("monthly_reports").update({ pdf_sha256: sha256 }).eq("id", reportId);

  // Audit log
  await db.from("audit_logs").insert({
    user_id: userId,
    action: "report_pdf_generated",
    entity_type: "monthly_report",
    entity_id: reportId,
    organization_id: report.organization_id,
    details: { sha256, storage_path: storagePath, period: periodLabel, encrypted: storagePath.endsWith(".enc") },
  });

  console.log(`[rid:${requestId}] PDF generated in ${Date.now() - startTime}ms, sha256: ${sha256}`);
}

// ─── PDF Builder ───
interface PdfData {
  payload: any;
  scholarName: string;
  scholarEmail: string;
  institution: string | null;
  projectCode: string;
  projectTitle: string;
  orientador: string;
  thematicTitle: string;
  sponsorName: string;
  orgName: string;
  primaryColor: string;
  periodLabel: string;
  submittedAt: string;
  reportId: string;
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return rgb(
    parseInt(h.substring(0, 2), 16) / 255,
    parseInt(h.substring(2, 4), 16) / 255,
    parseInt(h.substring(4, 6), 16) / 255,
  );
}

function sanitize(text: string): string {
  // Replace problematic Unicode chars with ASCII equivalents for WinAnsi
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2013/g, "-")
    .replace(/\u2014/g, "--")
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ")
    .replace(/[^\x00-\xFF]/g, "?");
}

async function buildMonthlyReportPdf(data: PdfData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const primaryRgb = hexToRgb(data.primaryColor);

  const W = 595.28;
  const H = 841.89;
  const M = 50;
  const LH = 14;
  const COL = W - 2 * M;
  const FOOTER_H = 70;

  let page = pdfDoc.addPage([W, H]);
  let y = H - M;
  let pageNum = 1;

  const drawFooter = (pg: any, num: number) => {
    const footerY = M - 15;
    pg.drawLine({
      start: { x: M, y: footerY + FOOTER_H - 55 },
      end: { x: W - M, y: footerY + FOOTER_H - 55 },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    });

    const fSize = 6.5;
    const fColor = rgb(0.45, 0.45, 0.5);
    pg.drawText(sanitize("Plataforma BolsaGO: Inteligencia digital para a gestao de bolsas e projetos"), {
      x: M, y: footerY + 28, size: fSize, font, color: fColor,
    });
    pg.drawText(sanitize(`Autor: ${data.scholarName} | Email: ${data.scholarEmail}`), {
      x: M, y: footerY + 19, size: fSize, font, color: fColor,
    });
    pg.drawText(sanitize(`Periodo: ${data.periodLabel} | Envio: ${fmtDateTime(data.submittedAt)} UTC`), {
      x: M, y: footerY + 10, size: fSize, font, color: fColor,
    });
    pg.drawText(sanitize(`SHA-256: Calculado apos geracao | Status: Enviado`), {
      x: M, y: footerY + 1, size: fSize, font, color: fColor,
    });
    pg.drawText(sanitize(`Pagina ${num}`), {
      x: W - M - 40, y: footerY + 1, size: fSize, font, color: fColor,
    });
  };

  const newPage = () => {
    drawFooter(page, pageNum);
    page = pdfDoc.addPage([W, H]);
    pageNum++;
    y = H - M;
  };

  const check = (needed: number) => {
    if (y - needed < M + FOOTER_H) {
      newPage();
    }
  };

  const txt = (text: string, x: number, yy: number, size = 9.5, f = font, color = rgb(0.1, 0.1, 0.12)) => {
    page.drawText(sanitize(text), { x, y: yy, size, font: f, color });
  };

  const wrapText = (text: string, maxWidth: number, size: number, f = font): string[] => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      const w = f.widthOfTextAtSize(sanitize(test), size);
      if (w > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
  };

  const drawWrapped = (text: string, x: number, size = 9.5, f = font, color = rgb(0.1, 0.1, 0.12)) => {
    const lines = wrapText(text, COL - (x - M), size, f);
    for (const line of lines) {
      check(LH);
      txt(line, x, y, size, f, color);
      y -= LH;
    }
  };

  const sectionTitle = (title: string) => {
    check(30);
    y -= 8;
    page.drawRectangle({ x: M, y: y - 3, width: COL, height: 18, color: hexToRgb(data.primaryColor + "15") });
    page.drawLine({ start: { x: M, y: y - 3 }, end: { x: M, y: y + 15 }, thickness: 3, color: primaryRgb });
    txt(title, M + 8, y, 10, fontBold, primaryRgb);
    y -= LH + 4;
  };

  const labelValue = (label: string, value: string) => {
    check(LH);
    txt(label, M, y, 8.5, fontBold, rgb(0.3, 0.3, 0.35));
    txt(value, M + 140, y, 9, font, rgb(0.1, 0.1, 0.12));
    y -= LH;
  };

  const fmtDateTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()} ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
    } catch {
      return iso;
    }
  };

  // ═══ HEADER ═══
  page.drawRectangle({ x: M, y: y - 4, width: 28, height: 28, color: primaryRgb });
  txt("BG", M + 6, y + 2, 11, fontBold, rgb(1, 1, 1));
  txt("BolsaGO", M + 34, y + 6, 16, fontBold, primaryRgb);
  txt("Relatorio Mensal de Atividades", M + 34, y - 8, 8.5, font, rgb(0.5, 0.5, 0.55));
  txt(data.orgName, W - M - 150, y + 6, 8, fontBold, rgb(0.5, 0.5, 0.55));
  txt(`Periodo: ${data.periodLabel}`, W - M - 100, y - 6, 8, font, rgb(0.5, 0.5, 0.55));
  y -= 22;
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 2.5, color: primaryRgb });
  y -= 20;

  // ═══ IDENTIFICATION ═══
  sectionTitle("Identificacao");
  labelValue("Bolsista:", data.scholarName);
  labelValue("E-mail:", data.scholarEmail);
  if (data.institution) labelValue("Instituicao:", data.institution);
  labelValue("Orientador:", data.orientador);
  labelValue("Projeto Tematico:", data.thematicTitle);
  labelValue("Financiador:", data.sponsorName);
  labelValue("Subprojeto:", `${data.projectCode} - ${data.projectTitle}`);
  labelValue("Periodo:", data.periodLabel);
  labelValue("Enviado em:", `${fmtDateTime(data.submittedAt)} UTC`);
  y -= 6;

  // ═══ ATIVIDADES REALIZADAS ═══
  sectionTitle("Atividades Realizadas");
  drawWrapped(data.payload.atividades_realizadas || "Nao informado", M);
  y -= 4;

  // ═══ RESULTADOS ALCANCADOS ═══
  sectionTitle("Resultados Alcancados");
  drawWrapped(data.payload.resultados_alcancados || "Nao informado", M);
  y -= 4;

  // ═══ DIFICULDADES ═══
  if (data.payload.dificuldades_encontradas) {
    sectionTitle("Dificuldades Encontradas");
    drawWrapped(data.payload.dificuldades_encontradas, M);
    y -= 4;
  }

  // ═══ PROXIMOS PASSOS ═══
  if (data.payload.proximos_passos) {
    sectionTitle("Proximos Passos");
    drawWrapped(data.payload.proximos_passos, M);
    y -= 4;
  }

  // ═══ HORAS + ENTREGAS ═══
  if (data.payload.horas_dedicadas != null || (data.payload.entregas && data.payload.entregas.length > 0)) {
    sectionTitle("Dedicacao e Entregas");
    if (data.payload.horas_dedicadas != null) {
      labelValue("Horas dedicadas:", `${data.payload.horas_dedicadas}h`);
    }
    if (data.payload.entregas && data.payload.entregas.length > 0) {
      check(LH);
      txt("Entregas:", M, y, 8.5, fontBold, rgb(0.3, 0.3, 0.35));
      y -= LH;
      for (const item of data.payload.entregas) {
        check(LH);
        txt(`  - ${item}`, M + 10, y, 9);
        y -= LH;
      }
    }
    y -= 4;
  }

  // ═══ OBSERVACOES ═══
  if (data.payload.observacoes) {
    sectionTitle("Observacoes");
    drawWrapped(data.payload.observacoes, M);
    y -= 4;
  }

  // ═══ ELECTRONIC ACCEPTANCE ═══
  check(50);
  y -= 10;
  page.drawRectangle({ x: M, y: y - 30, width: COL, height: 40, color: rgb(0.95, 0.97, 0.99), borderColor: primaryRgb, borderWidth: 0.5 });
  txt("Declaracao Eletronica", M + 8, y, 9, fontBold, primaryRgb);
  txt(
    `Declaro que as informacoes contidas neste relatorio sao verdadeiras e refletem as atividades realizadas.`,
    M + 8, y - 14, 8, font, rgb(0.3, 0.3, 0.35),
  );
  txt(`Assinado eletronicamente por ${data.scholarName} em ${fmtDateTime(data.submittedAt)} UTC`, M + 8, y - 26, 7.5, font, rgb(0.5, 0.5, 0.55));
  y -= 40;

  // Draw footer on last page
  drawFooter(page, pageNum);

  return pdfDoc.save();
}
