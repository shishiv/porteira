import { telefoneValido } from "./documentos.ts";

declare const marca: unique symbol;

/** Número de WhatsApp em dígitos, com o 55 do país. Vem da plataforma, nunca do texto da mensagem. */
export type Telefone = string & { readonly [marca]: "Telefone" };

export function lerTelefone(texto: string): Telefone {
  if (!telefoneValido(texto)) throw new Error(`Telefone inválido: ${texto}`);
  const digitos = texto.replace(/\D/g, "");
  return (digitos.startsWith("55") && digitos.length >= 12 ? digitos : `55${digitos}`) as Telefone;
}

export type Mensagem = { readonly de: Telefone; readonly texto: string };

export type ChamadaFerramenta = {
  readonly nome: string;
  readonly argumentos: Readonly<Record<string, unknown>>;
};

export type ResultadoFerramenta =
  | { readonly ok: true; readonly dados: unknown }
  | { readonly ok: false; readonly motivo: string };

export type ExecutarFerramenta = (chamada: ChamadaFerramenta) => Promise<ResultadoFerramenta>;

/**
 * O contrato que qualquer robô cumpre para ficar atrás da Porteira: recebe a mensagem e um
 * jeito de chamar ferramentas, e devolve o texto da resposta. Um robô com modelo de IA de
 * verdade cumpre o mesmo contrato.
 */
export interface Robo {
  responder(mensagem: Mensagem, executar: ExecutarFerramenta): Promise<string>;
}
