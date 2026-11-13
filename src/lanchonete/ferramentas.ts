import type { ExecutarFerramenta, Permissao } from "../guarda/index.ts";
import { CARDAPIO } from "./dados.ts";

/** Quem pode chamar cada ferramenta da lanchonete. A Porteira lê esta tabela. */
export const PERMISSOES = {
  registrar_pedido: "todos",
  aplicar_desconto: "dono",
} as const satisfies Record<string, Permissao>;

export type NomeFerramenta = keyof typeof PERMISSOES;

export type PedidoItem = { readonly item: string; readonly quantidade: number };

function lerItens(valor: unknown): PedidoItem[] | undefined {
  if (!Array.isArray(valor)) return undefined;
  const itens = valor.filter(
    (v): v is PedidoItem =>
      typeof v === "object" && v !== null && typeof v.item === "string" && Number.isInteger(v.quantidade) && v.quantidade > 0,
  );
  return itens.length === valor.length ? itens : undefined;
}

function lerPercentual(valor: unknown): number | undefined {
  return typeof valor === "number" && valor >= 0 && valor <= 100 ? valor : undefined;
}

/** As ferramentas de verdade da lanchonete: o que roda quando o robô pede, se ninguém barrar. */
export function criarFerramentas(): ExecutarFerramenta {
  let subtotalCentavos = 0;
  let percentual = 0;
  const total = () => Math.round(subtotalCentavos * (1 - percentual / 100));
  return async ({ nome, argumentos }) => {
    switch (nome as NomeFerramenta) {
      case "registrar_pedido": {
        const itens = lerItens(argumentos["itens"]);
        if (!itens) return { ok: false, motivo: "Itens do pedido inválidos." };
        subtotalCentavos = itens.reduce((soma, { item, quantidade }) => {
          const preco = CARDAPIO.find((c) => c.nome === item)?.precoCentavos ?? 0;
          return soma + preco * quantidade;
        }, 0);
        return { ok: true, dados: { totalCentavos: total(), percentual } };
      }
      case "aplicar_desconto": {
        const pedido = lerPercentual(argumentos["percentual"]);
        if (pedido === undefined) return { ok: false, motivo: "Percentual inválido." };
        percentual = pedido;
        return { ok: true, dados: { totalCentavos: subtotalCentavos > 0 ? total() : undefined } };
      }
      default:
        return { ok: false, motivo: `Ferramenta ${nome} não existe.` };
    }
  };
}
