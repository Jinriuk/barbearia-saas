import { describe, expect, it } from "vitest";
import { brandName, consentIp, consentText } from "./consent";

describe("texto de consentimento por vertical (Fase 0 §0.5)", () => {
  it("usa a marca da barbearia", () => {
    expect(brandName("barber")).toBe("NexoBarber");
    expect(consentText("barber")).toContain("NexoBarber");
  });

  it("usa a marca do salão — era o defeito: a landing de salão pedia autorização em nome do NexoBarber", () => {
    expect(brandName("salon")).toBe("NexoBeleza");
    expect(consentText("salon")).toContain("NexoBeleza");
    expect(consentText("salon")).not.toContain("NexoBarber");
  });
});

describe("consentIp — o que a coluna inet aceita (Fase 0 §0.4)", () => {
  it("aceita IPv4 puro", () => {
    expect(consentIp("203.0.113.10")).toBe("203.0.113.10");
  });

  it("tira a porta do IPv4", () => {
    expect(consentIp("203.0.113.10:54321")).toBe("203.0.113.10");
  });

  it("aceita IPv6 sem colchetes sem cortar o endereço", () => {
    expect(consentIp("2001:db8::1")).toBe("2001:db8::1");
    // O caso que uma regex ingênua de porta quebraria: ::1 termina em ":1".
    expect(consentIp("::1")).toBe("::1");
  });

  it("desembrulha IPv6 com colchetes e porta", () => {
    expect(consentIp("[2001:db8::1]:443")).toBe("2001:db8::1");
    expect(consentIp("[::1]")).toBe("::1");
  });

  it("remove a zona do link-local", () => {
    expect(consentIp("fe80::1%eth0")).toBe("fe80::1");
  });

  it("devolve null em vez de derrubar o cadastro do lead", () => {
    expect(consentIp("unknown")).toBeNull();
    expect(consentIp("")).toBeNull();
    expect(consentIp("nao-e-um-ip")).toBeNull();
    // Sem isso, um header forjado viraria erro de insert e o lead se perderia.
    expect(consentIp("<script>alert(1)</script>")).toBeNull();
  });
});
