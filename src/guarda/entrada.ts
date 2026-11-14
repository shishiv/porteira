import type { RegraDaEtapa } from "./regras.ts";

export type RegraEntrada = RegraDaEtapa<"entrada">;

/** Uma regra que achou o ataque, com o pedaço da mensagem original que a disparou. */
export type Achado = { readonly regra: RegraEntrada; readonly trecho: string };

export type ChecagemEntrada =
  | { readonly acao: "passou" }
  | { readonly acao: "barrou"; readonly achados: readonly [Achado, ...Achado[]] };

const DADO = String.raw`(cpf|telefone|celular|numero|whats\w*|zap|endereco|cartao|e-?mail|dados|contato|pix|nome)`;
const CARGO = String.raw`(dono|dona|proprietari[oa]|gerente|admin\w*|desenvolvedor\w*|programador\w*|responsavel|chefe|patrao|patroa|socio|socia)\b`;
const DA_CASA = String.raw`(daqui|aqui|falando|da lanchonete|do restaurante|da loja|do negocio|do estabelecimento|do bot|do robo|do sistema)\b`;
const PEDIDO = String.raw`\b(qual|quais|cade|(me |nos )?(manda|mande|mandar|passa|passe|passar|fala|fale|falar|diz|diga|dizer|digita|digite|digitar|informa|informe|informar|mostra|mostre|mostrar|envia|envie|enviar)|me (da|de|dar))( (me|o|a|os|as|e|era|seu|sua|teu|tua|(pra|para) (mim|nos)))* `;
const ENSINARAM = String.raw`(falaram|disseram|escreveram|mandaram|passaram|deram|ensinaram)`;

/**
 * Os padrões leem a mensagem em minúsculas e sem acento, então "Instruções" e "instrucoes"
 * são o mesmo texto. Cada padrão pede o verbo junto do objeto ("esquece" perto de "regras"),
 * para "esqueci de pedir a batata" passar. "Sou o dono" só conta como ataque quando termina a
 * frase ou fala da casa ("sou o dono daqui"), para "sou a dona do pedido 45" passar.
 */
