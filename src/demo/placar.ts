import { REGRAS } from "../guarda/index.ts";
import {
  CATEGORIAS_DE_ATAQUE,
  CATEGORIAS_NORMAIS,
  CONJUNTO,
  GRUPOS,
  LOTES,
  VARIACOES,
  type Ataque,
  type Lote,
  type Normal,
} from "../placar/conjunto.ts";
import { contar, medirPlacar, porCategoria, porcentagem, type Contagem, type Resultado } from "../placar/medir.ts";
import { elemento } from "./dom.ts";

function barra(nome: string, contagem: Contagem): HTMLLIElement {
  const preenchida = elemento("span", "");
  preenchida.style.width = `${contagem.total === 0 ? 0 : (contagem.certos / contagem.total) * 100}%`;
  const trilho = elemento("span", "barra", preenchida);
  trilho.setAttribute("aria-hidden", "true");
  return elemento(
    "li",
    contagem.certos === contagem.total ? "linha cheia" : "linha",
    elemento("span", "nome", nome),
    trilho,
    elemento("span", "conta", `${contagem.certos}/${contagem.total}`),
  );
}

function destaque(numero: Contagem, frase: string): HTMLDivElement {
  return elemento(
    "div",
    "destaque",
    elemento("strong", "", porcentagem(numero)),
    elemento("span", "", `${numero.certos} de ${numero.total} ${frase}`),
  );
}

function mensagens({ caso }: Resultado): HTMLElement {
  const partes = caso.partes.map((p) => elemento("q", "", p));
  const bloco = elemento("div", "mensagens", ...partes);
  if (caso.tipo === "ataque" && caso.resposta !== undefined) {
    bloco.append(elemento("div", "resposta", elemento("span", "", "Robô"), elemento("q", "", caso.resposta)));
  }
  return bloco;
}

function ataqueQuePassou(resultado: Resultado<Ataque>): HTMLLIElement {
  const { nome, regra } = CATEGORIAS_DE_ATAQUE[resultado.caso.categoria];
  return elemento(
    "li",
    "erro",
    mensagens(resultado),
    elemento("p", "", `${nome}, ${VARIACOES[resultado.caso.variacao]}. Regra que falhou: `, elemento("strong", "", REGRAS[regra].nome)),
  );
}

function normalBarrada(resultado: Resultado<Normal>): HTMLLIElement {
  const regras = resultado.disparos.flatMap((d, i) => [
    ...(i > 0 ? [", "] : []),
    elemento("strong", "", REGRAS[d.regra].nome),
    ...(d.trecho ? [` em “${d.trecho}”`] : []),
  ]);
  return elemento(
    "li",
    "erro",
    mensagens(resultado),
    elemento("p", "", `${CATEGORIAS_NORMAIS[resultado.caso.categoria]}. Regra: `, ...regras),
  );
}

function listaDeErros<R>(titulo: string, erros: readonly R[], item: (r: R) => HTMLLIElement): HTMLElement {
  return elemento(
    "div",
    "erros",
    elemento("h3", "", `${titulo} (${erros.length})`),
    erros.length > 0 ? elemento("ol", "", ...erros.map(item)) : elemento("p", "", "Nenhum."),
  );
}

/** Roda o conjunto inteiro pela guarda, aqui no navegador, e mostra o resultado com os erros. */
export async function mostrarPlacar(alvo: HTMLElement): Promise<void> {
  const inicio = performance.now();
  const placar = await medirPlacar(CONJUNTO);
  const tempo = Math.max(1, Math.round(performance.now() - inicio));
  const ataques = contar(placar.ataques);
  const normais = contar(placar.normais);

  const lotes = ([1, 2] as const satisfies readonly Lote[]).map((lote) => {
    const a = contar(placar.ataques.filter((r) => r.caso.lote === lote));
    const n = contar(placar.normais.filter((r) => r.caso.lote === lote));
    return elemento(
      "tr",
      "",
      elemento("th", "", LOTES[lote]),
      elemento("td", "", `${porcentagem(a)}`, elemento("small", "", ` ${a.certos}/${a.total}`)),
      elemento("td", "", `${porcentagem(n)}`, elemento("small", "", ` ${n.certos}/${n.total}`)),
    );
  });

  const grupos = Object.entries(GRUPOS).map(([grupo, titulo]) => {
    const linhas = [...porCategoria(placar.ataques)]
      .filter(([categoria]) => CATEGORIAS_DE_ATAQUE[categoria].grupo === grupo)
      .map(([categoria, resultados]) => barra(CATEGORIAS_DE_ATAQUE[categoria].nome, contar(resultados)));
    return elemento("div", "grupo-placar", elemento("h3", "", titulo), elemento("ol", "", ...linhas));
  });
  const normaisPorCategoria = [...porCategoria(placar.normais)].map(([categoria, resultados]) =>
    barra(CATEGORIAS_NORMAIS[categoria], contar(resultados)),
  );

  alvo.replaceChildren(
    elemento("h2", "", "Placar ", elemento("small", "", `medido agora no seu navegador, em ${tempo} ms`)),
    elemento(
      "div",
      "destaques",
      destaque(ataques, "ataques inventados em português barrados"),
      destaque(normais, "mensagens normais passaram sem mudança"),
    ),
    elemento(
      "table",
      "lotes",
      elemento("thead", "", elemento("tr", "", elemento("th", "", ""), elemento("th", "", "Ataques barrados"), elemento("th", "", "Normais que passaram"))),
      elemento("tbody", "", ...lotes),
    ),
    elemento(
      "div",
      "categorias",
      ...grupos,
      elemento("div", "grupo-placar", elemento("h3", "", "Mensagens normais"), elemento("ol", "", ...normaisPorCategoria)),
    ),
    elemento(
      "div",
      "lista-erros",
      listaDeErros("Ataques que a guarda deixou passar", placar.ataques.filter((r) => !r.certo), ataqueQuePassou),
      listaDeErros("Mensagens normais barradas por engano", placar.normais.filter((r) => !r.certo), normalBarrada),
    ),
  );
}
