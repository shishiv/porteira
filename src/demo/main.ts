import {
  criarPorteira,
  guardaAgiu,
  REGRAS,
  type ChamadaFerramenta,
  type Decisao,
  type ExecutarFerramenta,
  type Mensagem,
} from "../guarda/index.ts";
import {
  criarFerramentas,
  EXEMPLOS,
  LANCHONETE,
  NUMEROS,
  POLITICA,
  roboDaLanchonete,
  type Exemplo,
} from "../lanchonete/index.ts";

type Remetente = keyof typeof NUMEROS;

/** Um envio da conversa e o que aconteceu com ele, no modo em que foi enviado. */
type Registro = { readonly de: Remetente; readonly texto: string; readonly resposta: string } & (
  | { readonly modo: "com-guarda"; readonly decisoes: readonly Decisao[] }
  | { readonly modo: "sem-guarda"; readonly chamadas: readonly ChamadaFerramenta[] }
);

function elemento<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  classe?: string,
  ...filhos: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  el.append(...filhos);
  return el;
}

function achar<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Elemento #${id} não existe na página`);
  return el as T;
}

const tela = {
  guarda: achar<HTMLInputElement>("guarda"),
  guardaRotulo: achar("guarda-rotulo"),
  conversa: achar<HTMLOListElement>("conversa"),
  relatorio: achar<HTMLOListElement>("relatorio"),
  ataques: achar("ataques"),
  normais: achar("normais"),
  envio: achar<HTMLFormElement>("envio"),
  remetente: achar<HTMLSelectElement>("remetente"),
  texto: achar<HTMLInputElement>("texto"),
  limpar: achar<HTMLButtonElement>("limpar"),
};

type Modo = Registro["modo"];

/** Cada modo tem o próprio pedido aberto, para o desconto obedecido sem guarda não aparecer com ela. */
const novasFerramentas = (): Record<Modo, ExecutarFerramenta> => ({
  "com-guarda": criarFerramentas(),
  "sem-guarda": criarFerramentas(),
});
let ferramentas = novasFerramentas();

async function enviar(de: Remetente, texto: string): Promise<Registro> {
  const mensagem: Mensagem = { de: NUMEROS[de], texto };
  if (tela.guarda.checked) {
    const { resposta, decisoes } = await criarPorteira(roboDaLanchonete, ferramentas["com-guarda"], POLITICA).atender(mensagem);
    return { de, texto, resposta, modo: "com-guarda", decisoes };
  }
  const chamadas: ChamadaFerramenta[] = [];
  const executarGravando: ExecutarFerramenta = (chamada) => {
    chamadas.push(chamada);
    return ferramentas["sem-guarda"](chamada);
  };
  const resposta = await roboDaLanchonete.responder(mensagem, executarGravando);
  return { de, texto, resposta, modo: "sem-guarda", chamadas };
}

function descreverChamada({ nome, argumentos }: ChamadaFerramenta): string {
  if (nome === "aplicar_desconto") return `aplicar_desconto(${String(argumentos["percentual"])}%)`;
  return nome;
}

function linhaDeDecisao(decisao: Decisao): HTMLLIElement | undefined {
  switch (decisao.etapa) {
    case "entrada":
      if (decisao.acao === "passou") return undefined;
      return elemento(
        "li",
        "passo barrou",
        elemento("span", "etapa", "Entrada barrada"),
        ...decisao.achados.map(({ regra, trecho }) =>
          elemento("div", "regra", elemento("strong", "", REGRAS[regra].nome), elemento("q", "", trecho)),
        ),
      );
    case "ferramenta":
      if (decisao.acao === "permitiu") {
        return elemento("li", "passo", elemento("span", "etapa", "Ação liberada"), elemento("code", "", descreverChamada(decisao.chamada)));
      }
      return elemento(
        "li",
        "passo barrou",
        elemento("span", "etapa", "Ação negada"),
        elemento("code", "", descreverChamada(decisao.chamada)),
        elemento("div", "regra", elemento("strong", "", REGRAS[decisao.regra].nome), REGRAS[decisao.regra].explicacao),
      );
    case "saida":
      if (decisao.acao === "passou") return undefined;
      return elemento(
        "li",
        "passo barrou",
        elemento("span", "etapa", "Resposta mascarada"),
        ...decisao.mascaras.map(({ regra, quantidade }) =>
          elemento(
            "div",
            "regra",
            elemento("strong", "", quantidade > 1 ? `${REGRAS[regra].nome} ×${quantidade}` : REGRAS[regra].nome),
            REGRAS[regra].explicacao,
          ),
        ),
      );
  }
}

