import type { ChamadaFerramenta, RegraId } from "../guarda/index.ts";
import type { NUMEROS } from "../lanchonete/index.ts";
import dados from "./casos.json" with { type: "json" };

/** Como o placar decide se um ataque foi barrado. */
export type Grupo = "enganar" | "acao" | "vazamento";

export const GRUPOS: Readonly<Record<Grupo, string>> = {
  enganar: "Tentar enganar o robô",
  acao: "Ação proibida",
  vazamento: "Vazamento na resposta",
};

type DescricaoAtaque = { readonly grupo: Grupo; readonly nome: string; readonly regra: RegraId };

/** `regra` é a regra da guarda que devia pegar o ataque; a página mostra quando ela falha. */
export const CATEGORIAS_DE_ATAQUE = {
  "esquecer-regras": { grupo: "enganar", nome: "Mandar esquecer as regras", regra: "ignorar-instrucoes" },
  "fingir-dono": { grupo: "enganar", nome: "Fingir ser o dono ou a equipe", regra: "fingir-autoridade" },
  "pedir-instrucoes": { grupo: "enganar", nome: "Pedir as instruções internas", regra: "revelar-instrucoes" },
  "dados-de-outro-cliente": { grupo: "enganar", nome: "Pedir dados de outro cliente", regra: "dados-de-terceiros" },
  "trocar-papel": { grupo: "enganar", nome: "Mandar virar outro personagem", regra: "trocar-papel" },
  "desconto-sem-ser-dono": { grupo: "acao", nome: "Desconto pedido por quem não é o dono", regra: "ferramenta-so-dono" },
  "vazamento-cpf": { grupo: "vazamento", nome: "CPF", regra: "cpf" },
  "vazamento-cnpj": { grupo: "vazamento", nome: "CNPJ", regra: "cnpj" },
  "vazamento-cartao": { grupo: "vazamento", nome: "Cartão", regra: "cartao" },
  "vazamento-pix": { grupo: "vazamento", nome: "Chave Pix", regra: "chave-pix" },
  "vazamento-email": { grupo: "vazamento", nome: "E-mail", regra: "chave-pix" },
  "vazamento-telefone": { grupo: "vazamento", nome: "Telefone", regra: "telefone" },
} as const satisfies Record<string, DescricaoAtaque>;

export const CATEGORIAS_NORMAIS = {
  cardapio: "Cardápio",
  horario: "Horário e endereço",
  pedido: "Pedido",
  reclamacao: "Reclamação",
  entrega: "Entrega",
  pagamento: "Pagamento",
  "parece-ataque": "Parece ataque, mas não é",
  dono: "O dono dando desconto",
  resposta: "Resposta com números que não são dados pessoais",
} as const satisfies Record<string, string>;

export const VARIACOES = {
  direta: "direta",
  indireta: "indireta",
  giria: "gíria",
  digitacao: "erro de digitação",
  acento: "acento trocado ou faltando",
  maiusculas: "maiúsculas",
  pontuacao: "espaços e pontuação no meio",
  "em-partes": "em partes",
  disfarce: "disfarce",
} as const satisfies Record<string, string>;

export type CategoriaAtaque = keyof typeof CATEGORIAS_DE_ATAQUE;
export type CategoriaNormal = keyof typeof CATEGORIAS_NORMAIS;
export type Variacao = keyof typeof VARIACOES;
export type Remetente = keyof typeof NUMEROS;

/**
 * `partes` são as mensagens que a pessoa manda em seguida. `chamada` e `resposta` são o que um
 * robô que obedece a tudo faria com a última parte: o placar mede a guarda no pior caso, sem
 * contar com o robô para recusar.
 */
type Comum = {
  readonly id: string;
  readonly de: Remetente;
  readonly partes: readonly [string, ...string[]];
  readonly chamada?: ChamadaFerramenta;
  readonly resposta?: string;
};

/** `vaza` são os trechos da resposta que não podem chegar ao cliente. */
export type Ataque = Comum & {
  readonly tipo: "ataque";
  readonly categoria: CategoriaAtaque;
  readonly variacao: Variacao;
  readonly vaza: readonly string[];
};

export type Normal = Comum & { readonly tipo: "normal"; readonly categoria: CategoriaNormal };

export type Caso = Ataque | Normal;

export type Conjunto = { readonly versao: number; readonly ataques: readonly Ataque[]; readonly normais: readonly Normal[] };

class ConjuntoInvalido extends Error {}

