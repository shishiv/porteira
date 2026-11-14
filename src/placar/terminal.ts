import { REGRAS } from "../guarda/index.ts";
import { CATEGORIAS_DE_ATAQUE, CATEGORIAS_NORMAIS, CONJUNTO, GRUPOS, LOTES, VARIACOES, type Ataque, type Lote, type Normal } from "./conjunto.ts";
import { contar, medirPlacar, porCategoria, porcentagem, type Contagem, type Resultado } from "./medir.ts";

const placar = await medirPlacar(CONJUNTO);

function linha(nome: string, contagem: Contagem): string {
  const largura = 20;
  const cheio = contagem.total === 0 ? 0 : Math.round((contagem.certos / contagem.total) * largura);
  const barra = "█".repeat(cheio) + "░".repeat(largura - cheio);
  return `  ${nome.padEnd(48)} ${`${contagem.certos}/${contagem.total}`.padStart(7)}  ${barra} ${porcentagem(contagem)}`;
}

function texto({ caso }: Resultado): string {
  const mensagem = caso.partes.map((p) => `"${p}"`).join(" + ");
  return caso.tipo === "ataque" && caso.resposta !== undefined ? `${mensagem} → robô: "${caso.resposta}"` : mensagem;
}

const ataques = contar(placar.ataques);
const normais = contar(placar.normais);
const saida: string[] = [
  `Placar da Porteira, conjunto versão ${placar.versao}`,
  "",
  `Ataques inventados em português barrados: ${ataques.certos} de ${ataques.total} (${porcentagem(ataques)})`,
  `Mensagens normais que passaram:           ${normais.certos} de ${normais.total} (${porcentagem(normais)})`,
];

for (const lote of [1, 2] as const satisfies readonly Lote[]) {
  const a = contar(placar.ataques.filter((r) => r.caso.lote === lote));
  const n = contar(placar.normais.filter((r) => r.caso.lote === lote));
  saida.push(`  Lote ${lote}, ${LOTES[lote].toLowerCase()}: ataques ${a.certos}/${a.total} (${porcentagem(a)}), normais ${n.certos}/${n.total} (${porcentagem(n)})`);
}

for (const [grupo, titulo] of Object.entries(GRUPOS)) {
  saida.push("", titulo);
  for (const [categoria, resultados] of porCategoria(placar.ataques)) {
    const descricao = CATEGORIAS_DE_ATAQUE[categoria];
    if (descricao.grupo === grupo) saida.push(linha(descricao.nome, contar(resultados)));
  }
}
saida.push("", "Mensagens normais");
for (const [categoria, resultados] of porCategoria(placar.normais)) {
  saida.push(linha(CATEGORIAS_NORMAIS[categoria], contar(resultados)));
}

const passaram: Resultado<Ataque>[] = placar.ataques.filter((r) => !r.certo);
saida.push("", `Ataques que a guarda deixou passar (${passaram.length})`);
for (const r of passaram) {
  const { nome, regra } = CATEGORIAS_DE_ATAQUE[r.caso.categoria];
  saida.push(`  ${r.caso.id}  ${nome}, ${VARIACOES[r.caso.variacao]}. Regra que falhou: ${REGRAS[regra].nome}`);
  saida.push(`         ${texto(r)}`);
}

const barradas: Resultado<Normal>[] = placar.normais.filter((r) => !r.certo);
saida.push("", `Mensagens normais barradas por engano (${barradas.length})`);
for (const r of barradas) {
  const regras = r.disparos.map((d) => (d.trecho ? `${REGRAS[d.regra].nome} ("${d.trecho}")` : REGRAS[d.regra].nome));
  saida.push(`  ${r.caso.id}  ${CATEGORIAS_NORMAIS[r.caso.categoria]}. Regra: ${regras.join(", ")}`);
  saida.push(`         ${texto(r)}`);
}

console.log(saida.join("\n"));
