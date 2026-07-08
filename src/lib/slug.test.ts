import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/slug";

describe("slugify", () => {
  it("gera slug a partir do nome da barbearia", () => {
    expect(slugify("Barbearia Aurora")).toBe("barbearia-aurora");
  });

  it("remove acentos e caracteres especiais", () => {
    expect(slugify("Salão do Zé & Cia!")).toBe("salao-do-ze-cia");
  });

  it("apara hífens das pontas e espaços", () => {
    expect(slugify("  --Corte Fácil--  ")).toBe("corte-facil");
  });
});