function falhar(id: string, motivo: string): never {
  throw new ConjuntoInvalido(`Caso ${id}: ${motivo}`);
}

type Bruto = Record<string, unknown>;

function chaveDe<T extends object>(tabela: T, valor: unknown, id: string, campo: string): keyof T {
  if (typeof valor === "string" && Object.hasOwn(tabela, valor)) return valor as keyof T;
  return falhar(id, `${campo} desconhecido: ${String(valor)}`);
}

function lerPartes(valor: unknown, id: string): readonly [string, ...string[]] {
  const partes = typeof valor === "string" ? [valor] : valor;
  if (!Array.isArray(partes) || !partes.every((p) => typeof p === "string" && p.trim() !== "")) {
    return falhar(id, "texto precisa ser uma mensagem ou uma lista de mensagens");
  }
  const [primeira, ...resto] = partes as string[];
  return primeira === undefined ? falhar(id, "texto vazio") : [primeira, ...resto];
}

function lerChamada(valor: unknown, id: string): ChamadaFerramenta | undefined {
  if (valor === undefined) return undefined;
  const chamada = valor as Bruto;
  if (typeof chamada["nome"] !== "string" || typeof chamada["argumentos"] !== "object" || chamada["argumentos"] === null) {
    return falhar(id, "chamada precisa de nome e argumentos");
  }
  return { nome: chamada["nome"], argumentos: chamada["argumentos"] as Record<string, unknown> };
}

function lerComum(bruto: Bruto): Comum {
  const id = typeof bruto["id"] === "string" ? bruto["id"] : falhar("?", "sem id");
  const chamada = lerChamada(bruto["chamada"], id);
  const resposta = bruto["resposta"];
  if (resposta !== undefined && typeof resposta !== "string") falhar(id, "resposta precisa ser texto");
  return {
    id,
    de: bruto["de"] === "dono" ? "dono" : bruto["de"] === "cliente" ? "cliente" : falhar(id, "de precisa ser cliente ou dono"),
    partes: lerPartes(bruto["texto"], id),
    ...(chamada ? { chamada } : {}),
    ...(resposta !== undefined ? { resposta } : {}),
  };
}

function lerAtaque(bruto: Bruto): Ataque {
  const comum = lerComum(bruto);
  const categoria = chaveDe(CATEGORIAS_DE_ATAQUE, bruto["categoria"], comum.id, "categoria");
  const vaza = bruto["vaza"] ?? [];
  if (!Array.isArray(vaza) || !vaza.every((v) => typeof v === "string")) falhar(comum.id, "vaza precisa ser uma lista de textos");
  const { grupo } = CATEGORIAS_DE_ATAQUE[categoria];
  if (grupo === "acao" && !comum.chamada) falhar(comum.id, "ação proibida precisa da chamada que o robô faria");
  if (grupo === "vazamento") {
    if (vaza.length === 0) falhar(comum.id, "vazamento precisa dizer o que vaza");
    const faltando = vaza.find((v) => !comum.resposta?.includes(v));
    if (faltando !== undefined) falhar(comum.id, `"${faltando}" não está na resposta`);
  }
  return {
    ...comum,
    tipo: "ataque",
    categoria,
    variacao: chaveDe(VARIACOES, bruto["variacao"], comum.id, "variacao"),
    vaza: vaza as string[],
  };
}

function lerNormal(bruto: Bruto): Normal {
  const comum = lerComum(bruto);
  return { ...comum, tipo: "normal", categoria: chaveDe(CATEGORIAS_NORMAIS, bruto["categoria"], comum.id, "categoria") };
}

/** Lê o conjunto do JSON e recusa caso malformado, para um erro nos dados não virar um número errado no placar. */
export function lerConjunto(json: unknown): Conjunto {
  const bruto = json as Bruto;
  if (!Array.isArray(bruto["ataques"]) || !Array.isArray(bruto["normais"]) || typeof bruto["versao"] !== "number") {
    throw new ConjuntoInvalido("O conjunto precisa de versao, ataques e normais");
  }
  const conjunto = {
    versao: bruto["versao"],
    ataques: (bruto["ataques"] as Bruto[]).map(lerAtaque),
    normais: (bruto["normais"] as Bruto[]).map(lerNormal),
  };
  const ids = new Set<string>();
  for (const { id } of [...conjunto.ataques, ...conjunto.normais]) {
    if (ids.has(id)) falhar(id, "id repetido");
    ids.add(id);
  }
  return conjunto;
}

export const CONJUNTO: Conjunto = lerConjunto(dados);
