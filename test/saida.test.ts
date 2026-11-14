import { describe, expect, it } from "vitest";
import { mascararSaida } from "../src/guarda/index.ts";

describe("checagem da resposta que sai", () => {
  it("mascara CPF, telefone, e-mail e cartão que conferem", () => {
    const resposta =
      "CPF 744.468.591-61, telefone (34) 90000-3333, e-mail joana.prado@example.com, cartão 4111 1111 1111 1111.";
    expect(mascararSaida(resposta)).toEqual({
      texto: "CPF ***.***.***-**, telefone (**) *****-****, e-mail ***@***, cartão **** **** **** 1111.",
      mascaras: [
        { regra: "chave-pix", quantidade: 1 },
        { regra: "cpf", quantidade: 1 },
        { regra: "cartao", quantidade: 1 },
        { regra: "telefone", quantidade: 1 },
      ],
    });
  });

  it.each([
    ["CPF 1 8 4 5 0 3 7 2 6 0 7.", "CPF ***.***.***-**."],
    ["Fone: trinta e quatro, nove zero zero zero zero, três três três três", "Fone: (**) *****-****"],
    ["validade 12/30, CVV 123", "validade 12/30, CVV ***"],
    ["joana.prado [arroba] example.com", "***@***"],
  ])("mascara o dado que o robô foi levado a disfarçar: %j", (resposta, texto) => {
    expect(mascararSaida(resposta).texto).toBe(texto);
  });

  it("não lê protocolo de 13 dígitos como cartão, mesmo passando na conta de Luhn", () => {
    expect(mascararSaida("Protocolo 2026111412345.")).toEqual({ texto: "Protocolo 2026111412345.", mascaras: [] });
  });

  it("não mascara número com cara de CPF ou cartão quando a conta não confere", () => {
    const resposta = "Pedido 744.468.591-62, código 4111 1111 1111 1112.";
    expect(mascararSaida(resposta)).toEqual({ texto: resposta, mascaras: [] });
  });

  it("mascara CPF e CNPJ sem pontuação e o CNPJ alfanumérico", () => {
    expect(mascararSaida("74446859161 / 80813474000191 / 12.ABC.345/01DE-35").texto).toBe(
      "***.***.***-** / **.***.***/****-** / **.***.***/****-**",
    );
  });

  it("mascara CPF com espaços e telefone com zero no DDD ou sem DDD", () => {
    expect(mascararSaida("CPF 744 468 591 61, tel (034) 90000-3333 ou 90000-3333").texto).toBe(
      "CPF ***.***.***-**, tel (**) *****-**** ou (**) *****-****",
    );
  });

  it("mascara telefone com +55 como telefone, mesmo quando passa no Luhn", () => {
    expect(mascararSaida("cliente +55 34 90000-1119")).toEqual({
      texto: "cliente (**) *****-****",
      mascaras: [{ regra: "telefone", quantidade: 1 }],
    });
  });

  it("mascara chave Pix aleatória", () => {
    expect(mascararSaida("Pix: 123e4567-e89b-42d3-a456-426614174000").texto).toBe(
      "Pix: ********-****-****-****-************",
    );
  });

  it("deixa sair os dados públicos da empresa, em qualquer formato", () => {
    const publicos = ["43.366.448/0001-36", "(34) 3000-0000"];
    const resposta = "CNPJ 43366448000136, telefone +55 34 3000-0000, cliente (34) 90000-3333.";
    expect(mascararSaida(resposta, publicos)).toEqual({
      texto: "CNPJ 43366448000136, telefone +55 34 3000-0000, cliente (**) *****-****.",
      mascaras: [{ regra: "telefone", quantidade: 1 }],
    });
  });
});