const PADROES: Readonly<Record<RegraEntrada, readonly RegExp[]>> = {
  "ignorar-instrucoes": [
    new RegExp(
      String.raw`\b(esquec\w*|ignor\w*|desconsider\w*|apag\w*|descart\w*|abandon\w*|desobedec\w*|larga\w*|zera\w*|reset\w*|joga fora|deixa de lado)[^.!?\n]{0,30}?\b(regras?|instruc\w*|orientac\w*|ordens|diretrizes?|prompt|comandos|restric\w*|programac\w*|tudo que te ${ENSINARAM})\b`,
    ),
    /\b(nao|nem) (precisa|precisas|tem que|deve) (mais )?(seguir|obedecer|respeitar|cumprir)\b/,
    /\bnovas instruc\w*\b/,
    /\b(regras?|instruc\w*|ordens|orientac\w*)\b[^.!?\n]{0,25}?\b(nao (valem|vale|servem|contam) mais|foram (atualizad|alterad|trocad|substituid|cancelad|revogad)\w*)/,
  ],
  "fingir-autoridade": [
    new RegExp(
      String.raw`\b(sou|aqui e|quem fala e|falando com|fala com)\b( [^.!?\n]{0,20}?)? (?<!\b(do|da|de|dos|das|no|na|pro|pra|ao|com|pelo|pela|meu|minha|seu|sua|teu|tua) ((o|a) )?)((o|a) )?${CARGO}(?=\s*([,.!?;]|$)|\s+${DA_CASA})`,
    ),
    new RegExp(String.raw`(^|[,;:] ?)e (o|a) ([^.!?\n]{0,20}? )?${CARGO}(?=\s+${DA_CASA})`),
    /\bsou (da|do) (suporte|ti|desenvolvimento|whatsapp|meta)\b/,
    /\bsou (da|do) (equipe|time|pessoal)\b(?=\s+(daqui|aqui|(de|do|da) (ti|suporte|desenvolvimento|tecnologia|whatsapp|meta|bot|robo|sistema|lanchonete|restaurante|loja))\b)/,
    /\b(mensagem|aviso|comunicado|alerta) (oficial )?(do|da) (suporte|equipe|whatsapp|meta|sistema|administrac\w*)\b/,
    /\bmodo (de )?(admin\w*|administrador|desenvolvedor|dev|debug|teste|manutencao|deus|root)\b/,
    /\b(ordem|autorizac\w*|pedido) d[oa] (dono|dona|gerente|chefe|patrao|patroa)\b/,
    /\b(o|a) (dono|dona|gerente|chefe|patrao|patroa) (mandou|autorizou|liberou|deixou|permitiu)\b/,
  ],
  "revelar-instrucoes": [
    new RegExp(
      String.raw`\b(mostr|revel|repet|diz|fal|escrev|imprim|mand|copi|list|cont|pass|traduz|resum|explic|detalh|envi|exib|transcrev)\w*\b[^.!?\n]{0,30}?\b((seu|teu) prompt|prompt do sistema|system prompt|(suas|tuas) (instruc\w*|regras|configurac\w*|ordens)(?! (de|do|da|dos|das|para|pra)\b)|instruc\w* (do sistema|internas|iniciais|originais|secretas)|regras internas|mensagem do sistema|(as )?(regras?|instruc\w*|ordens|orientac\w*) que (\w+ ){0,2}(te|lhe) (deu|deram|passou|passaram|mandou|mandaram|escreveu|escreveram|ensinou|ensinaram)|(as )?(regras?|instruc\w*|ordens) que (voce|vc|tu) (recebeu|tem|segue)|tudo que te ${ENSINARAM})\b`,
    ),
    /\b(system prompt|prompt do sistema|(seu|teu) prompt|mensagem do sistema|instruc\w* (do sistema|internas|secretas|ocultas)|regras internas)\b/,
    /\bquais (sao )?(as )?(suas|tuas) (regras|instruc\w*|ordens|configurac\w*)(?! (de|do|da|dos|das|para|pra)\b)/,
  ],
  "trocar-papel": [
    /\b(fing\w*|finj\w*|faz de conta) (que|ser) (voce|vc|tu|e)\b/,
    /\b(a partir de agora|de agora em diante) (voce|vc|tu) (e|eh|sera|vai ser|vira)\b/,
    /\bmodo (sem (restric\w*|filtros?|limites|censura)|livre|dan)\b/,
    /\b(jailbreak|roleplay)\b/,
    /\b(vamos|bora) (brincar|jogar|fingir|imaginar|fazer de conta)\b[^.!?\n]{0,40}?\b(voce|vc|tu) (e|eh|sera|vai ser|vira|seria)\b/,
    /\b(fosse|seja|ser|vira|virar|age como|aja como|responde como)\b[^.!?\n]{0,30}?\bsem (filtros?|restric\w*|limites|censura|regras)\b/,
    /\b(imagin|supo|finj|fing)\w* que (voce|vc|tu) (e|eh|seja|fosse) (um|uma|o|a) (robo|bot|ia|hacker|assistente|chatgpt|outr[oa]|personagem)\b/,
    /\besquec\w* que (voce |vc |tu )?(e|eh|es) (um |uma |o |a )?(atendente|robo|bot|assistente|ia)\b/,
  ],
  "dados-de-terceiros": [
    new RegExp(
      String.raw`${PEDIDO}${DADO}\b[^.!?\n,]{0,20}?\b(dos clientes|(d[oa]s?|de) (outr[oa]s? clientes?|ultim[oa]s? clientes?|cliente anterior|clientes anteriores|todos os clientes|outra pessoa))\b`,
    ),
    new RegExp(String.raw`${PEDIDO}${DADO}\b[^.!?\n]{0,40}?\b(de quem (pediu|comprou|veio|esteve)|(da|do) \w+ que (pediu|comprou|veio|esteve))\b`),
    new RegExp(String.raw`\b(quem pediu|que pediu|cliente anterior|ultim[oa] cliente|outr[oa] cliente)\b.{0,60}?${PEDIDO}${DADO} (dela|dele|deles|delas)\b`),
    new RegExp(String.raw`${PEDIDO}${DADO} que (ele|ela|eles|elas) (deu|deram|passou|passaram|usou|usaram|informou|cadastrou|deixou)\b`),
    /\b(lista|listar|relatorio|todos os|todas as)\b[^.!?\n]{0,15}?\b(pedidos|clientes|compras|vendas)\b[^.!?\n]{0,30}?\b(com|e) (os |o |seus |seu )?(nomes?|telefones?|cpfs?|enderecos?|contatos?|e-?mails?|whats\w*)\b/,
  ],
};

