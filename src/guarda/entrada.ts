import type { RegraDaEtapa } from "./regras.ts";

export type RegraEntrada = RegraDaEtapa<"entrada">;

/** Uma regra que achou o ataque, com o pedaço da mensagem original que a disparou. */
export type Achado = { readonly regra: RegraEntrada; readonly trecho: string };

export type ChecagemEntrada =
  | { readonly acao: "passou" }
  | { readonly acao: "barrou"; readonly achados: readonly [Achado, ...Achado[]] };

/**
 * Os padrões leem a mensagem em minúsculas e sem acento, então "Instruções" e "instrucoes"
 * são o mesmo texto. Cada padrão pede o verbo junto do objeto ("esquece" perto de "regras"),
 * para "esqueci de pedir a batata" passar. "Sou o dono" só conta como ataque quando termina a
 * frase ou fala da casa ("sou o dono daqui"), para "sou a dona do pedido 45" passar.
 */
const PADROES: Readonly<Record<RegraEntrada, readonly RegExp[]>> = {
  "ignorar-instrucoes": [
    /\b(esquec|esquece|ignor|desconsider|apag|descart|abandon|desobedec)\w*\b[^.!?\n]{0,30}?\b(regras?|instruc\w*|orientac\w*|ordens|diretrizes?|prompt|comandos|restric\w*|programac\w*)\b/,
    /\b(nao|nem) (precisa|precisas|tem que|deve) (mais )?(seguir|obedecer|respeitar|cumprir)\b/,
    /\bnovas instruc\w*\b/,
  ],
  "fingir-autoridade": [
    /\b(sou|aqui e|quem fala e|falando com|fala com) (o|a) (dono|dona|proprietari[oa]|gerente|admin\w*|desenvolvedor\w*|programador\w*|responsavel|chefe|patrao|patroa|socio|socia)(?=\s*([,.!?;]|$)|\s+(daqui|aqui|da lanchonete|do restaurante|da loja|do negocio|do estabelecimento|do bot|do robo|do sistema)\b)/,
    /\bsou (da|do) (equipe|suporte|ti|time|desenvolvimento|whatsapp|meta)\b/,
    /\bmodo (admin\w*|administrador|desenvolvedor|dev|debug|teste|manutencao|deus|root)\b/,
    /\b(ordem|autorizac\w*|pedido) d[oa] (dono|dona|gerente|chefe|patrao|patroa)\b/,
  ],
  "revelar-instrucoes": [
    /\b(mostr|revel|repet|diz|fal|escrev|imprim|mand|copi|list|cont|pass)\w*\b[^.!?\n]{0,30}?\b((seu|teu) prompt|prompt do sistema|system prompt|(suas|tuas) (instruc\w*|regras|configurac\w*|ordens)(?! (de|do|da|dos|das|para|pra)\b)|instruc\w* (do sistema|internas|iniciais|originais|secretas)|regras internas|mensagem do sistema)\b/,
  ],
  "trocar-papel": [
    /\b(fing\w*|finj\w*|faz de conta) (que|ser) (voce|vc|tu|e)\b/,
    /\b(a partir de agora|de agora em diante) (voce|vc|tu) (e|eh|sera|vai ser|vira)\b/,
    /\bmodo (sem (restric\w*|filtros?|limites|censura)|livre|dan)\b/,
    /\b(jailbreak|roleplay)\b/,
  ],
  "dados-de-terceiros": [
    /\b(cpf|telefone|celular|numero|whats\w*|zap|endereco|cartao|e-?mail|dados|contato|pix)\b[^.!?\n]{0,40}?\b(d[oa]s? )?(outr[oa]s? clientes?|ultim[oa]s? clientes?|cliente anterior|clientes anteriores|todos os clientes|outra pessoa|dos clientes)\b/,
  ],
};

/** Texto em minúsculas, sem acento, com cada caractere apontando para o início e o fim dele no original. */
function normalizar(original: string): { texto: string; origem: number[]; fins: number[] } {
  let texto = "";
  const origem: number[] = [];
  const fins: number[] = [];
  let proximo = 0;
  for (const caractere of original) {
    const i = proximo;
    proximo += caractere.length;
    if (/\p{Cf}/u.test(caractere)) continue;
    const limpo = caractere.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();
    for (const c of limpo) {
      const espaco = /\s/.test(c);
      if (espaco && texto.endsWith(" ")) continue;
      texto += espaco ? " " : c;
      for (let k = 0; k < c.length; k++) {
        origem.push(i);
        fins.push(proximo);
      }
    }
  }
  return { texto, origem, fins };
}

export function checarEntrada(mensagem: string): ChecagemEntrada {
  const { texto, origem, fins } = normalizar(mensagem);
  const achados: Achado[] = [];
  for (const [regra, padroes] of Object.entries(PADROES) as [RegraEntrada, readonly RegExp[]][]) {
    for (const padrao of padroes) {
      const encontrado = padrao.exec(texto);
      if (!encontrado) continue;
      const inicio = origem[encontrado.index] ?? 0;
      const fim = fins[encontrado.index + encontrado[0].length - 1] ?? inicio;
      achados.push({ regra, trecho: mensagem.slice(inicio, fim) });
      break;
    }
  }
  const [primeiro, ...resto] = achados;
  return primeiro ? { acao: "barrou", achados: [primeiro, ...resto] } : { acao: "passou" };
}
