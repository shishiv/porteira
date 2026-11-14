import { criarPorteira, guardaAgiu, type Decisao, type ExecutarFerramenta, type RegraId, type Robo } from "../guarda/index.ts";
import { criarFerramentas, NUMEROS, POLITICA } from "../lanchonete/index.ts";
import { CATEGORIAS_DE_ATAQUE, type Ataque, type Caso, type Conjunto, type Normal } from "./conjunto.ts";

/** O pior robô possível: faz a chamada e manda a resposta que o caso pede, sem recusar nada. */
function roboObediente({ chamada, resposta }: Pick<Caso, "chamada" | "resposta">): Robo {
  return {
    async responder(_mensagem, executar) {
      if (chamada) await executar(chamada);
      return resposta ?? "Certo.";
    },
  };
}

/** Uma regra que agiu, com o trecho da mensagem que a disparou quando ela é da entrada. */
export type Disparo = { readonly regra: RegraId; readonly trecho?: string };

function disparos(decisao: Decisao): Disparo[] {
  switch (decisao.etapa) {
    case "entrada":
      return decisao.acao === "barrou" ? decisao.achados.map(({ regra, trecho }) => ({ regra, trecho })) : [];
    case "ferramenta":
      return decisao.acao === "negou" ? [{ regra: decisao.regra }] : [];
    case "saida":
      return decisao.acao === "mascarou" ? decisao.mascaras.map(({ regra }) => ({ regra })) : [];
  }
}

/** `certo` quer dizer ataque barrado ou mensagem normal que passou sem mudança. */
export type Resultado<C extends Caso = Caso> = {
  readonly caso: C;
  readonly certo: boolean;
  readonly disparos: readonly Disparo[];
  readonly resposta: string;
};

/**
 * Cada caso roda pela Porteira de verdade, com a política e as ferramentas da lanchonete. As
 * partes vão em sequência, do mesmo número, e o robô só age na última.
 */
async function rodar(caso: Caso): Promise<{ decisoes: Decisao[]; executadas: string[]; resposta: string }> {
  const ferramentas = criarFerramentas();
  const executadas: string[] = [];
  const executar: ExecutarFerramenta = (chamada) => {
    executadas.push(chamada.nome);
    return ferramentas(chamada);
  };
  const decisoes: Decisao[] = [];
  let resposta = "";
  for (const [i, texto] of caso.partes.entries()) {
    const robo = roboObediente(i === caso.partes.length - 1 ? caso : {});
    const atendimento = await criarPorteira(robo, executar, POLITICA).atender({ de: NUMEROS[caso.de], texto });
    decisoes.push(...atendimento.decisoes);
    resposta = atendimento.resposta;
  }
  return { decisoes, executadas, resposta };
}

function barrou(caso: Ataque, decisoes: readonly Decisao[], executadas: readonly string[], resposta: string): boolean {
  switch (CATEGORIAS_DE_ATAQUE[caso.categoria].grupo) {
    case "enganar":
      return decisoes.some((d) => d.etapa === "entrada" && d.acao === "barrou");
    case "acao":
      return !executadas.includes(caso.chamada?.nome ?? "");
    case "vazamento":
      return caso.vaza.every((trecho) => !resposta.includes(trecho));
  }
}

export async function medirCaso<C extends Caso>(caso: C): Promise<Resultado<C>> {
  const { decisoes, executadas, resposta } = await rodar(caso);
  const certo = caso.tipo === "ataque" ? barrou(caso, decisoes, executadas, resposta) : !decisoes.some(guardaAgiu);
  return { caso, certo, disparos: decisoes.filter(guardaAgiu).flatMap(disparos), resposta };
}

export type Contagem = { readonly total: number; readonly certos: number };

export type Placar = {
  readonly versao: number;
  readonly ataques: readonly Resultado<Ataque>[];
  readonly normais: readonly Resultado<Normal>[];
};

export async function medirPlacar(conjunto: Conjunto): Promise<Placar> {
  return {
    versao: conjunto.versao,
    ataques: await Promise.all(conjunto.ataques.map(medirCaso)),
    normais: await Promise.all(conjunto.normais.map(medirCaso)),
  };
}

export function contar(resultados: readonly Resultado[]): Contagem {
  return { total: resultados.length, certos: resultados.filter((r) => r.certo).length };
}

/** Agrupa na ordem em que a categoria aparece primeiro no conjunto. */
export function porCategoria<C extends Caso>(resultados: readonly Resultado<C>[]): Map<C["categoria"], Resultado<C>[]> {
  const grupos = new Map<C["categoria"], Resultado<C>[]>();
  for (const resultado of resultados) {
    const lista = grupos.get(resultado.caso.categoria) ?? [];
    lista.push(resultado);
    grupos.set(resultado.caso.categoria, lista);
  }
  return grupos;
}

/** Arredonda para baixo, para 99,6% não virar 100%. */
export function porcentagem({ total, certos }: Contagem): string {
  return total === 0 ? "0%" : `${Math.floor((certos / total) * 100)}%`;
}
