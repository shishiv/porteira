import { checarEntrada, type Achado } from "./entrada.ts";
import type { RegraDaEtapa } from "./regras.ts";
import type { ChamadaFerramenta, ExecutarFerramenta, Mensagem, Robo, Telefone } from "./robo.ts";
import { mascararSaida, type Mascara } from "./saida.ts";

/** Quem pode pedir cada ferramenta. Ferramenta fora da lista não roda para ninguém. */
export type Permissao = "todos" | "dono";

export type Politica = {
  readonly dono: Telefone;
  readonly ferramentas: Readonly<Record<string, Permissao>>;
  /** Dados da própria empresa que podem sair na resposta: CNPJ, telefone, chave Pix. */
  readonly dadosPublicos: readonly string[];
  /** O que o cliente recebe quando a mensagem dele é barrada. */
  readonly respostaBarrada: string;
};

export type RegraFerramenta = RegraDaEtapa<"ferramenta">;

export type ChecagemFerramenta =
  | { readonly acao: "permitiu" }
  | { readonly acao: "negou"; readonly regra: RegraFerramenta };

export function autorizarFerramenta(
  politica: Politica,
  de: Telefone,
  chamada: ChamadaFerramenta,
): ChecagemFerramenta {
  const permissao = politica.ferramentas[chamada.nome];
  if (permissao === undefined) return { acao: "negou", regra: "ferramenta-desconhecida" };
  if (permissao === "dono" && de !== politica.dono) return { acao: "negou", regra: "ferramenta-so-dono" };
  return { acao: "permitiu" };
}

/** Cada passo que a guarda deu num atendimento, na ordem em que aconteceu. */
export type Decisao =
  | { readonly etapa: "entrada"; readonly acao: "barrou"; readonly achados: readonly Achado[] }
  | { readonly etapa: "entrada"; readonly acao: "passou" }
  | { readonly etapa: "ferramenta"; readonly chamada: ChamadaFerramenta; readonly acao: "permitiu" }
  | {
      readonly etapa: "ferramenta";
      readonly chamada: ChamadaFerramenta;
      readonly acao: "negou";
      readonly regra: RegraFerramenta;
    }
  | { readonly etapa: "saida"; readonly acao: "mascarou"; readonly mascaras: readonly Mascara[] }
  | { readonly etapa: "saida"; readonly acao: "passou" };

/** Se este passo mudou algo: barrou a mensagem, negou uma ação ou mascarou a resposta. */
export function guardaAgiu(decisao: Decisao): boolean {
  return decisao.acao === "barrou" || decisao.acao === "negou" || decisao.acao === "mascarou";
}

export type Atendimento = { readonly resposta: string; readonly decisoes: readonly Decisao[] };

export type Porteira = { atender(mensagem: Mensagem): Promise<Atendimento> };

/**
 * Põe a guarda entre o WhatsApp e o robô: checa a mensagem antes do robô ler, cada
 * ferramenta antes de rodar e a resposta antes de sair.
 */
export function criarPorteira(robo: Robo, executar: ExecutarFerramenta, politica: Politica): Porteira {
  return {
    async atender(mensagem) {
      const entrada = checarEntrada(mensagem.texto);
      if (entrada.acao === "barrou") {
        return {
          resposta: politica.respostaBarrada,
          decisoes: [{ etapa: "entrada", acao: "barrou", achados: entrada.achados }],
        };
      }

      const decisoes: Decisao[] = [{ etapa: "entrada", acao: "passou" }];
      const executarComPermissao: ExecutarFerramenta = async (chamada) => {
        const checagem = autorizarFerramenta(politica, mensagem.de, chamada);
        decisoes.push({ etapa: "ferramenta", chamada, ...checagem });
        if (checagem.acao === "negou") return { ok: false, motivo: "Ação não permitida para este número." };
        return executar(chamada);
      };

      const saida = mascararSaida(await robo.responder(mensagem, executarComPermissao), politica.dadosPublicos);
      decisoes.push(
        saida.mascaras.length > 0
          ? { etapa: "saida", acao: "mascarou", mascaras: saida.mascaras }
          : { etapa: "saida", acao: "passou" },
      );
      return { resposta: saida.texto, decisoes };
    },
  };
}
