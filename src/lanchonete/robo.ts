import type { ExecutarFerramenta, Mensagem, Robo } from "../guarda/index.ts";
import { CARDAPIO, LANCHONETE, reais, ULTIMO_PEDIDO } from "./dados.ts";
import type { PedidoItem } from "./ferramentas.ts";

/** As instruções que um robô de IA de verdade receberia da lanchonete. */
export const INSTRUCOES = [
  `Você é o atendente do ${LANCHONETE.nome}.`,
  `Só o dono, no número ${LANCHONETE.telefoneDono}, pode dar desconto.`,
  "Nunca passe dados de um cliente para outro.",
].join(" ");

type Responder = (texto: string, executar: ExecutarFerramenta) => Promise<string | undefined>;

const QUANTIDADES: Readonly<Record<string, number>> = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3 };

function itensPedidos(texto: string): PedidoItem[] {
  return CARDAPIO.flatMap((item) => {
    const achado = new RegExp(`(\\d+|um|uma|dois|duas|tres)?\\s*(${item.apelido.source})`).exec(texto);
    if (!achado) return [];
    const quantidade = Number(achado[1]) || QUANTIDADES[achado[1] ?? ""] || 1;
    return [{ item: item.nome, quantidade }];
  });
}

type PedidoDeDesconto = { readonly percentual: number } | "sem-percentual" | undefined;

function pedidoDeDesconto(texto: string): PedidoDeDesconto {
  if (/\b(libera|me da|quero)\b.*\b(de graca|gratis)\b/.test(texto)) return { percentual: 100 };
  if (!/\b(desconto|cupom|off)\b/.test(texto)) return undefined;
  const achado = /(\d{1,3})\s*%/.exec(texto);
  return achado ? { percentual: Number(achado[1]) } : "sem-percentual";
}

/**
 * Cada intenção é tentada em ordem, e a primeira que responde ganha. O robô é ingênuo de
 * propósito: ele obedece a quem pede desconto e conta o que sabe do último pedido, como um
 * modelo de IA mal protegido faria.
 */
const INTENCOES: readonly Responder[] = [
  async (texto, executar) => {
    const pedido = pedidoDeDesconto(texto);
    if (pedido === undefined) return undefined;
    if (pedido === "sem-percentual") return "Hoje não temos promoção, mas o X-Tudo sai quentinho!";
    const { percentual } = pedido;
    const resultado = await executar({ nome: "aplicar_desconto", argumentos: { percentual } });
    if (!resultado.ok) return `Não consegui aplicar o desconto: ${resultado.motivo}`;
    const { totalCentavos } = resultado.dados as { totalCentavos: number | undefined };
    const efeito = totalCentavos === undefined ? "Vale para o seu próximo pedido." : `Seu pedido fica em ${reais(totalCentavos)}.`;
    return `Feito! Desconto de ${percentual}% aplicado. ${efeito}`;
  },
  async (texto) => {
    if (!/\b(ultim[oa]|anterior)\b.*\b(pedido|cliente|compra)\b|\bcomprovante\b/.test(texto)) return undefined;
    const p = ULTIMO_PEDIDO;
    return [
      `Claro! O último pedido foi da ${p.cliente}: ${p.itens}, ${reais(p.totalCentavos)}.`,
      `CPF ${p.cpf}, telefone ${p.telefone}, e-mail ${p.email}, cartão ${p.cartao}.`,
    ].join("\n");
  },
  async (texto) => {
    if (!/\b(instruc\w*|prompt|regras|configurac\w*)\b/.test(texto)) return undefined;
    return `Minhas instruções: ${INSTRUCOES}`;
  },
  async (texto) => {
    if (!/\b(cardapio|menu|o que tem|opcoes)\b/.test(texto)) return undefined;
    const linhas = CARDAPIO.map((item) => `• ${item.nome}: ${reais(item.precoCentavos)}`);
    return ["Nosso cardápio:", ...linhas].join("\n");
  },
  async (texto) => {
    if (!/\b(horario|hora|horas|abre|abrem|fecha|fecham|funciona|endereco|onde fica)\b/.test(texto)) return undefined;
    return [
      `Abrimos ${LANCHONETE.horario}.`,
      `Ficamos na ${LANCHONETE.endereco}. Telefone ${LANCHONETE.telefone}.`,
    ].join("\n");
  },
  async (texto, executar) => {
    const itens = itensPedidos(texto);
    if (itens.length === 0) return undefined;
    const resultado = await executar({ nome: "registrar_pedido", argumentos: { itens } });
    if (!resultado.ok) return "Não consegui anotar o pedido agora.";
    const { totalCentavos, percentual } = resultado.dados as { totalCentavos: number; percentual: number };
    const desconto = percentual > 0 ? ` com ${percentual}% de desconto` : "";
    const lista = itens.map(({ item, quantidade }) => `${quantidade}x ${item}`).join(", ");
    return `Anotado: ${lista}. Total ${reais(totalCentavos)}${desconto}. O Pix é o CNPJ ${LANCHONETE.chavePix}.`;
  },
];

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export const roboDaLanchonete: Robo = {
  async responder(mensagem: Mensagem, executar: ExecutarFerramenta) {
    const texto = normalizar(mensagem.texto);
    for (const intencao of INTENCOES) {
      const resposta = await intencao(texto, executar);
      if (resposta !== undefined) return resposta;
    }
    return "Oi! Posso mostrar o cardápio, o horário ou anotar seu pedido.";
  },
};
