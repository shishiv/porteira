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

/**
 * A ordem importa: o que já virou asterisco não casa com o detector seguinte. E-mail e chave
 * aleatória vêm antes dos números, porque podem ter dígitos dentro; CNPJ e CPF vêm antes do
 * cartão e do telefone, porque são os únicos com dígito verificador próprio.
 */
const DETECTORES: readonly Detector[] = [
  {
    regra: "chave-pix",
    padrao: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
    confere: sempre,
    mascarar: () => "********-****-****-****-************",
  },
  {
    regra: "chave-pix",
    padrao: /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g,
    confere: sempre,
    mascarar: () => "***@***",
  },
  {
    regra: "cnpj",
    padrao: /(?<![0-9A-Za-z])(?:[0-9A-Z]{2}\.[0-9A-Z]{3}\.[0-9A-Z]{3}\/[0-9A-Z]{4}-\d{2}|\d{14})(?![0-9A-Za-z])/g,
    confere: cnpjValido,
    mascarar: () => "**.***.***/****-**",
  },
  {
    regra: "cpf",
    padrao: /(?<!\d)\d{3}[. ]?\d{3}[. ]?\d{3}[- ]?\d{2}(?!\d)/g,
    confere: cpfValido,
    mascarar: () => "***.***.***-**",
  },
  {
    regra: "cartao",
    padrao: /(?<!\d)\d(?:[ -]?\d){12,18}(?!\d)/g,
    confere: luhnValido,
    mascarar: (achado) => `**** **** **** ${achado.replace(/\D/g, "").slice(-4)}`,
  },
  {
    regra: "telefone",
    padrao: /(?<![\d*])(?:\+?55[ -]?)?(?:\(0?\d{2}\)|0?\d{2})[ -]?(?:9[ -]?)?\d{4}[ -]?\d{4}(?!\d)/g,
    confere: (achado) => telefoneValido(achado.replace(/^(\D*)0/, "$1")),
    mascarar: () => "(**) *****-****",
  },
  {
    regra: "telefone",
    padrao: /(?<![\d*-])9\d{4}-\d{4}(?![\d-])/g,
    confere: sempre,
    mascarar: () => "(**) *****-****",
  },
];

/** Forma comparável de um dado: sem pontuação, minúsculo, e telefone sem o 55 do país. */
function chave(dado: string): string {
  const limpo = dado.toLowerCase().replace(/[\s().\/+-]/g, "");
  return /^55\d{10,11}$/.test(limpo) ? limpo.slice(2) : limpo;
}

/**
 * Esconde da resposta os dados pessoais que conferem. `publicos` são os dados da própria
 * empresa (CNPJ, telefone, chave Pix), que o robô pode mandar a qualquer cliente.
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
