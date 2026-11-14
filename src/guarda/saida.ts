import { cnpjValido, cpfValido, luhnValido, telefoneValido } from "./documentos.ts";
import type { RegraDaEtapa } from "./regras.ts";

export type RegraSaida = RegraDaEtapa<"saida">;

export type Mascara = { readonly regra: RegraSaida; readonly quantidade: number };

export type ChecagemSaida = { readonly texto: string; readonly mascaras: readonly Mascara[] };

type Detector = {
  readonly regra: RegraSaida;
  readonly padrao: RegExp;
  readonly confere: (achado: string) => boolean;
  readonly mascarar: (achado: string) => string;
};

const sempre = () => true;
const digitos = (texto: string) => texto.replace(/\D/g, "");

/** Cartão com 14 a 19 dígitos: o de 13 saiu de uso, e número de protocolo com 13 dígitos é comum. */
const cartaoValido = (texto: string) => digitos(texto).length >= 14 && luhnValido(texto) && !telefoneValido(texto);

/** Um número solto, já em dígitos, que é dado pessoal. Serve para o que veio separado ou por extenso. */
function regraDosDigitos(numero: string): RegraSaida | undefined {
  if (numero.length === 11 && cpfValido(numero)) return "cpf";
  if (numero.length === 14 && cnpjValido(numero)) return "cnpj";
  if (cartaoValido(numero)) return "cartao";
  if (telefoneValido(numero)) return "telefone";
  return undefined;
}

const MASCARAS: Readonly<Record<RegraSaida, string>> = {
  cpf: "***.***.***-**",
  cnpj: "**.***.***/****-**",
  cartao: "**** **** **** ****",
  "chave-pix": "***@***",
  telefone: "(**) *****-****",
};

const UNIDADES: Readonly<Record<string, number>> = {
  zero: 0, um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9,
  dez: 10, onze: 11, doze: 12, treze: 13, quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16, dezessete: 17,
  dezoito: 18, dezenove: 19,
};
const DEZENAS: Readonly<Record<string, number>> = {
  vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, setenta: 70, oitenta: 80, noventa: 90,
};
const PALAVRA_DE_NUMERO = [...Object.keys(UNIDADES), ...Object.keys(DEZENAS), "três"].join("|");

const semAcento = (texto: string) => texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** "trinta e quatro, nove zero zero" vira "349 00". Só junta palavras de número. */
function numeroPorExtenso(texto: string): string {
  const palavras = semAcento(texto).match(/[a-z]+/g) ?? [];
  let numero = "";
  for (let i = 0; i < palavras.length; i++) {
    const palavra = palavras[i] ?? "";
    const dezena = DEZENAS[palavra];
    const unidade = palavras[i + 1] === "e" ? UNIDADES[palavras[i + 2] ?? ""] : undefined;
    if (dezena !== undefined && unidade !== undefined && unidade < 10) {
      numero += String(dezena + unidade);
      i += 2;
    } else if (dezena !== undefined) numero += String(dezena);
    else if (UNIDADES[palavra] !== undefined) numero += String(UNIDADES[palavra]);
  }
  return numero;
}

const SEPARADOR = String.raw`[ .\/()-]`;
const PONTO = String.raw`(?:\s?\.\s?|\s?[\[(](?:dot|ponto)[\])]\s?|\s(?:dot|ponto)\s)`;
const ARROBA = String.raw`(?:\s?@\s?|\s?[\[(](?:at|arroba)[\])]\s?|\s(?:at|arroba)\s)`;

/**
 * A ordem importa: o que já virou asterisco não casa com o detector seguinte. E-mail e chave
 * aleatória vêm antes dos números, porque podem ter dígitos dentro; CNPJ e CPF vêm antes do
 * cartão e do telefone, porque são os únicos com dígito verificador próprio. Os três últimos
 * pegam o que o robô foi levado a disfarçar: dígitos com separador no meio e número por extenso.
 */