/** Um caractere da forma lida pelos padrões, com o começo e o fim dele na mensagem original. */
type Letra = { readonly c: string; readonly inicio: number; readonly fim: number };

/** Minúsculas, sem acento e sem caractere invisível. Os espaços ainda não foram juntados. */
function letras(original: string): Letra[] {
  const saida: Letra[] = [];
  let proximo = 0;
  for (const caractere of original) {
    const inicio = proximo;
    proximo += caractere.length;
    if (/\p{Cf}/u.test(caractere)) continue;
    const limpo = caractere.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();
    for (const c of limpo) saida.push({ c: /\s/.test(c) ? " " : c, inicio, fim: proximo });
  }
  return saida;
}

function juntarEspacos(visao: readonly Letra[]): Letra[] {
  return visao.filter((letra, i) => letra.c !== " " || (i > 0 && visao[i - 1]?.c !== " "));
}

const alfanumerico = (letra: Letra | undefined) => letra !== undefined && /^[a-z0-9]$/.test(letra.c);

/**
 * "e.s.q.u.e.c.e" e "s o u" viram "esquece" e "sou": três ou mais letras soltas, com o mesmo
 * separador entre elas, para "o c.p.f" virar "o cpf" e não "ocpf".
 */
function juntarLetrasSoltas(visao: readonly Letra[]): Letra[] {
  const solta = (i: number) => /^[a-z]$/.test(visao[i]?.c ?? "") && !alfanumerico(visao[i - 1]) && !alfanumerico(visao[i + 1]);
  const saida: Letra[] = [];
  let i = 0;
  while (i < visao.length) {
    let fim = i;
    while (solta(fim) && solta(fim + 2) && visao[fim + 1]?.c === visao[i + 1]?.c) fim += 2;
    if (fim - i >= 4) {
      for (let k = i; k <= fim; k += 2) saida.push(...visao.slice(k, k + 1));
      i = fim + 1;
    } else {
      saida.push(...visao.slice(i, i + 1));
      i++;
    }
  }
  return saida;
}

const LEET: Readonly<Record<string, string>> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", $: "s" };

function desfazerLeet(visao: readonly Letra[]): Letra[] {
  return visao.map((letra) => ({ ...letra, c: LEET[letra.c] ?? letra.c }));
}

/** As palavras que os padrões procuram. Uma palavra a um erro de digitação de uma delas vira ela. */
const PALAVRAS = [
  "esquece", "esqueca", "ignora", "ignore", "desconsidera", "regras", "regra", "instrucoes", "instrucao",
  "orientacoes", "configuracoes", "prompt", "sistema", "dono", "dona", "gerente", "proprietario", "cliente",
  "clientes", "telefone", "celular", "endereco", "cartao", "anterior", "ultimo", "ultima", "mostra", "revela",
  "repete", "finge", "finja", "restricoes", "diretrizes",
];
const CONHECIDAS = new Set(PALAVRAS);

/** Distância de Damerau restrita é 1: uma letra trocada, sobrando, faltando ou duas vizinhas invertidas. */
function umErro(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1 || a === b) return false;
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  if (a.length === b.length) {
    return a.slice(i + 1) === b.slice(i + 1) || (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2));
  }
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}

/** Palavras curtas só se corrigem por letras invertidas ("dnoo"), para "sono" não virar "dono". */
function corrigir(palavra: string): string | undefined {
  if (CONHECIDAS.has(palavra) || palavra.length < 4) return undefined;
  const candidatas = PALAVRAS.filter(
    (certa) => umErro(palavra, certa) && (palavra.length >= 5 || (palavra.length === certa.length && [...palavra].sort().join("") === [...certa].sort().join(""))),
  );
  return candidatas.length === 1 ? candidatas[0] : undefined;
}

