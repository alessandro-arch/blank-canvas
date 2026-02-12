// Centralized modality labels for grant types
// These codes match the database enum: grant_modality

export const MODALITY_LABELS = {
  ict: "Bolsa de Iniciação Científica e Tecnológica",
  ext: "Bolsa de Extensão",
  ens: "Bolsa de Apoio ao Ensino",
  ino: "Bolsa de Inovação",
  dct_a: "Bolsa de Desenvolvimento Científico e Tecnológico (Nível A)",
  dct_b: "Bolsa de Desenvolvimento Científico e Tecnológico (Nível B)",
  dct_c: "Bolsa de Desenvolvimento Científico e Tecnológico (Nível C)",
  postdoc: "Bolsa de Pós-doutorado",
  senior: "Bolsa de Cientista Sênior",
  prod: "Bolsa de Produtividade em Pesquisa",
  visitor: "Bolsa de Pesquisador Visitante (Estrangeiro)",
} as const;

export type ModalityCode = keyof typeof MODALITY_LABELS;

export const MODALITY_CODES = Object.keys(MODALITY_LABELS) as ModalityCode[];

export function getModalityLabel(code: string): string {
  return MODALITY_LABELS[code as ModalityCode] || code;
}
