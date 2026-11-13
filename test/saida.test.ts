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

  it("não mascara número com cara de CPF ou cartão quando a conta não confere", () => {
    const resposta = "Pedido 744.468.591-62, código 4111 1111 1111 1112.";
    expect(mascararSaida(resposta)).toEqual({ texto: resposta, mascaras: [] });
  });

  it("mascara CPF e CNPJ sem pontuação e o CNPJ alfanumérico", () => {
    expect(mascararSaida("74446859161 / 80813474000191 / 12.ABC.345/01DE-35").texto).toBe(
      "***.***.***-** / **.***.***/****-** / **.***.***/****-**",
    );
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
