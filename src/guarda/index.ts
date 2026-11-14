export { cnpjValido, cpfValido, luhnValido, telefoneValido } from "./documentos.ts";
export { checarEntrada, type Achado, type ChecagemEntrada, type RegraEntrada } from "./entrada.ts";
export {
  autorizarFerramenta,
  criarPorteira,
  guardaAgiu,
  type Atendimento,
  type ChecagemFerramenta,
  type Decisao,
  type Permissao,
  type Politica,
  type Porteira,
  type RegraFerramenta,
} from "./porteira.ts";
export { REGRAS, type Etapa, type RegraDaEtapa, type RegraId } from "./regras.ts";
export {
  lerTelefone,
  type ChamadaFerramenta,
  type ExecutarFerramenta,
  type Mensagem,
  type ResultadoFerramenta,
  type Robo,
  type Telefone,
} from "./robo.ts";
export { mascararSaida, type ChecagemSaida, type Mascara, type RegraSaida } from "./saida.ts";
