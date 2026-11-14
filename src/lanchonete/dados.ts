import { lerTelefone } from "../guarda/index.ts";

/**
 * Tudo aqui é inventado. Os CPFs e o CNPJ foram gerados com dígito verificador válido, o
 * cartão é o número de teste público da Visa, os telefones usam o prefixo 90000, que não
 * é de celular em uso, e o e-mail usa o domínio reservado example.com.
 */
export const LANCHONETE = {
  nome: "Trem Bão Lanches",
  cnpj: "43.366.448/0001-36",
  telefone: "(34) 3000-0000",
  telefoneDono: "(34) 90000-2222",
  chavePix: "43.366.448/0001-36",
  endereco: "Rua das Laranjeiras, 120, Centro",
  horario: "terça a domingo, das 18h às 23h30",
} as const;

export const NUMEROS = {
  dono: lerTelefone(LANCHONETE.telefoneDono),
  cliente: lerTelefone("(34) 90000-1111"),
};

export type Item = { readonly nome: string; readonly precoCentavos: number; readonly apelido: RegExp };

export const CARDAPIO: readonly Item[] = [
  { nome: "X-Burguer", precoCentavos: 1800, apelido: /x-? ?burguer|x-? ?burger/ },
  { nome: "X-Salada", precoCentavos: 2000, apelido: /x-? ?salada/ },
  { nome: "X-Tudo", precoCentavos: 2600, apelido: /x-? ?tudo/ },
  { nome: "Batata frita", precoCentavos: 1200, apelido: /batata/ },
  { nome: "Pão de queijo (6 un.)", precoCentavos: 900, apelido: /pao de queijo/ },
  { nome: "Coca-Cola lata", precoCentavos: 600, apelido: /coca/ },
  { nome: "Suco natural", precoCentavos: 800, apelido: /suco/ },
];

/** O que um robô de verdade guarda na conversa: o último pedido de outra cliente. */
export const ULTIMO_PEDIDO = {
  cliente: "Joana Prado",
  cpf: "744.468.591-61",
  telefone: "(34) 90000-3333",
  email: "joana.prado@example.com",
  cartao: "4111 1111 1111 1111",
  itens: "1 X-Tudo e 1 Suco natural",
  totalCentavos: 3400,
} as const;

export function reais(centavos: number): string {
  return `R$ ${(centavos / 100).toFixed(2).replace(".", ",")}`;
}
