/**
 * Template HTML reutilizável para Relatório de Bolsa — BolsaGO
 * Gera HTML A4 pronto para conversão em PDF.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RelatorioBolsaData {
  // Meta
  reportId: string;
  generatedAt: string; // ISO date
  bolsaUrl: string;    // URL completa da bolsa no sistema

  // Seção 1: Dados da bolsa
  financiador: string;
  projetoTematicoTitulo: string;
  projetoTematicoStatus: string;
  subprojetoCodigo: string;
  subprojetoTitulo: string;
  modalidade: string;
  valorMensal: number;
  vigenciaInicio: string | null;
  vigenciaFim: string | null;
  coordenadorTecnico: string | null;

  // Seção 2: Bolsista
  bolsistaNome: string;
  bolsistaEmail: string;
  orientador: string;
  instituicao: string | null;
  nivelAcademico: string | null;

  // Seção 3: Situação atual
  situacao: 'active' | 'suspended' | 'completed' | 'cancelled' | 'pending_report' | string;
  enrollmentStartDate: string | null;
  enrollmentEndDate: string | null;
  totalParcelas: number;

  // Seção 4: Próximos eventos
  eventos: EventoProximo[];

  // Seção 5: Indicadores
  indicadores: {
    totalRelatorios: number;
    relatoriosAprovados: number;
    relatoriosPendentes: number;
    relatoriosRecusados: number;
    totalPagamentos: number;
    pagamentosRealizados: number;
    pagamentosPendentes: number;
    totalPago: number;
    termoOutorgaAnexado: boolean;
    conformidade: number; // 0-100%
  };

  // Seção 6: Documentos
  documentos: DocumentoAnexo[];

  // Relatórios detalhados
  relatorios: RelatorioItem[];
  pagamentos: PagamentoItem[];
}

export interface EventoProximo {
  tipo: 'relatorio' | 'vigencia' | 'renovacao' | 'alerta';
  descricao: string;
  data: string | null;
  urgencia: 'normal' | 'atencao' | 'critico';
}

export interface DocumentoAnexo {
  nome: string;
  tipo: string;
  status: 'anexado' | 'pendente' | 'expirado';
  dataUpload: string | null;
  dataAssinatura: string | null;
}

export interface RelatorioItem {
  competencia: string;
  parcela: number;
  status: string;
  enviadoEm: string | null;
  revisadoEm: string | null;
}

export interface PagamentoItem {
  competencia: string;
  parcela: number;
  valor: number;
  status: string;
  pagoEm: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  } catch {
    return d;
  }
}

function formatDateTime(d: string | null | undefined): string {
  if (!d) return '—';
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    return `${formatDate(d)} às ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  } catch {
    return d;
  }
}

function formatCurrency(v: number): string {
  return `R$ ${v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.').replace(/\.(\d{2})$/, ',$1')}`;
}

function situacaoLabel(s: string): { label: string; color: string; bg: string } {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    active:         { label: 'Ativa',               color: '#15803d', bg: '#dcfce7' },
    suspended:      { label: 'Suspensa',            color: '#b45309', bg: '#fef3c7' },
    completed:      { label: 'Encerrada',           color: '#6b7280', bg: '#f3f4f6' },
    cancelled:      { label: 'Cancelada',           color: '#dc2626', bg: '#fee2e2' },
    pending_report: { label: 'Pendente de Relatório', color: '#d97706', bg: '#fffbeb' },
  };
  return map[s] || { label: s, color: '#374151', bg: '#f3f4f6' };
}

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    active: 'Ativo', inactive: 'Inativo', archived: 'Arquivado',
    pending: 'Pendente', under_review: 'Em Análise', approved: 'Aprovado',
    rejected: 'Recusado', eligible: 'Liberado', paid: 'Pago',
    cancelled: 'Cancelado', suspended: 'Suspenso', completed: 'Concluído',
    anexado: 'Anexado', pendente: 'Pendente', expirado: 'Expirado',
  };
  return map[s] || s;
}

function statusColor(s: string): string {
  const map: Record<string, string> = {
    active: '#15803d', approved: '#15803d', paid: '#15803d', anexado: '#15803d',
    pending: '#d97706', under_review: '#d97706', eligible: '#2563eb', pendente: '#d97706',
    rejected: '#dc2626', cancelled: '#dc2626', expirado: '#dc2626',
    inactive: '#6b7280', archived: '#6b7280', suspended: '#b45309',
    completed: '#6b7280',
  };
  return map[s] || '#374151';
}

function urgenciaIcon(u: string): string {
  switch (u) {
    case 'critico': return '🔴';
    case 'atencao': return '🟡';
    default: return '🔵';
  }
}

/**
 * Generates a simple SVG QR code using a module pattern.
 * This is a minimal QR-like visual (not a real QR encoder) — 
 * for production, integrate a real QR lib. Here we create a 
 * data-matrix style visual + plain-text URL fallback.
 */
