/**
 * Brazilian CNPJ Validator
 * Validates CNPJ format and verification digits (Módulo 11)
 */

export function formatCNPJ(value: string): string {
  const numbers = value.replace(/\D/g, "").slice(0, 14);
  return numbers
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})/, "$1-$2");
}

export function unformatCNPJ(value: string): string {
  return value.replace(/\D/g, "");
}

export function validateCNPJ(cnpj: string): boolean {
  const clean = cnpj.replace(/\D/g, "");

  if (clean.length !== 14) return false;

  // Reject all same digits
  if (/^(\d)\1{13}$/.test(clean)) return false;

  // First verification digit
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(clean.charAt(i)) * weights1[i];
  }
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;
  if (parseInt(clean.charAt(12)) !== digit1) return false;

  // Second verification digit
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(clean.charAt(i)) * weights2[i];
  }
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;
  if (parseInt(clean.charAt(13)) !== digit2) return false;

  return true;
}