const DETECTORES: readonly Detector[] = [
  {
    regra: "chave-pix",
    padrao: /\b[0-9a-f]{8}[ -]?[0-9a-f]{4}[ -]?[0-9a-f]{4}[ -]?[0-9a-f]{4}[ -]?[0-9a-f]{12}\b/gi,
    confere: (achado) => /[a-f]/i.test(achado),
    mascarar: () => "********-****-****-****-************",
  },
  {
    regra: "chave-pix",
    padrao: /[\w.+-]{1,64}@[\w-]+(?:\.[\w-]+)+/g,
    confere: sempre,
    mascarar: () => MASCARAS["chave-pix"],
  },
  {
    regra: "chave-pix",
    padrao: new RegExp(String.raw`[\w+-]{1,64}(?:\s?\.\s?[\w+-]{1,64}){0,8}${ARROBA}[\w-]+(?:${PONTO}[\w-]+)+`, "gi"),
    confere: (achado) => !/^\d+$/.test(achado.replace(/\W/g, "")),
    mascarar: () => MASCARAS["chave-pix"],
  },
  {
    regra: "cnpj",
    padrao: /(?<![0-9A-Za-z])(?:[0-9A-Z]{2}\.[0-9A-Z]{3}\.[0-9A-Z]{3}\/[0-9A-Z]{4}-\d{2}|\d{14})(?![0-9A-Za-z])/gi,
    confere: cnpjValido,
    mascarar: () => MASCARAS.cnpj,
  },
  {
    regra: "cpf",
    padrao: /(?<!\d)\d{3}[. ]?\d{3}[. ]?\d{3}[- ]?\d{2}(?!\d)/g,
    confere: cpfValido,
    mascarar: () => MASCARAS.cpf,
  },
  {
    regra: "cartao",
    padrao: /(?<!\d)\d(?:[ -]?\d){12,18}(?!\d)/g,
    confere: cartaoValido,
    mascarar: (achado) => `**** **** **** ${digitos(achado).slice(-4)}`,
  },
  {
    regra: "cartao",
    padrao: /\b(cvv|cvc|c[oó]digo de seguran[cç]a)\s*:?\s*\d{3,4}\b/gi,
    confere: sempre,
    mascarar: (achado) => achado.replace(/\d/g, "*"),
  },
  {
    regra: "telefone",
    padrao: /(?<![\d*])(?:\+?55[ -]?)?(?:\(0?\d{2}\)|0?\d{2})[ -]?(?:9[ -]?)?\d{4}[ -]?\d{4}(?!\d)/g,
    confere: (achado) => telefoneValido(achado.replace(/^(\D*)0/, "$1")),
    mascarar: () => MASCARAS.telefone,
  },
  {
    regra: "telefone",
    padrao: /(?<![\d*-])9\d{4}-\d{4}(?![\d-])/g,
    confere: sempre,
    mascarar: () => MASCARAS.telefone,
  },
  ...(["cpf", "cnpj", "cartao", "telefone"] as const).map(
    (regra): Detector => ({
      regra,
      padrao: new RegExp(String.raw`(?<![0-9A-Za-z*])\d(?:${SEPARADOR}?\d){9,18}(?![0-9A-Za-z*])`, "g"),
      confere: (achado) => regraDosDigitos(digitos(achado)) === regra,
      mascarar: () => MASCARAS[regra],
    }),
  ),
  ...(["cpf", "cnpj", "cartao", "telefone"] as const).map(
    (regra): Detector => ({
      regra,
      padrao: new RegExp(String.raw`(?<![\p{L}\d])(?:${PALAVRA_DE_NUMERO})(?![\p{L}\d])(?:[\s,;.-]+(?:e\s+)?(?:${PALAVRA_DE_NUMERO})(?![\p{L}\d])){4,}`, "giu"),
      confere: (achado) => regraDosDigitos(numeroPorExtenso(achado)) === regra,
      mascarar: () => MASCARAS[regra],
    }),
  ),
];

/** Forma comparável de um dado: sem pontuação, minúsculo, e telefone sem o 55 do país. */
function chave(dado: string): string {
  const limpo = dado.toLowerCase().replace(/[\s().\/+-]/g, "");
  return /^55\d{10,11}$/.test(limpo) ? limpo.slice(2) : limpo;
}

/** Os dados pessoais que aparecem num texto, do jeito que estão escritos. */
export function acharDados(texto: string): string[] {
  return DETECTORES.flatMap((detector) => [...texto.matchAll(detector.padrao)].map(([achado]) => achado).filter(detector.confere));
}

/**
 * Esconde da resposta os dados pessoais que conferem. `publicos` são os dados que podem sair:
 * os da própria empresa (CNPJ, telefone, chave Pix) e os que a própria pessoa mandou.
 */
export function mascararSaida(resposta: string, publicos: readonly string[] = []): ChecagemSaida {
  const liberados = new Set(publicos.map(chave));
  const contagem = new Map<RegraSaida, number>();
  let texto = resposta;
  for (const detector of DETECTORES) {
    texto = texto.replace(detector.padrao, (achado) => {
      if (liberados.has(chave(achado)) || !detector.confere(achado)) return achado;
      contagem.set(detector.regra, (contagem.get(detector.regra) ?? 0) + 1);
      return detector.mascarar(achado);
    });
  }
  const mascaras = [...contagem].map(([regra, quantidade]) => ({ regra, quantidade }));
  return { texto, mascaras };
}
