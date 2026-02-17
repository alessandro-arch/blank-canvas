/**
 * Índice de Risco Financeiro — Algoritmo completo (score 0–100)
 *
 * Base de cálculo: teto_projeto.
 * Encargos previstos (ISS, taxa administrativa) NÃO são considerados risco.
 */

export interface RiskInputs {
  tetoProjeto: number;
  valorComprometido: number; // teto_bolsas
  valorPago: number;
  mesesDecorridos: number;
  mesesTotais: number;
  pendenteValor: number; // valor monetário de pagamentos pendentes
  pendenteCount: number; // quantidade de pagamentos pendentes
}

export interface RiskBreakdown {
  A: { label: string; score: number; max: number; detail: string };
  B: { label: string; score: number; max: number; detail: string };
  C: { label: string; score: number; max: number; detail: string };
  D: { label: string; score: number; max: number; detail: string };
}

export interface RiskResult {
  scoreTotal: number;
  level: 'BAIXO' | 'MODERADO' | 'ALTO';
  color: string;       // tailwind text color
  bgColor: string;     // tailwind bg color
  breakdown: RiskBreakdown;
  percentualComprometido: number;
  saldo: number;
  execFinanceira: number;
  execTemporal: number;
  desvio: number;
}

export function calcularRiscoFinanceiro(inputs: RiskInputs): RiskResult {
  const { tetoProjeto, valorComprometido, valorPago, mesesDecorridos, mesesTotais, pendenteValor, pendenteCount } = inputs;

  const pctComprometido = tetoProjeto > 0 ? valorComprometido / tetoProjeto : 0;
  const saldo = tetoProjeto - valorComprometido;
  const execFin = tetoProjeto > 0 ? valorPago / tetoProjeto : 0;
  const execTempo = mesesTotais > 0 ? mesesDecorridos / mesesTotais : 0;
  const desvio = execTempo - execFin;

  // A) Comprometimento (0–40)
  let A = 0;
  if (pctComprometido <= 0.95) A = 0;
  else if (pctComprometido <= 1.00) A = 10;
  else if (pctComprometido <= 1.05) A = 25;
  else if (pctComprometido <= 1.10) A = 35;
  else A = 40;

  // B) Saldo (0–30)
  let B = 0;
  if (saldo >= 0) {
    B = 0;
  } else {
    const ratio = tetoProjeto > 0 ? Math.abs(saldo) / tetoProjeto : 1;
    if (ratio <= 0.02) B = 10;
    else if (ratio <= 0.05) B = 20;
    else B = 30;
  }

  // C) Desvio tempo × financeiro (0–20)
  let C = 0;
  if (desvio <= 0.10) C = 0;
  else if (desvio <= 0.20) C = 8;
  else if (desvio <= 0.35) C = 14;
  else C = 20;

  // D) Pendências (0–10)
  let D = 0;
  if (pendenteValor === 0 && pendenteCount === 0) {
    D = 0;
  } else {
    const ratioP = tetoProjeto > 0 ? pendenteValor / tetoProjeto : 0;
    if (ratioP <= 0.01) D = 4;
    else if (ratioP <= 0.03) D = 7;
    else D = 10;
  }

  const scoreTotal = A + B + C + D;

  let level: RiskResult['level'];
  let color: string;
  let bgColor: string;
  if (scoreTotal <= 24) {
    level = 'BAIXO';
    color = 'text-success';
    bgColor = 'bg-success/10';
  } else if (scoreTotal <= 49) {
    level = 'MODERADO';
    color = 'text-warning';
    bgColor = 'bg-warning/10';
  } else {
    level = 'ALTO';
    color = 'text-destructive';
    bgColor = 'bg-destructive/10';
  }

  const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`;

  return {
    scoreTotal,
    level,
    color,
    bgColor,
    breakdown: {
      A: { label: 'Comprometimento', score: A, max: 40, detail: `${fmtPct(pctComprometido)} do teto` },
      B: { label: 'Saldo', score: B, max: 30, detail: saldo >= 0 ? 'Positivo' : `Déficit ${fmtPct(Math.abs(saldo) / (tetoProjeto || 1))}` },
      C: { label: 'Desvio tempo×fin', score: C, max: 20, detail: `Desvio: ${fmtPct(desvio)}` },
      D: { label: 'Pendências', score: D, max: 10, detail: `${pendenteCount} pendência(s)` },
    },
    percentualComprometido: pctComprometido * 100,
    saldo,
    execFinanceira: execFin * 100,
    execTemporal: execTempo * 100,
    desvio: desvio * 100,
  };
}
