function somenteDigitos(texto: string): string {
  return texto.replace(/\D/g, "");
}

function digitoModulo11(valores: readonly number[], pesos: readonly number[]): number {
  const soma = valores.reduce((total, valor, i) => total + valor * (pesos[i] ?? 0), 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

export function cpfValido(texto: string): boolean {
  const cpf = somenteDigitos(texto);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const d = [...cpf].map(Number);
  const dv1 = digitoModulo11(d.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const dv2 = digitoModulo11(d.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d[9] === dv1 && d[10] === dv2;
}

const PESOS_CNPJ_DV1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS_CNPJ_DV2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

/**
 * Aceita o CNPJ numérico e o alfanumérico, emitido pela Receita desde julho de 2026
 * (IN RFB 2.229/2024): cada caractere vale o código ASCII menos 48, e os dois dígitos
 * verificadores continuam numéricos.
 */
export function cnpjValido(texto: string): boolean {
  const cnpj = texto.toUpperCase().replace(/[^0-9A-Z]/g, "");
  if (!/^[0-9A-Z]{12}\d{2}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;
  const valores = [...cnpj].map((c) => c.charCodeAt(0) - 48);
  const dv1 = digitoModulo11(valores.slice(0, 12), PESOS_CNPJ_DV1);
  const dv2 = digitoModulo11(valores.slice(0, 13), PESOS_CNPJ_DV2);
  return valores[12] === dv1 && valores[13] === dv2;
}

export function luhnValido(texto: string): boolean {
  const numero = somenteDigitos(texto);
  if (numero.length < 13 || numero.length > 19) return false;
  let soma = 0;
  for (let i = 0; i < numero.length; i++) {
    let digito = Number(numero[numero.length - 1 - i]);
    if (i % 2 === 1) {
      digito *= 2;
      if (digito > 9) digito -= 9;
    }
    soma += digito;
  }
  return soma % 10 === 0;
}

/** DDDs em uso no Brasil, segundo o plano de numeração da Anatel. */
const DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38, 41, 42, 43,
  44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74, 75, 77,
  79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

/** Telefone brasileiro em dígitos com DDD (10 ou 11), com ou sem o 55 na frente. */
export function telefoneValido(texto: string): boolean {
  const numero = somenteDigitos(texto).replace(/^55(?=\d{10,11}$)/, "");
  if (!DDDS.has(Number(numero.slice(0, 2)))) return false;
  const assinante = numero.slice(2);
  if (assinante.length === 9) return assinante.startsWith("9");
  if (assinante.length === 8) return /^[2-5]/.test(assinante);
  return false;
}