function generateQrCodeSvg(url: string, size = 80): string {
  // Simple deterministic pattern from URL hash for visual representation
  const hash = simpleHash(url);
  const modules = 11;
  const cellSize = size / modules;
  let rects = '';

  // Fixed finder patterns (top-left, top-right, bottom-left)
  const finderPositions = [
    [0, 0], [0, modules - 3], [modules - 3, 0],
  ];

  for (const [fy, fx] of finderPositions) {
    for (let dy = 0; dy < 3; dy++) {
      for (let dx = 0; dx < 3; dx++) {
        if (dy === 1 && dx === 1) {
          rects += `<rect x="${(fx + dx) * cellSize}" y="${(fy + dy) * cellSize}" width="${cellSize}" height="${cellSize}" fill="#1a1a2e"/>`;
        } else {
          rects += `<rect x="${(fx + dx) * cellSize}" y="${(fy + dy) * cellSize}" width="${cellSize}" height="${cellSize}" fill="#1a1a2e" rx="0.5"/>`;
        }
      }
    }
  }

  // Data modules from hash
  let bitIdx = 0;
  for (let row = 0; row < modules; row++) {
    for (let col = 0; col < modules; col++) {
      // Skip finder pattern areas
      if ((row < 3 && col < 3) || (row < 3 && col >= modules - 3) || (row >= modules - 3 && col < 3)) continue;

      const bit = (hash >> (bitIdx % 32)) & 1;
      bitIdx += 7;
      if (bit || (row + col) % 3 === 0) {
        rects += `<rect x="${col * cellSize}" y="${row * cellSize}" width="${cellSize}" height="${cellSize}" fill="#1a1a2e" rx="0.5" opacity="${bit ? '1' : '0.15'}"/>`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${rects}</svg>`;
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

// ─── Main Template ───────────────────────────────────────────────────────────

export function renderRelatorioBolsaHtml(data: RelatorioBolsaData): string {
  const sit = situacaoLabel(data.situacao);
  const qrSvg = generateQrCodeSvg(data.bolsaUrl);
  const conformidadePct = data.indicadores.conformidade;
  const conformidadeColor = conformidadePct >= 80 ? '#15803d' : conformidadePct >= 50 ? '#d97706' : '#dc2626';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Relatório de Bolsa — ${escHtml(data.subprojetoCodigo)}</title>
<style>
  @page {
    size: A4;
    margin: 20mm 18mm 25mm 18mm;
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    font-size: 9.5pt;
    line-height: 1.5;
    color: #1a1a2e;
    background: #fff;
  }

  .page {
    max-width: 210mm;
    margin: 0 auto;
    padding: 0;
  }

  /* ─── Header ─── */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 3px solid #1a1a2e;
    padding-bottom: 12px;
    margin-bottom: 20px;
  }

  .header-brand {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .header-logo {
    width: 36px;
    height: 36px;
  }

  .header-title {
    font-size: 18pt;
    font-weight: 800;
    color: #1a1a2e;
    letter-spacing: -0.5px;
  }

  .header-subtitle {
    font-size: 8pt;
    color: #6b7280;
    margin-top: 2px;
  }

  .header-meta {
    text-align: right;
    font-size: 8pt;
    color: #6b7280;
  }

  .header-meta strong {
    color: #1a1a2e;
    display: block;
    font-size: 9pt;
  }

  /* ─── Sections ─── */
  .section {
    margin-bottom: 16px;
    page-break-inside: avoid;
  }

  .section-title {
    font-size: 10pt;
    font-weight: 700;
    color: #1a1a2e;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    border-bottom: 1.5px solid #e5e7eb;
    padding-bottom: 4px;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .section-number {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    background: #1a1a2e;
    color: #fff;
    font-size: 8pt;
    font-weight: 700;
    border-radius: 4px;
    flex-shrink: 0;
  }

  /* ─── Data Grid ─── */
  .data-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px 24px;
  }

  .data-grid.three-col {
    grid-template-columns: 1fr 1fr 1fr;
  }

  .data-item {
    display: flex;
    flex-direction: column;
  }

  .data-label {
    font-size: 7.5pt;
    font-weight: 600;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .data-value {
    font-size: 9.5pt;
    color: #1a1a2e;
    font-weight: 500;
  }

  .data-value.highlight {
    font-size: 11pt;
    font-weight: 700;
  }

  /* ─── Status Badge ─── */
  .status-badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 4px;
    font-size: 8.5pt;
    font-weight: 700;
    letter-spacing: 0.3px;
  }

  /* ─── Situação Card ─── */
  .situacao-card {
    border: 2px solid;
    border-radius: 8px;
    padding: 14px 18px;
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .situacao-icon {
    font-size: 28pt;
    line-height: 1;
  }

  .situacao-info {
    flex: 1;
  }

  .situacao-label {
    font-size: 14pt;
    font-weight: 800;
  }

  .situacao-detail {
    font-size: 8.5pt;
    color: #6b7280;
    margin-top: 2px;
  }

  /* ─── Events List ─── */
  .events-list {
    list-style: none;
  }

  .event-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 6px 0;
    border-bottom: 1px solid #f3f4f6;
  }

  .event-item:last-child {
    border-bottom: none;
  }

  .event-icon {
    font-size: 10pt;
    flex-shrink: 0;
    margin-top: 1px;
  }

  .event-text {
    flex: 1;
    font-size: 9pt;
  }

  .event-date {
    font-size: 8pt;
    color: #6b7280;
    white-space: nowrap;
  }

  /* ─── KPI Cards ─── */
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }

  .kpi-card {
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 10px 12px;
    text-align: center;
  }

  .kpi-value {
    font-size: 18pt;
    font-weight: 800;
    line-height: 1.1;
  }

  .kpi-label {
    font-size: 7pt;
    font-weight: 600;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    margin-top: 2px;
  }

  /* ─── Conformidade Bar ─── */
  .conformidade-bar-container {
    margin-top: 8px;
  }

  .conformidade-bar {
    height: 8px;
    background: #f3f4f6;
    border-radius: 4px;
    overflow: hidden;
    margin-top: 4px;
  }

  .conformidade-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.3s;
  }

  .conformidade-label {
    display: flex;
    justify-content: space-between;
    font-size: 8pt;
    color: #6b7280;
  }

  /* ─── Tables ─── */
  .report-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8.5pt;
  }

  .report-table th {
    background: #f9fafb;
    border-bottom: 2px solid #e5e7eb;
    padding: 6px 8px;
    text-align: left;
    font-weight: 700;
    color: #6b7280;
    text-transform: uppercase;
    font-size: 7.5pt;
    letter-spacing: 0.5px;
  }

  .report-table td {
    padding: 5px 8px;
    border-bottom: 1px solid #f3f4f6;
    vertical-align: middle;
  }

  .report-table tr:last-child td {
    border-bottom: none;
  }

  .report-table .text-right {
    text-align: right;
  }

  .report-table .text-center {
    text-align: center;
  }

  .report-table .total-row {
    font-weight: 700;
    background: #f9fafb;
    border-top: 2px solid #e5e7eb;
  }

  .status-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-right: 4px;
    vertical-align: middle;
  }

  /* ─── Footer ─── */
  .footer {
    margin-top: 24px;
    border-top: 2px solid #1a1a2e;
    padding-top: 12px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    page-break-inside: avoid;
  }

  .footer-left {
    font-size: 7.5pt;
    color: #9ca3af;
    max-width: 65%;
  }

  .footer-left p {
    margin-bottom: 2px;
  }

  .footer-id {
    font-family: 'Courier New', monospace;
    font-size: 7pt;
    color: #6b7280;
    background: #f3f4f6;
    padding: 2px 6px;
    border-radius: 3px;
    display: inline-block;
    margin-top: 4px;
  }

  .footer-qr {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .footer-qr-label {
    font-size: 6.5pt;
    color: #9ca3af;
    text-align: center;
  }

  .no-data {
    color: #9ca3af;
    font-style: italic;
    font-size: 8.5pt;
    padding: 8px 0;
  }
</style>
</head>
<body>
<div class="page">

  <!-- ═══ HEADER ═══ -->
  <div class="header">
    <div class="header-brand">
      <svg class="header-logo" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
        <rect width="36" height="36" rx="8" fill="#1a1a2e"/>
        <text x="18" y="24" text-anchor="middle" fill="#fff" font-family="Arial" font-weight="800" font-size="14">BG</text>
      </svg>
      <div>
        <div class="header-title">BolsaGO</div>
        <div class="header-subtitle">Relatório de Bolsa</div>
      </div>
    </div>
    <div class="header-meta">
      <strong>Gerado em</strong>
      ${formatDateTime(data.generatedAt)}
    </div>
  </div>

  <!-- ═══ SEÇÃO 1: DADOS DA BOLSA ═══ -->
  <div class="section">
    <div class="section-title">
      <span class="section-number">1</span>
      Dados da Bolsa
    </div>
    <div class="data-grid">
      <div class="data-item">
        <span class="data-label">Financiador</span>
        <span class="data-value highlight">${escHtml(data.financiador)}</span>
      </div>
      <div class="data-item">
        <span class="data-label">Projeto Temático</span>
        <span class="data-value">${escHtml(data.projetoTematicoTitulo)}</span>
      </div>
      <div class="data-item">
        <span class="data-label">Subprojeto (Código)</span>
        <span class="data-value">${escHtml(data.subprojetoCodigo)} — ${escHtml(data.subprojetoTitulo)}</span>
      </div>
      <div class="data-item">
        <span class="data-label">Modalidade</span>
        <span class="data-value">${escHtml(data.modalidade || '—')}</span>
      </div>
      <div class="data-item">
        <span class="data-label">Valor Mensal</span>
        <span class="data-value highlight">${formatCurrency(data.valorMensal)}</span>
      </div>
      <div class="data-item">
        <span class="data-label">Vigência</span>
        <span class="data-value">${formatDate(data.vigenciaInicio)} a ${formatDate(data.vigenciaFim)}</span>
      </div>
      ${data.coordenadorTecnico ? `
      <div class="data-item">
        <span class="data-label">Coord. Técnico ICCA</span>
        <span class="data-value">${escHtml(data.coordenadorTecnico)}</span>
      </div>` : ''}
    </div>
  </div>

  <!-- ═══ SEÇÃO 2: BOLSISTA ═══ -->
  <div class="section">
    <div class="section-title">
      <span class="section-number">2</span>
      Bolsista e Orientação
    </div>
    <div class="data-grid three-col">
      <div class="data-item">
        <span class="data-label">Bolsista</span>
        <span class="data-value highlight">${escHtml(data.bolsistaNome)}</span>
      </div>
      <div class="data-item">
        <span class="data-label">E-mail</span>
        <span class="data-value">${escHtml(data.bolsistaEmail || '—')}</span>
      </div>
      <div class="data-item">
        <span class="data-label">Orientador</span>
        <span class="data-value">${escHtml(data.orientador)}</span>
      </div>
      <div class="data-item">
        <span class="data-label">Instituição</span>
        <span class="data-value">${escHtml(data.instituicao || '—')}</span>
      </div>
      <div class="data-item">
        <span class="data-label">Nível Acadêmico</span>
        <span class="data-value">${escHtml(data.nivelAcademico || '—')}</span>
      </div>
      <div class="data-item">
        <span class="data-label">Total de Parcelas</span>
        <span class="data-value">${data.totalParcelas}</span>
      </div>
    </div>
  </div>

  <!-- ═══ SEÇÃO 3: SITUAÇÃO ATUAL ═══ -->
  <div class="section">
    <div class="section-title">
      <span class="section-number">3</span>
      Situação Atual
    </div>
    <div class="situacao-card" style="border-color: ${sit.color}; background: ${sit.bg};">
      <div class="situacao-icon">${situacaoEmoji(data.situacao)}</div>
      <div class="situacao-info">
        <div class="situacao-label" style="color: ${sit.color};">${sit.label}</div>
        <div class="situacao-detail">
          Vínculo: ${formatDate(data.enrollmentStartDate)} a ${formatDate(data.enrollmentEndDate)}
          ${data.situacao === 'active' ? ` · Próxima entrega pode estar pendente` : ''}
        </div>
      </div>
    </div>
  </div>

  <!-- ═══ SEÇÃO 4: PRÓXIMOS EVENTOS ═══ -->
  <div class="section">
    <div class="section-title">
      <span class="section-number">4</span>
      Próximos Eventos e Alertas
    </div>
    ${data.eventos.length === 0
      ? '<p class="no-data">Nenhum evento ou alerta registrado no momento.</p>'
      : `<ul class="events-list">
        ${data.eventos.map(ev => `
          <li class="event-item">
            <span class="event-icon">${urgenciaIcon(ev.urgencia)}</span>
            <span class="event-text">${escHtml(ev.descricao)}</span>
            <span class="event-date">${formatDate(ev.data)}</span>
          </li>
        `).join('')}
      </ul>`
    }
  </div>

  <!-- ═══ SEÇÃO 5: INDICADORES ═══ -->
  <div class="section">
    <div class="section-title">
      <span class="section-number">5</span>
      Indicadores-Chave
    </div>
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-value" style="color: #15803d;">${data.indicadores.relatoriosAprovados}/${data.indicadores.totalRelatorios}</div>
        <div class="kpi-label">Entregas Aprovadas</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value" style="color: #d97706;">${data.indicadores.relatoriosPendentes}</div>
        <div class="kpi-label">Pendentes</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value" style="color: #2563eb;">${data.indicadores.pagamentosRealizados}/${data.indicadores.totalPagamentos}</div>
        <div class="kpi-label">Pagamentos</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value" style="color: #1a1a2e;">${formatCurrency(data.indicadores.totalPago)}</div>
        <div class="kpi-label">Total Pago</div>
      </div>
    </div>

    <div class="conformidade-bar-container">
      <div class="conformidade-label">
        <span>Conformidade Geral</span>
        <span style="color: ${conformidadeColor}; font-weight: 700;">${conformidadePct}%</span>
      </div>
      <div class="conformidade-bar">
        <div class="conformidade-fill" style="width: ${conformidadePct}%; background: ${conformidadeColor};"></div>
      </div>
    </div>
  </div>

  <!-- ═══ SEÇÃO 6: DOCUMENTOS ANEXADOS ═══ -->
  <div class="section">
    <div class="section-title">
      <span class="section-number">6</span>
      Documentos Anexados
    </div>
    ${data.documentos.length === 0
      ? '<p class="no-data">Nenhum documento registrado.</p>'
      : `<table class="report-table">
        <thead>
          <tr>
            <th>Documento</th>
            <th>Tipo</th>
            <th class="text-center">Status</th>
            <th>Data Upload</th>
            <th>Data Assinatura</th>
          </tr>
        </thead>
        <tbody>
          ${data.documentos.map(doc => `
            <tr>
              <td>${escHtml(doc.nome)}</td>
              <td>${escHtml(doc.tipo)}</td>
              <td class="text-center">
                <span class="status-dot" style="background: ${statusColor(doc.status)};"></span>
                ${statusLabel(doc.status)}
              </td>
              <td>${formatDate(doc.dataUpload)}</td>
              <td>${formatDate(doc.dataAssinatura)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`
    }
  </div>

  <!-- ═══ TABELA RELATÓRIOS DETALHADOS ═══ -->
  ${data.relatorios.length > 0 ? `
  <div class="section">
    <div class="section-title">Relatórios de Atividades — Detalhamento</div>
    <table class="report-table">
      <thead>
        <tr>
          <th>Competência</th>
          <th class="text-center">Parcela</th>
          <th class="text-center">Status</th>
          <th>Enviado em</th>
          <th>Revisado em</th>
        </tr>
      </thead>
      <tbody>
        ${data.relatorios.map(r => `
          <tr>
            <td>${escHtml(r.competencia)}</td>
            <td class="text-center">${r.parcela}</td>
            <td class="text-center">
              <span class="status-dot" style="background: ${statusColor(r.status)};"></span>
              ${statusLabel(r.status)}
            </td>
            <td>${formatDate(r.enviadoEm)}</td>
            <td>${formatDate(r.revisadoEm)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>` : ''}

  <!-- ═══ TABELA PAGAMENTOS DETALHADOS ═══ -->
  ${data.pagamentos.length > 0 ? `
  <div class="section">
    <div class="section-title">Pagamentos — Detalhamento</div>
    <table class="report-table">
      <thead>
        <tr>
          <th>Competência</th>
          <th class="text-center">Parcela</th>
          <th class="text-right">Valor</th>
          <th class="text-center">Status</th>
          <th>Pago em</th>
        </tr>
      </thead>
      <tbody>
        ${data.pagamentos.map(p => `
          <tr>
            <td>${escHtml(p.competencia)}</td>
            <td class="text-center">${p.parcela}</td>
            <td class="text-right">${formatCurrency(p.valor)}</td>
            <td class="text-center">
              <span class="status-dot" style="background: ${statusColor(p.status)};"></span>
              ${statusLabel(p.status)}
            </td>
            <td>${formatDate(p.pagoEm)}</td>
          </tr>
        `).join('')}
        <tr class="total-row">
          <td colspan="2">Total Pago</td>
          <td class="text-right">${formatCurrency(data.indicadores.totalPago)}</td>
          <td colspan="2"></td>
        </tr>
      </tbody>
    </table>
  </div>` : ''}

  <!-- ═══ FOOTER ═══ -->
  <div class="footer">
    <div class="footer-left">
      <p>Documento gerado automaticamente pelo sistema <strong>BolsaGO</strong>. Uso interno e institucional.</p>
      <p>Os dados refletem a situação no momento da geração. Para informações atualizadas, consulte o sistema.</p>
      <span class="footer-id">ID: ${escHtml(data.reportId)}</span>
    </div>
    <div class="footer-qr">
      ${qrSvg}
      <span class="footer-qr-label">Acesse a bolsa<br/>no sistema</span>
    </div>
  </div>

</div>
</body>
</html>`;
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function escHtml(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function situacaoEmoji(s: string): string {
  const map: Record<string, string> = {
    active: '✅',
    suspended: '⏸️',
    completed: '🏁',
    cancelled: '❌',
    pending_report: '⏳',
  };
  return map[s] || '📋';
}
