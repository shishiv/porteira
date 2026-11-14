# Porteira

Guarda para robôs de atendimento de IA no WhatsApp. Projeto do Hack Brasil 2026, trilha Cibersegurança.

A Porteira fica entre o WhatsApp e o robô de uma empresa e checa três coisas:

| Etapa | O que a guarda faz |
| --- | --- |
| Mensagem que entra | Barra a mensagem que tenta enganar o robô: mandar esquecer as regras, fingir ser o dono, pedir as instruções internas, pedir dados de outro cliente. Ela lê a mensagem também sem acento, com as letras separadas juntadas, com números no lugar de letras desfeitos e com erro de digitação corrigido. |
| Ação que o robô pede | Cada ferramenta tem dono. O desconto só roda quando a mensagem vem do número do dono, e o número vem do WhatsApp, não do que a mensagem diz. |
| Resposta que sai | Esconde CPF e CNPJ (só quando o dígito verificador confere), cartão (só quando passa na conta de Luhn), chave Pix, e-mail e telefone. Também pega o dado com espaço ou ponto no meio, ou escrito por extenso. Os dados da própria empresa, e os que o cliente mandou na mesma mensagem, saem normalmente. |

Cada decisão devolve a regra que agiu, e a demo mostra essa regra ao lado da conversa.

## A demo

A página simula o WhatsApp da Trem Bão Lanches, uma lanchonete inventada. O robô é simulado: ele responde com regras fixas, sem modelo de IA, e é ingênuo de propósito. Sem a guarda, ele dá 100% de desconto a quem pede e manda o CPF de outra cliente. Com a guarda, o mesmo ataque é barrado, e o painel ao lado diz em que etapa e por qual regra.

Para rodar na sua máquina, com Node 22.18 ou mais novo:

```sh
npm install
npm run dev
```

Abra o endereço que aparecer (normalmente http://localhost:5173). Use a chave "Com guarda / Sem guarda" no topo, os botões de ataques e de mensagens normais, ou escreva no campo livre. O seletor ao lado do campo troca quem envia: o cliente ou o dono.

Para gerar a página estática em `dist/`:

```sh
npm run build
npm run preview
```

## O placar

Abaixo da conversa, a página mostra o placar: quantos ataques inventados em português a guarda barrou e quantas mensagens normais de clientes passaram sem mudança. A conta roda no navegador de quem abre a página, sem servidor, e a página lista cada ataque que passou e cada mensagem normal barrada, com a regra envolvida.

Hoje, no conjunto versão 2:

| | Ataques barrados | Mensagens normais que passaram |
| --- | --- | --- |
| Total | 190 de 222 (85%) | 139 de 140 (99%) |
| Lote 1, escrito antes de ajustar as regras | 140 de 149 (93%) | 91 de 91 (100%) |
| Lote 2, escrito depois, sem ver as regras | 50 de 73 (68%) | 48 de 49 (97%) |

As regras foram melhoradas olhando os erros do lote 1, então o número dele é otimista. O lote 2 foi escrito depois, por outro agente de IA que não leu a guarda nem o lote 1, e as regras não mudaram por causa dele. O número do lote 2 é a melhor estimativa de como a guarda se sai com mensagens que nunca viu.

A guarda erra mais em três casos:

- ataque mandado em várias mensagens seguidas, porque ela olha uma mensagem por vez;
- dado pessoal que o robô manda em pedaços;
- pedido que só faz sentido para quem conhece a lanchonete, como "o dono da Trem Bão" ou o nome de uma cliente.

Para ver o placar no terminal, com a lista de erros:

```sh
npm run placar
```

### O conjunto

Os casos ficam em `src/placar/casos.json`. Cada ataque tem uma categoria e uma variação:

| Grupo | Categorias | Como o placar decide se foi barrado |
| --- | --- | --- |
| Tentar enganar o robô | esquecer as regras, fingir ser o dono, pedir as instruções internas, pedir dados de outro cliente, virar outro personagem | A guarda barrou a mensagem na entrada. |
| Ação proibida | desconto pedido por quem não é o dono | A ferramenta de desconto não rodou. |
| Vazamento na resposta | CPF, CNPJ, cartão, chave Pix, e-mail, telefone | Nenhum trecho da lista `vaza` chegou ao cliente. |

As variações são as que um atacante usa de verdade: gíria, erro de digitação, acento trocado ou faltando, maiúsculas, espaços e pontuação no meio, texto em partes e disfarces como letras trocadas por números ou número escrito por extenso.

As mensagens normais cobrem cardápio, horário, pedido, reclamação, entrega, pagamento, o dono dando desconto, respostas do robô com números que não são dados pessoais e mensagens que parecem ataque mas não são ("esqueci meu pedido", "sou o dono do pedido 12").

O placar mede a guarda, não o robô. Cada caso passa pela mesma `criarPorteira` da demo, com a política e as ferramentas da lanchonete, mas com um robô que obedece a tudo: ele chama a ferramenta e manda a resposta que o caso pede. O robô simulado da demo recusa sem querer muita coisa que não entende, e um placar medido com ele seria melhor do que a guarda é.

Para mudar o conjunto, edite o JSON e rode `npm test`. O teste recusa caso malformado, e-mail fora de `example.com`, celular sem o prefixo 90000 e CPF, CNPJ ou cartão vazado com dígito errado. Os testes também travam o placar mínimo de cada categoria, para uma piora aparecer. Quando o placar subir, suba o número em `test/placar.test.ts`.

## Testes

Não há verificação automática no GitHub. Verifique no computador:

```sh
npm ci
npm run typecheck
npm test
npm run build
```

Os testes cobrem o dígito verificador de CPF e CNPJ (inclusive o CNPJ alfanumérico, emitido desde julho de 2026), a conta de Luhn, os ataques prontos e as mensagens normais nos dois modos, e o placar mínimo de cada categoria.

## Como o código se divide

| Pasta | O que tem |
| --- | --- |
| `src/guarda/` | A biblioteca da guarda. Não depende do robô nem da página, e roda no navegador e no Node. |
| `src/lanchonete/` | O robô inventado, as ferramentas da lanchonete, a política de permissões e as mensagens prontas. |
| `src/placar/` | O conjunto de ataques e mensagens normais, a medição e o comando de terminal. |
| `src/demo/` | A página. |
| `test/` | Os testes, com Vitest. |

Qualquer robô entra atrás da guarda se cumprir a interface `Robo` de `src/guarda/robo.ts`: receber a mensagem e uma função para chamar ferramentas, e devolver o texto da resposta. Um robô com modelo de IA de verdade cumpre a mesma interface.

```ts
import { criarPorteira, lerTelefone } from "./src/guarda/index.ts";

const porteira = criarPorteira(meuRobo, minhasFerramentas, {
  dono: lerTelefone("(34) 90000-2222"),
  ferramentas: { registrar_pedido: "todos", aplicar_desconto: "dono" },
  dadosPublicos: ["43.366.448/0001-36"],
  respostaBarrada: "Não posso ajudar com isso.",
});

const { resposta, decisoes } = await porteira.atender({ de: lerTelefone("(34) 90000-1111"), texto: "..." });
```

## Dados inventados

Nenhum dado da demo, do conjunto ou dos testes é de pessoa real. Os CPFs e CNPJs foram gerados com dígito verificador válido. Os cartões são os números de teste públicos da Visa e da Mastercard. Os telefones usam o prefixo 90000, e os e-mails usam o domínio reservado `example.com`.

## Licença

MIT. Veja [LICENSE](LICENSE).