/** Onde termina a palavra seguinte, quando só um espaço a separa da palavra que acaba em `fim`. */
function juntarComProxima(visao: readonly Letra[], fim: number): number | undefined {
  if (visao[fim]?.c !== " " || !/^[a-z]$/.test(visao[fim + 1]?.c ?? "")) return undefined;
  let proxima = fim + 1;
  while (/^[a-z]$/.test(visao[proxima]?.c ?? "")) proxima++;
  return proxima;
}

/** "esqeuce" vira "esquece", e "re gras" vira "regras". */
function corrigirDigitacao(visao: readonly Letra[]): Letra[] {
  const saida: Letra[] = [];
  let i = 0;
  while (i < visao.length) {
    let fim = i;
    while (/^[a-z]$/.test(visao[fim]?.c ?? "")) fim++;
    if (fim === i) {
      saida.push(...visao.slice(i, i + 1));
      i++;
      continue;
    }
    let trecho = visao.slice(i, fim);
    let certa = corrigir(trecho.map((l) => l.c).join(""));
    const pedaco = juntarComProxima(visao, fim);
    if (!certa && pedaco) {
      const junto = [...trecho, ...visao.slice(fim + 1, pedaco)];
      const palavra = junto.map((l) => l.c).join("");
      certa = palavra.length >= 6 ? (CONHECIDAS.has(palavra) ? palavra : corrigir(palavra)) : undefined;
      if (certa) {
        trecho = junto;
        fim = pedaco;
      }
    }
    const inicio = trecho[0]?.inicio ?? 0;
    const ultimo = trecho.at(-1)?.fim ?? inicio;
    saida.push(...(certa ? [...certa].map((c) => ({ c, inicio, fim: ultimo })) : trecho));
    i = fim;
  }
  return saida;
}

/**
 * As formas da mensagem que os padrões leem, na ordem em que são tentadas. A primeira que casa
 * dá o trecho mostrado, então a forma mais fiel ao original vem primeiro.
 */
function visoes(original: string): (readonly Letra[])[] {
  const cru = letras(original);
  const base = juntarEspacos(cru);
  return [base, juntarEspacos(juntarLetrasSoltas(cru)), juntarEspacos(desfazerLeet(cru)), corrigirDigitacao(base)];
}

/** O texto da visão e, para cada unidade UTF-16 dele, o começo e o fim no original. */
function comoTexto(visao: readonly Letra[]): { texto: string; origem: number[]; fins: number[] } {
  let texto = "";
  const origem: number[] = [];
  const fins: number[] = [];
  for (const { c, inicio, fim } of visao) {
    texto += c;
    for (let k = 0; k < c.length; k++) {
      origem.push(inicio);
      fins.push(fim);
    }
  }
  return { texto, origem, fins };
}

/** `ignorar` tira regras da checagem: a Porteira não aplica "fingir ser o dono" ao número do dono. */
export function checarEntrada(mensagem: string, ignorar: readonly RegraEntrada[] = []): ChecagemEntrada {
  const formas = visoes(mensagem).map(comoTexto);
  const achados: Achado[] = [];
  for (const [regra, padroes] of Object.entries(PADROES) as [RegraEntrada, readonly RegExp[]][]) {
    if (ignorar.includes(regra)) continue;
    const achado = formas.flatMap(({ texto, origem, fins }) =>
      padroes.flatMap((padrao) => {
        const encontrado = padrao.exec(texto);
        if (!encontrado) return [];
        const inicio = origem[encontrado.index] ?? 0;
        const fim = fins[encontrado.index + encontrado[0].length - 1] ?? inicio;
        return [{ regra, trecho: mensagem.slice(inicio, fim) }];
      }),
    )[0];
    if (achado) achados.push(achado);
  }
  const [primeiro, ...resto] = achados;
  return primeiro ? { acao: "barrou", achados: [primeiro, ...resto] } : { acao: "passou" };
}
