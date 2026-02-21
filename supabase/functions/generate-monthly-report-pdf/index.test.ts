import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return rgb(
    parseInt(h.substring(0, 2), 16) / 255,
    parseInt(h.substring(2, 4), 16) / 255,
    parseInt(h.substring(4, 6), 16) / 255,
  );
}

function sanitize(text: string): string {
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2013/g, "-")
    .replace(/\u2014/g, "--")
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ")
    .replace(/[^\x00-\xFF]/g, "?");
}

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

  const fmtDateTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()} ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
    } catch {
      return iso;
    }
  };

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
    pg.drawText(sanitize(`SHA-256: mock-hash-for-testing | Status: Enviado`), {
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
    if (y - needed < M + FOOTER_H) newPage();
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

  // HEADER
  page.drawRectangle({ x: M, y: y - 4, width: 28, height: 28, color: primaryRgb });
  txt("BG", M + 6, y + 2, 11, fontBold, rgb(1, 1, 1));
  txt("BolsaGO", M + 34, y + 6, 16, fontBold, primaryRgb);
  txt("Relatorio Mensal de Atividades", M + 34, y - 8, 8.5, font, rgb(0.5, 0.5, 0.55));
  txt(data.orgName, W - M - 150, y + 6, 8, fontBold, rgb(0.5, 0.5, 0.55));
  txt(`Periodo: ${data.periodLabel}`, W - M - 100, y - 6, 8, font, rgb(0.5, 0.5, 0.55));
  y -= 22;
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 2.5, color: primaryRgb });
  y -= 20;

  // IDENTIFICATION
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

  sectionTitle("Atividades Realizadas");
  drawWrapped(data.payload.atividades_realizadas || "Nao informado", M);
  y -= 4;

  sectionTitle("Resultados Alcancados");
  drawWrapped(data.payload.resultados_alcancados || "Nao informado", M);
  y -= 4;

  if (data.payload.dificuldades_encontradas) {
    sectionTitle("Dificuldades Encontradas");
    drawWrapped(data.payload.dificuldades_encontradas, M);
    y -= 4;
  }

  if (data.payload.proximos_passos) {
    sectionTitle("Proximos Passos");
    drawWrapped(data.payload.proximos_passos, M);
    y -= 4;
  }

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

  if (data.payload.observacoes) {
    sectionTitle("Observacoes");
    drawWrapped(data.payload.observacoes, M);
    y -= 4;
  }

  // ELECTRONIC ACCEPTANCE
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

  drawFooter(page, pageNum);
  return pdfDoc.save();
}

Deno.test("Generate mock monthly report PDF", async () => {
  const mockData: PdfData = {
    payload: {
      atividades_realizadas: "Realizei pesquisa bibliografica sobre inteligencia artificial aplicada a gestao de projetos academicos. Participei de reunioes semanais com o orientador para alinhar os objetivos do trimestre. Desenvolvi um prototipo funcional do modulo de analise de dados usando Python e bibliotecas de machine learning.",
      resultados_alcancados: "Concluida a revisao sistematica da literatura com 45 artigos analisados. O prototipo do modulo de analise atingiu 87% de acuracia nos testes iniciais. Artigo submetido para o congresso SBPC 2026.",
      dificuldades_encontradas: "Dificuldade no acesso a bases de dados internacionais por restricoes de licenca institucional. Atraso de 2 semanas no cronograma devido a problemas tecnicos no servidor de processamento.",
      proximos_passos: "Finalizar a implementacao do modulo de analise com dados reais. Preparar apresentacao para o seminario interno do grupo de pesquisa. Iniciar a redacao do capitulo 3 da dissertacao.",
      horas_dedicadas: 160,
      entregas: [
        "Revisao sistematica - documento completo (PDF, 32 paginas)",
        "Prototipo v1.0 - repositorio Git atualizado",
        "Artigo SBPC 2026 - submetido em 15/02/2026"
      ],
      observacoes: "Agradeço o suporte do laboratorio de computacao que disponibilizou recursos extras de processamento para os experimentos de machine learning."
    },
    scholarName: "Maria Clara de Oliveira Santos",
    scholarEmail: "maria.santos@universidade.edu.br",
    institution: "Universidade Federal de Goias (UFG)",
    projectCode: "SUB-2024-001",
    projectTitle: "IA Aplicada a Gestao de Projetos Academicos",
    orientador: "Prof. Dr. Carlos Eduardo Ferreira",
    thematicTitle: "Inovacao Tecnologica em Educacao Superior",
    sponsorName: "FAPEG - Fundacao de Amparo a Pesquisa de Goias",
    orgName: "ICCA - Instituto de Ciencia e Conhecimento",
    primaryColor: "#1e3a5f",
    periodLabel: "02/2026",
    submittedAt: new Date().toISOString(),
    reportId: "test-mock-report-id",
  };

  const pdfBytes = await buildMonthlyReportPdf(mockData);

  // Basic validations
  assertEquals(pdfBytes instanceof Uint8Array, true);
  console.log(`PDF generated successfully: ${pdfBytes.length} bytes`);

  // Verify it's a valid PDF (starts with %PDF)
  const header = new TextDecoder().decode(pdfBytes.slice(0, 5));
  assertEquals(header, "%PDF-");

  // Calculate SHA-256
  const hashBuffer = await crypto.subtle.digest("SHA-256", pdfBytes as unknown as ArrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const sha256 = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  console.log(`SHA-256: ${sha256}`);
  console.log(`Pages: estimated based on content`);
});
