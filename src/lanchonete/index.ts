import type { Politica } from "../guarda/index.ts";
import { LANCHONETE, NUMEROS } from "./dados.ts";
import { PERMISSOES } from "./ferramentas.ts";

export { LANCHONETE, NUMEROS } from "./dados.ts";
export { criarFerramentas } from "./ferramentas.ts";
export { roboDaLanchonete } from "./robo.ts";
export { EXEMPLOS, type Exemplo } from "./exemplos.ts";

export const POLITICA: Politica = {
  dono: NUMEROS.dono,
  ferramentas: PERMISSOES,
  dadosPublicos: [LANCHONETE.cnpj, LANCHONETE.telefone, LANCHONETE.chavePix],
  respostaBarrada: "Não posso ajudar com isso. Posso mostrar o cardápio, o horário ou anotar seu pedido.",
};
