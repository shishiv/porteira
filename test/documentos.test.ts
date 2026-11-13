import { describe, expect, it } from "vitest";
import { cnpjValido, cpfValido, luhnValido, telefoneValido } from "../src/guarda/index.ts";

// Todos os números são inventados: CPFs e CNPJs gerados com dígito válido, cartões de teste
// públicos das bandeiras, e o CNPJ alfanumérico é o exemplo da própria Receita Federal.

describe("CPF", () => {
  it("aceita CPF com os dois dígitos verificadores certos, com ou sem pontuação", () => {
    expect(cpfValido("744.468.591-61")).toBe(true);
    expect(cpfValido("74446859161")).toBe(true);
    expect(cpfValido("834.871.259-35")).toBe(true);
  });

  it("recusa CPF com um dígito verificador errado", () => {
    expect(cpfValido("744.468.591-62")).toBe(false);
    expect(cpfValido("744.468.591-71")).toBe(false);
  });

  it("recusa os CPFs de dígitos repetidos, que passam na conta mas não existem", () => {
    expect(cpfValido("111.111.111-11")).toBe(false);
    expect(cpfValido("000.000.000-00")).toBe(false);
  });

  it("recusa tamanho errado", () => {
    expect(cpfValido("744.468.591-6")).toBe(false);
  });
});

describe("CNPJ", () => {
  it("aceita CNPJ numérico com dígitos certos", () => {
    expect(cnpjValido("43.366.448/0001-36")).toBe(true);
    expect(cnpjValido("80813474000191")).toBe(true);
  });

  it("aceita o CNPJ alfanumérico do exemplo da Receita Federal", () => {
    expect(cnpjValido("12.ABC.345/01DE-35")).toBe(true);
  });

  it("recusa CNPJ com dígito errado ou repetido", () => {
    expect(cnpjValido("43.366.448/0001-37")).toBe(false);
    expect(cnpjValido("12.ABC.345/01DE-36")).toBe(false);
    expect(cnpjValido("11.111.111/1111-11")).toBe(false);
  });
});

describe("Luhn", () => {
  it("aceita os cartões de teste públicos de Visa e Mastercard", () => {
    expect(luhnValido("4111 1111 1111 1111")).toBe(true);
    expect(luhnValido("5555-5555-5555-4444")).toBe(true);
  });

  it("recusa número que erra a conta por um dígito", () => {
    expect(luhnValido("4111 1111 1111 1112")).toBe(false);
  });

  it("recusa tamanho fora de 13 a 19 dígitos", () => {
    expect(luhnValido("4111 1111 11")).toBe(false);
  });
});

describe("telefone", () => {
  it("aceita celular e fixo brasileiros, com ou sem o 55", () => {
    expect(telefoneValido("(34) 90000-3333")).toBe(true);
    expect(telefoneValido("+55 34 90000-3333")).toBe(true);
    expect(telefoneValido("(34) 3000-0000")).toBe(true);
  });

  it("recusa DDD que não existe e celular sem o 9", () => {
    expect(telefoneValido("(20) 90000-3333")).toBe(false);
    expect(telefoneValido("(34) 80000-3333")).toBe(false);
  });
});
