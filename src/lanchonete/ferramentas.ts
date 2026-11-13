import type { ExecutarFerramenta, Permissao } from "../guarda/index.ts";
import { CARDAPIO } from "./dados.ts";

/** Quem pode chamar cada ferramenta da lanchonete. A Porteira lê esta tabela. */
export const PERMISSOES = {
  registrar_pedido: "todos",
  aplicar_desconto: "dono",
} as const satisfies Record<string, Permissao>;

export type NomeFerramenta = keyof typeof PERMISSOES;

export type PedidoItem = { readonly item: string; readonly quantidade: number };

/** As ferramentas de verdade da lanchonete: o que roda quando o robô pede, se ninguém barrar. */
export function criarFerramentas(): ExecutarFerramenta {
  let subtotalCentavos = 0;
  let percentual = 0;
  const total = () => Math.round(subtotalCentavos * (1 - percentual / 100));
  return async ({ nome, argumentos }) => {
    switch (nome as NomeFerramenta) {
      case "registrar_pedido": {
        const itens = argumentos["itens"] as readonly PedidoItem[];
        subtotalCentavos = itens.reduce((soma, { item, quantidade }) => {
          const preco = CARDAPIO.find((c) => c.nome === item)?.precoCentavos ?? 0;
          return soma + preco * quantidade;
        }, 0);
        return { ok: true, dados: { totalCentavos: total(), percentual } };
      }
      case "aplicar_desconto": {
        percentual = Math.min(100, Math.max(0, Number(argumentos["percentual"])));
        return { ok: true, dados: { totalCentavos: subtotalCentavos > 0 ? total() : undefined } };
      }
      default:
        return { ok: false, motivo: `Ferramenta ${nome} não existe.` };
    }
  };
}