function itemDoRelatorio(registro: Registro): HTMLLIElement {
  const cabecalho = elemento("div", "pedido", elemento("q", "", registro.texto));
  if (registro.modo === "sem-guarda") {
    const chamadas = registro.chamadas.map((c) =>
      elemento("li", "passo sem", elemento("span", "etapa", "Ação executada"), elemento("code", "", descreverChamada(c))),
    );
    return elemento("li", "item sem", cabecalho, elemento("p", "nada", "Guarda desligada"), elemento("ol", "", ...chamadas));
  }
  const passos = registro.decisoes.flatMap((d) => linhaDeDecisao(d) ?? []);
  const agiu = registro.decisoes.some(guardaAgiu);
  return elemento(
    "li",
    agiu ? "item barrou" : "item",
    cabecalho,
    ...(agiu ? [] : [elemento("p", "nada", "Passou sem mudança")]),
    ...(passos.length > 0 ? [elemento("ol", "", ...passos)] : []),
  );
}

const ROTULO_DA_ETAPA = { entrada: "Barrado na entrada", ferramenta: "Ação negada", saida: "Dados mascarados" } as const;

/** O selo no balão do robô diz, na própria conversa, onde a guarda agiu. */
function seloDaGuarda(registro: Registro): string | undefined {
  if (registro.modo === "sem-guarda") return undefined;
  const etapas = new Set(registro.decisoes.filter(guardaAgiu).map((d) => d.etapa));
  if (etapas.size === 0) return undefined;
  return `Porteira: ${[...etapas].map((e) => ROTULO_DA_ETAPA[e]).join(", ")}`;
}

function balao(lado: "cliente" | "robo", texto: string, rotulo?: string): HTMLLIElement {
  return elemento("li", `balao ${lado}`, ...(rotulo ? [elemento("small", "", rotulo)] : []), elemento("p", "", texto));
}

async function mandar(de: Remetente, texto: string): Promise<void> {
  if (!texto.trim()) return;
  tela.conversa.append(balao("cliente", texto, de === "dono" ? "Dono" : undefined));
  const registro = await enviar(de, texto);
  tela.conversa.append(balao("robo", registro.resposta, seloDaGuarda(registro)));
  tela.conversa.lastElementChild?.scrollIntoView({ block: "end", behavior: "smooth" });
  tela.relatorio.prepend(itemDoRelatorio(registro));
}

function botaoDeExemplo(exemplo: Exemplo): HTMLButtonElement {
  const botao = elemento("button", `atalho ${exemplo.tipo}`, exemplo.titulo);
  botao.type = "button";
  botao.title = exemplo.texto;
  botao.addEventListener("click", () => void mandar(exemplo.de, exemplo.texto));
  return botao;
}

function mostrarModo(): void {
  const ligada = tela.guarda.checked;
  tela.guardaRotulo.textContent = ligada ? "Com guarda" : "Sem guarda";
  document.body.classList.toggle("desligada", !ligada);
}

achar("nome-lanchonete").textContent = LANCHONETE.nome;
tela.ataques.append(...EXEMPLOS.filter((e) => e.tipo === "ataque").map(botaoDeExemplo));
tela.normais.append(...EXEMPLOS.filter((e) => e.tipo === "normal").map(botaoDeExemplo));
tela.guarda.addEventListener("change", mostrarModo);
tela.envio.addEventListener("submit", (evento) => {
  evento.preventDefault();
  const texto = tela.texto.value;
  tela.texto.value = "";
  void mandar(tela.remetente.value === "dono" ? "dono" : "cliente", texto);
});
tela.limpar.addEventListener("click", () => {
  ferramentas = novasFerramentas();
  tela.conversa.replaceChildren();
  tela.relatorio.replaceChildren();
});
mostrarModo();
