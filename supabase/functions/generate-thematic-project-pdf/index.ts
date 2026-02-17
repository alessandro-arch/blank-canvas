import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

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
  const requestId = req.headers.get("x-request-id") || `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
  console.log(`[rid:${requestId}] generate-thematic-project-pdf: request started`);
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

    // ─── 2) Parse input ───
    const body = await req.json();
    const projectId = body.thematic_project_id;
    if (!projectId) {
      return jsonResponse({ error: "thematic_project_id é obrigatório" }, 400);
    }

    // ─── 3) Fetch thematic project ───
    const { data: tp, error: tpErr } = await db
      .from("thematic_projects")
      .select("*")
      .eq("id", projectId)
      .maybeSingle();

    if (tpErr || !tp) {
      return jsonResponse({ error: "Projeto temático não encontrado" }, 404);
    }

    // ─── 4) Fetch subprojects ───
    const { data: subprojects } = await db
      .from("projects")
      .select("*")
      .eq("thematic_project_id", projectId)
      .order("code", { ascending: true });

    const subs = subprojects || [];
    const subIds = subs.map((s: any) => s.id);

    // ─── 5) Fetch enrollments for all subprojects ───
    let enrollments: any[] = [];
    if (subIds.length > 0) {
      const { data } = await db
        .from("enrollments")
        .select("*")
        .in("project_id", subIds);
      enrollments = data || [];
    }

    const enrollmentByProject: Record<string, any> = {};
    for (const e of enrollments) {
      if (!enrollmentByProject[e.project_id] || e.status === "active") {
        enrollmentByProject[e.project_id] = e;
      }
    }

    // ─── 6) Fetch scholar profiles ───
    const scholarUserIds = [...new Set(enrollments.map((e: any) => e.user_id))];
    let profilesMap: Record<string, any> = {};
    if (scholarUserIds.length > 0) {
      const { data: profiles } = await db
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", scholarUserIds);
      for (const p of profiles || []) {
        profilesMap[p.user_id] = p;
      }
    }

    // ─── 7) Fetch reports and payments for all enrolled users ───
    const enrollmentIds = enrollments.map((e: any) => e.id);
    let allReports: any[] = [];
    let allPayments: any[] = [];

    if (scholarUserIds.length > 0) {
      const { data: reps } = await db
        .from("reports")
        .select("user_id, status, reference_month")
        .in("user_id", scholarUserIds);
      allReports = reps || [];
    }

    if (enrollmentIds.length > 0) {
      const { data: pays } = await db
        .from("payments")
        .select("enrollment_id, status, amount, reference_month")
        .in("enrollment_id", enrollmentIds);
      allPayments = pays || [];
    }

    // ─── 8) Fetch grant terms ───
    let grantTermsMap: Record<string, boolean> = {};
    if (scholarUserIds.length > 0) {
      const { data: terms } = await db
        .from("grant_terms")
        .select("user_id")
        .in("user_id", scholarUserIds);
      for (const t of terms || []) {
        grantTermsMap[t.user_id] = true;
      }
    }

    // ─── 9) Build consolidated data ───
    const totalBolsas = subs.length;
    const activeBolsas = subs.filter((s: any) => s.status === "active").length;
    const totalMensal = subs.reduce((sum: number, s: any) => sum + Number(s.valor_mensal), 0);

    // Calculate estimated total over period
    let totalEstimado = 0;
    for (const s of subs) {
      const start = new Date(s.start_date);
      const end = new Date(s.end_date);
      const months = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30)));
      totalEstimado += months * Number(s.valor_mensal);
    }

    const pendingReports = allReports.filter((r: any) => ["under_review", "pending"].includes(r.status)).length;
    const rejectedReports = allReports.filter((r: any) => r.status === "rejected").length;
    const pendingDocuments = scholarUserIds.filter((uid) => !grantTermsMap[uid]).length;
    const blockedPayments = allPayments.filter((p: any) => p.status === "cancelled").length;
    const pendingPayments = allPayments.filter((p: any) => ["pending", "eligible"].includes(p.status)).length;
    const totalPaid = allPayments.filter((p: any) => p.status === "paid").reduce((s: number, p: any) => s + Number(p.amount), 0);

    // Top 10 nearest events
    const today = new Date();
    interface EventItem { descricao: string; data: string | null; urgencia: string }
    const eventos: EventItem[] = [];

    for (const s of subs) {
      if (s.status !== "active") continue;
      const end = new Date(s.end_date);
      const days = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (days <= 90) {
        const urg = days <= 0 ? "critico" : days <= 30 ? "critico" : "atencao";
        const desc = days <= 0
          ? `Vigência encerrada: ${s.code}`
          : `${s.code} encerra em ${days} dia(s)`;
        eventos.push({ descricao: desc, data: s.end_date, urgencia: urg });
      }
    }

    // Sort by urgency then date and take top 10
    eventos.sort((a, b) => {
      const urgOrder: Record<string, number> = { critico: 0, atencao: 1, info: 2 };
      if (urgOrder[a.urgencia] !== urgOrder[b.urgencia]) return urgOrder[a.urgencia] - urgOrder[b.urgencia];
      return (a.data || "").localeCompare(b.data || "");
    });
    const top10Events = eventos.slice(0, 10);

    // Subprojects data for table
    interface SubRow {
      code: string; title: string; scholar: string; orientador: string;
      modalidade: string; valor: number; inicio: string; fim: string; status: string;
    }
    const subRows: SubRow[] = subs.map((s: any) => {
      const enr = enrollmentByProject[s.id];
      const profile = enr ? profilesMap[enr.user_id] : null;
      return {
        code: s.code,
        title: s.title,
        scholar: profile?.full_name || "Não atribuído",
        orientador: s.orientador,
        modalidade: s.modalidade_bolsa || "—",
        valor: Number(s.valor_mensal),
        inicio: s.start_date,
        fim: s.end_date,
        status: s.status,
      };
    });

    // ─── 10) Build PDF ───
    const pdfBytes = await buildConsolidatedPdf({
      title: tp.title,
      sponsor: tp.sponsor_name,
      tpStatus: tp.status,
      startDate: tp.start_date,
      endDate: tp.end_date,
      totalBolsas,
      activeBolsas,
      totalMensal,
      totalEstimado,
      totalPaid,
      pendingReports,
      rejectedReports,
      pendingDocuments,
      blockedPayments,
      pendingPayments,
      eventos: top10Events,
      subRows,
      reportId: crypto.randomUUID(),
      generatedAt: new Date().toISOString(),
    });

    // ─── 11) Upload to storage ───
    const orgId = tp.organization_id || "global";
    const filePath = `tenant/${orgId}/projetos-tematicos/${projectId}/relatorio-consolidado.pdf`;

    const { error: uploadError } = await db.storage
      .from("relatorios")
      .upload(filePath, pdfBytes, { contentType: "application/pdf", upsert: true });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      await db.from("pdf_logs").insert({
        user_id: userId,
        entity_type: "projeto_tematico",
        entity_id: projectId,
        file_path: filePath,
        status: "error",
        error_message: uploadError.message,
        organization_id: tp.organization_id,
        generation_time_ms: Date.now() - startTime,
      });
      return jsonResponse({ error: "Falha ao salvar PDF: " + uploadError.message }, 500);
    }

    // ─── 12) Signed URL ───
    const { data: signedData, error: signedError } = await db.storage
      .from("relatorios")
      .createSignedUrl(filePath, 900);

    if (signedError) {
      return jsonResponse({ error: "Falha ao gerar URL assinada" }, 500);
    }

    // Log
    await db.from("pdf_logs").insert({
      user_id: userId,
      entity_type: "projeto_tematico",
      entity_id: projectId,
      file_path: filePath,
      file_size: pdfBytes.length,
      status: "success",
      organization_id: tp.organization_id,
      generation_time_ms: Date.now() - startTime,
    });

    return jsonResponse({
      signedUrl: signedData.signedUrl,
      path: filePath,
      reportId: crypto.randomUUID(),
    });
  } catch (err: any) {
    console.error(`[rid:${requestId}] Thematic PDF error:`, err);
    return jsonResponse({ error: err.message || "Erro interno", requestId }, 500);
  }
});

// ─── PDF Builder ─────────────────────────────────────────────────────────────

interface ConsolidatedData {
  title: string;
  sponsor: string;
  tpStatus: string;
  startDate: string | null;
  endDate: string | null;
  totalBolsas: number;
  activeBolsas: number;
  totalMensal: number;
  totalEstimado: number;
  totalPaid: number;
  pendingReports: number;
  rejectedReports: number;
  pendingDocuments: number;
  blockedPayments: number;
  pendingPayments: number;
  eventos: { descricao: string; data: string | null; urgencia: string }[];
  subRows: {
    code: string; title: string; scholar: string; orientador: string;
    modalidade: string; valor: number; inicio: string; fim: string; status: string;
  }[];
  reportId: string;
  generatedAt: string;
}

async function buildConsolidatedPdf(data: ConsolidatedData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const W = 841.89;  // A4 landscape
  const H = 595.28;
  const M = 40;
  const LH = 14;
  const COL = W - 2 * M;

  let page = pdfDoc.addPage([W, H]);
  let y = H - M;

  const txt = (text: string, x: number, yy: number, size = 9, f = font, color = rgb(0.1, 0.1, 0.12)) => {
    const maxChars = Math.floor((W - x - M) / (size * 0.48));
    const t = text.length > maxChars ? text.substring(0, maxChars - 2) + "..." : text;
    page.drawText(t, { x, y: yy, size, font: f, color });
  };

  // Word-wrap text into lines that fit within maxWidth
  const wrapText = (text: string, size: number, maxWidth: number, f = font): string[] => {
    const charWidth = size * 0.48;
    const maxChars = Math.floor(maxWidth / charWidth);
    if (text.length <= maxChars) return [text];
    const words = text.split(" ");
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (test.length > maxChars && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
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
    if (!d) return "—";
    try {
      const dt = new Date(d);
      return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
    } catch {
      return d;
    }
  };

  const fmtCur = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

  const sLabel = (s: string) => {
    const m: Record<string, string> = {
      active: "Ativo", inactive: "Inativo", archived: "Arquivado",
    };
    return m[s] || s;
  };

  const sectionTitle = (title: string, num: string) => {
    check(40);
    y -= 6;
    page.drawRectangle({ x: M, y: y - 4, width: 16, height: 16, color: rgb(0.1, 0.1, 0.12) });
    txt(num, M + 5, y, 8, fontBold, rgb(1, 1, 1));
    txt(title, M + 22, y, 10, fontBold);
    y -= 8;
    line(y);
    y -= LH;
  };

  // ═══ HEADER ═══
  page.drawRectangle({ x: M, y: y - 4, width: 30, height: 30, color: rgb(0.1, 0.1, 0.12) });
  txt("BG", M + 7, y + 4, 12, fontBold, rgb(1, 1, 1));
  txt("BolsaGO", M + 36, y + 8, 18, fontBold);
  txt("Relatório Consolidado do Projeto Temático", M + 36, y - 6, 9, font, rgb(0.5, 0.5, 0.55));
  txt(`Gerado em: ${fmtDate(data.generatedAt)}`, W - M - 120, y + 2, 8, font, rgb(0.5, 0.5, 0.55));
  y -= 20;
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 2.5, color: rgb(0.1, 0.1, 0.12) });
  y -= 20;

  // ═══ SEÇÃO 1: Identificação ═══
  sectionTitle("IDENTIFICAÇÃO DO PROJETO", "1");

  const col2X = M + COL / 2 + 10;

  txt("TÍTULO:", M, y, 7, fontBold, rgb(0.5, 0.5, 0.55));
  y -= 11;
  txt(data.title, M, y, 11, fontBold);
  y -= LH + 4;

  txt("FINANCIADOR:", M, y, 7, fontBold, rgb(0.5, 0.5, 0.55));
  txt("STATUS:", col2X, y, 7, fontBold, rgb(0.5, 0.5, 0.55));
  y -= 11;
  txt(data.sponsor, M, y, 10);
  txt(sLabel(data.tpStatus), col2X, y, 10, fontBold);
  y -= LH + 2;

  txt("VIGÊNCIA:", M, y, 7, fontBold, rgb(0.5, 0.5, 0.55));
  y -= 11;
  txt(`${fmtDate(data.startDate)} a ${fmtDate(data.endDate)}`, M, y, 10);
  y -= LH + 6;

  // ═══ SEÇÃO 2: Subprojetos ═══
  sectionTitle("SUBPROJETOS VINCULADOS", "2");

  // Table header — fixed column widths
  // Código:80 Bolsista:150 Orientador:150 Modalidade:120 Valor:80 Início:70 Fim:70 Status:60
  check(LH * 2);
  const colWidths = [80, 150, 150, 120, 80, 70, 70, 60];
  const cols: number[] = [];
  let cx = M;
  for (const w of colWidths) { cols.push(cx); cx += w; }
  const headers = ["CODIGO", "BOLSISTA", "ORIENTADOR", "MODALIDADE", "VALOR", "INICIO", "FIM", "STATUS"];
  for (let i = 0; i < headers.length; i++) {
    txt(headers[i], cols[i] + 4, y, 7, fontBold, rgb(0.5, 0.5, 0.55));
  }
  y -= 4;
  line(y);
  y -= LH - 2;

  const fontSize = 8;
  const cellPadY = 4;

  for (const row of data.subRows) {
    // Calculate the max lines needed (mainly for modalidade)
    const cellTexts = [
      row.code, row.scholar, row.orientador, row.modalidade,
      fmtCur(row.valor), fmtDate(row.inicio), fmtDate(row.fim), sLabel(row.status),
    ];
    const cellLines = cellTexts.map((t, i) => wrapText(t, fontSize, colWidths[i] - 8));
    const maxLines = Math.max(...cellLines.map(l => l.length));
    const rowHeight = maxLines * (LH - 2) + cellPadY * 2;

    check(rowHeight + 2);

    // Draw each cell's wrapped lines
    for (let i = 0; i < cellLines.length; i++) {
      for (let j = 0; j < cellLines[i].length; j++) {
        page.drawText(cellLines[i][j], {
          x: cols[i] + 4,
          y: y - j * (LH - 2),
          size: fontSize,
          font,
          color: rgb(0.1, 0.1, 0.12),
        });
      }
    }

    y -= rowHeight;
    // Separator line
    line(y + cellPadY - 1, 0.3);
  }

  if (data.subRows.length === 0) {
    txt("Nenhum subprojeto cadastrado.", M, y, 9, font, rgb(0.5, 0.5, 0.55));
    y -= LH;
  }
  y -= 6;

  // ═══ SEÇÃO 3: Totais ═══
  sectionTitle("TOTAIS", "3");
  check(70);

  const kpiW = (COL - 30) / 4;
  const kpis = [
    { value: `${data.totalBolsas}`, sub: `${data.activeBolsas} ativa(s)`, label: "Total de Bolsas", color: rgb(0.15, 0.38, 0.88) },
    { value: fmtCur(data.totalMensal), sub: "por mês", label: "Total Mensal", color: rgb(0.1, 0.1, 0.12) },
    { value: fmtCur(data.totalEstimado), sub: "no período", label: "Total Estimado", color: rgb(0.08, 0.5, 0.24) },
    { value: fmtCur(data.totalPaid), sub: "efetivado", label: "Total Pago", color: rgb(0.08, 0.5, 0.24) },
  ];

  for (let i = 0; i < kpis.length; i++) {
    const kx = M + i * (kpiW + 10);
    page.drawRectangle({ x: kx, y: y - 40, width: kpiW, height: 50, borderColor: rgb(0.88, 0.88, 0.88), borderWidth: 1 });
    txt(kpis[i].value, kx + 6, y - 6, 12, fontBold, kpis[i].color);
    txt(kpis[i].sub, kx + 6, y - 20, 7, font, rgb(0.5, 0.5, 0.55));
    txt(kpis[i].label, kx + 6, y - 32, 7, fontBold, rgb(0.5, 0.5, 0.55));
  }
  y -= 60;

  // ═══ SEÇÃO 4: Pendências ═══
  sectionTitle("PENDÊNCIAS AGREGADAS", "4");
  check(80);

  const pendItems = [
    { label: "Relatórios pendentes/em análise", value: data.pendingReports, color: data.pendingReports > 0 ? rgb(0.85, 0.47, 0.02) : rgb(0.08, 0.5, 0.24) },
    { label: "Relatórios recusados (aguardando reenvio)", value: data.rejectedReports, color: data.rejectedReports > 0 ? rgb(0.86, 0.15, 0.15) : rgb(0.08, 0.5, 0.24) },
    { label: "Termos de Outorga pendentes", value: data.pendingDocuments, color: data.pendingDocuments > 0 ? rgb(0.85, 0.47, 0.02) : rgb(0.08, 0.5, 0.24) },
    { label: "Pagamentos bloqueados", value: data.blockedPayments, color: data.blockedPayments > 0 ? rgb(0.86, 0.15, 0.15) : rgb(0.08, 0.5, 0.24) },
    { label: "Pagamentos pendentes/liberados", value: data.pendingPayments, color: data.pendingPayments > 0 ? rgb(0.85, 0.47, 0.02) : rgb(0.08, 0.5, 0.24) },
  ];

  for (const item of pendItems) {
    check(LH + 2);
    const icon = item.value > 0 ? "X" : "-";
    txt(icon, M, y, 8, fontBold, item.color);
    txt(item.label, M + 14, y, 9);
    txt(String(item.value), W - M - 30, y, 10, fontBold, item.color);
    y -= LH + 2;
  }
  y -= 6;

  // ═══ SEÇÃO 5: Próximos vencimentos ═══
  sectionTitle("PRÓXIMOS VENCIMENTOS (TOP 10)", "5");

  if (data.eventos.length === 0) {
    txt("Nenhum vencimento próximo nos próximos 90 dias.", M, y, 9, font, rgb(0.5, 0.5, 0.55));
    y -= LH;
  } else {
    for (const ev of data.eventos) {
      check(LH + 2);
      const evColor = ev.urgencia === "critico" ? rgb(0.86, 0.15, 0.15) : rgb(0.85, 0.47, 0.02);
      const icon = ev.urgencia === "critico" ? "[!]" : "[*]";
      txt(icon, M, y, 8, fontBold, evColor);
      txt(ev.descricao, M + 22, y, 9);
      if (ev.data) txt(fmtDate(ev.data), W - M - 60, y, 8, font, rgb(0.5, 0.5, 0.55));
      y -= LH + 1;
    }
  }
  y -= 6;

  // ═══ FOOTER ═══
  check(40);
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 2, color: rgb(0.1, 0.1, 0.12) });
  y -= 14;
  txt("Documento gerado automaticamente pelo sistema BolsaGO. Uso interno e institucional.", M, y, 7, font, rgb(0.5, 0.5, 0.55));
  y -= 10;
  txt("Os dados refletem a situação no momento da geração. Para informações atualizadas, consulte o sistema.", M, y, 7, font, rgb(0.5, 0.5, 0.55));
  y -= 12;
  txt(`ID: ${data.reportId}`, M, y, 7, font, rgb(0.4, 0.4, 0.45));

  return await pdfDoc.save();
}
