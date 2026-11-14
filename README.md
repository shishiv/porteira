# Porteira

Guarda para robôs de atendimento de IA no WhatsApp. Projeto do Hack Brasil 2026, trilha Cibersegurança.

A Porteira fica entre o WhatsApp e o robô de uma empresa e checa três coisas:

| Etapa | O que a guarda faz |
| --- | --- |
| Mensagem que entra | Barra a mensagem que tenta enganar o robô: mandar esquecer as regras, fingir ser o dono, pedir as instruções internas, pedir dados de outro cliente. |
| Ação que o robô pede | Cada ferramenta tem dono. O desconto só roda quando a mensagem vem do número do dono, e o número vem do WhatsApp, não do que a mensagem diz. |
| Resposta que sai | Esconde CPF e CNPJ (só quando o dígito verificador confere), cartão (só quando passa na conta de Luhn), chave Pix, e-mail e telefone. Os dados da própria empresa saem normalmente. |

Cada decisão devolve a regra que agiu, e a demo mostra essa regra ao lado da conversa.

## A demo

A página simula o WhatsApp da Trem Bão Lanches, uma lanchonete inventada. O robô é simulado: ele responde com regras fixas, sem modelo de IA, e é ingênuo de propósito. Sem a guarda, ele dá 100% de desconto a quem pede e manda o CPF de outra cliente. Com a guarda, o mesmo ataque é barrado, e o painel ao lado diz em que etapa e por qual regra.

Para rodar na sua máquina, com Node 22.12 ou mais novo:

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

## Testes

Não há verificação automática no GitHub. Verifique no computador:

```sh
npm ci
npm run typecheck
npm test
npm run build
```

Os testes cobrem o dígito verificador de CPF e CNPJ (inclusive o CNPJ alfanumérico, emitido desde julho de 2026), a conta de Luhn, os ataques prontos e as mensagens normais, nos dois modos.

## Como o código se divide

| Pasta | O que tem |
| --- | --- |
| `src/guarda/` | A biblioteca da guarda. Não depende do robô nem da página, e roda no navegador e no Node. |
| `src/lanchonete/` | O robô inventado, as ferramentas da lanchonete, a política de permissões e as mensagens prontas. |
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

Nenhum dado da demo ou dos testes é de pessoa real. Os CPFs e CNPJs foram gerados com dígito verificador válido. Os cartões são os números de teste públicos da Visa e da Mastercard. Os telefones usam o prefixo 90000, e os e-mails usam o domínio reservado `example.com`.

## Licença

MIT. Veja [LICENSE](LICENSE).
