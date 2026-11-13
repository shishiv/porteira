export type Etapa = "entrada" | "ferramenta" | "saida";

type DescricaoRegra = { readonly etapa: Etapa; readonly nome: string; readonly explicacao: string };

/** Toda regra que a guarda aplica. A página mostra `nome` e `explicacao` quando a regra age. */
export const REGRAS = {
  "ignorar-instrucoes": {
    etapa: "entrada",
    nome: "Manda o robô esquecer as regras",
    explicacao: "A mensagem tenta apagar ou trocar as instruções que a empresa deu ao robô.",
  },
  "fingir-autoridade": {
    etapa: "entrada",
    nome: "Diz ser o dono ou a equipe",
    explicacao: "Quem é o dono vem do número do WhatsApp, não do que a mensagem afirma.",
  },
  "revelar-instrucoes": {
    etapa: "entrada",
    nome: "Pede as instruções internas",
    explicacao: "A mensagem tenta fazer o robô mostrar as regras e os dados que a empresa deu a ele.",
  },
  "trocar-papel": {
    etapa: "entrada",
    nome: "Manda o robô virar outro personagem",
    explicacao: "A mensagem pede ao robô que finja ser outro, sem as regras da empresa.",
  },
  "dados-de-terceiros": {
    etapa: "entrada",
    nome: "Pede dados de outro cliente",
    explicacao: "A mensagem pede dados pessoais de quem não é a pessoa que está conversando.",
  },
  "ferramenta-so-dono": {
    etapa: "ferramenta",
    nome: "Ação só do dono",
    explicacao: "Esta ação só roda quando a mensagem vem do número do dono.",
  },
  "ferramenta-desconhecida": {
    etapa: "ferramenta",
    nome: "Ação fora da lista",
    explicacao: "O robô tentou uma ação que a empresa não liberou.",
  },
  cpf: {
    etapa: "saida",
    nome: "CPF",
    explicacao: "Um CPF com dígito verificador certo ia sair na resposta.",
  },
  cnpj: {
    etapa: "saida",
    nome: "CNPJ",
    explicacao: "Um CNPJ com dígito verificador certo, que não é o da empresa, ia sair na resposta.",
  },
  cartao: {
    etapa: "saida",
    nome: "Cartão",
    explicacao: "Um número de cartão que passa na conta de Luhn ia sair na resposta.",
  },
  "chave-pix": {
    etapa: "saida",
    nome: "Chave Pix ou e-mail",
    explicacao: "Uma chave Pix aleatória ou um e-mail, que não é da empresa, ia sair na resposta.",
  },
  telefone: {
    etapa: "saida",
    nome: "Telefone",
    explicacao: "Um telefone, que não é o da empresa, ia sair na resposta.",
  },
} as const satisfies Record<string, DescricaoRegra>;

export type RegraId = keyof typeof REGRAS;
export type RegraDaEtapa<E extends Etapa> = {
  [Id in RegraId]: (typeof REGRAS)[Id]["etapa"] extends E ? Id : never;
}[RegraId];
