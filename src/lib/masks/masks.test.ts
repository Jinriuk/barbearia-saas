import { describe, expect, it } from "vitest";
import {
  formatCurrency,
  formatPercent,
  formatPhone,
  formatTime,
  onlyDigits,
  parseCurrency,
  parsePercent,
  unformatPhone,
} from "./index";

describe("formatPhone", () => {
  it("formata celular de 11 dígitos", () => {
    expect(formatPhone("11987654321")).toBe("(11) 98765-4321");
  });

  it("formata fixo de 10 dígitos", () => {
    expect(formatPhone("1134567890")).toBe("(11) 3456-7890");
  });

  it("acompanha a digitação sem travar", () => {
    expect(formatPhone("")).toBe("");
    expect(formatPhone("1")).toBe("(1");
    expect(formatPhone("11")).toBe("(11");
    expect(formatPhone("119")).toBe("(11) 9");
    expect(formatPhone("119876")).toBe("(11) 9876");
    expect(formatPhone("1198765")).toBe("(11) 9876-5");
  });

  it("ignora o que não é dígito e apara o excesso", () => {
    expect(formatPhone("(11) 98765-4321")).toBe("(11) 98765-4321");
    expect(formatPhone("11987654321999")).toBe("(11) 98765-4321");
  });

  it("tira o DDI 55 em vez de cortar o número", () => {
    // Cadastro gravado por whatsAppNumber(), que põe o 55 na frente. Cortar
    // em 11 dígitos daria "(55) 11987-6543" e gravaria telefone errado.
    expect(formatPhone("5511987654321")).toBe("(11) 98765-4321");
    expect(formatPhone("551134567890")).toBe("(11) 3456-7890");
    expect(formatPhone("+55 (11) 98765-4321")).toBe("(11) 98765-4321");
  });

  it("não confunde DDD 55 com DDI", () => {
    // Rio Grande do Sul usa DDD 55. Com 10 ou 11 dígitos não há DDI a tirar.
    expect(formatPhone("5599876543")).toBe("(55) 9987-6543");
    expect(formatPhone("55998765432")).toBe("(55) 99876-5432");
  });

  it("unformatPhone devolve só os dígitos do número nacional", () => {
    expect(unformatPhone("(11) 98765-4321")).toBe("11987654321");
    expect(unformatPhone("5511987654321")).toBe("11987654321");
    expect(unformatPhone("")).toBe("");
  });
});

describe("formatCurrency", () => {
  it("empurra a vírgula da direita para a esquerda", () => {
    expect(formatCurrency("")).toBe("");
    expect(formatCurrency("5")).toBe("0,05");
    expect(formatCurrency("50")).toBe("0,50");
    expect(formatCurrency("1234")).toBe("12,34");
  });

  it("agrupa o milhar", () => {
    expect(formatCurrency("123456")).toBe("1.234,56");
    expect(formatCurrency("100000000")).toBe("1.000.000,00");
  });

  it("parseCurrency devolve reais", () => {
    expect(parseCurrency("1.234,56")).toBe(1234.56);
    expect(parseCurrency("0,05")).toBe(0.05);
    expect(parseCurrency("")).toBeNull();
  });
});

describe("formatTime", () => {
  it("aceita digitação corrida", () => {
    expect(formatTime("")).toBe("");
    expect(formatTime("9")).toBe("9");
    expect(formatTime("09")).toBe("09");
    expect(formatTime("093")).toBe("09:3");
    expect(formatTime("0930")).toBe("09:30");
  });

  it("trava em 23:59", () => {
    expect(formatTime("9999")).toBe("23:59");
    expect(formatTime("2560")).toBe("23:59");
  });

  it("ignora o que já está formatado", () => {
    expect(formatTime("18:45")).toBe("18:45");
  });
});

describe("formatPercent", () => {
  it("aceita vírgula e ponto", () => {
    expect(formatPercent("")).toBe("");
    expect(formatPercent("10")).toBe("10");
    expect(formatPercent("10,5")).toBe("10,5");
    expect(formatPercent("10.5")).toBe("10,5");
  });

  it("limita a duas casas e a 100", () => {
    expect(formatPercent("10,555")).toBe("10,55");
    expect(formatPercent("150")).toBe("100");
    expect(formatPercent("150,5")).toBe("100");
  });

  it("parsePercent devolve número", () => {
    expect(parsePercent("10,5")).toBe(10.5);
    expect(parsePercent("150")).toBe(100);
    expect(parsePercent("")).toBeNull();
  });
});

describe("onlyDigits", () => {
  it("remove tudo que não é dígito", () => {
    expect(onlyDigits("R$ 1.234,56")).toBe("123456");
    expect(onlyDigits("abc")).toBe("");
  });
});
