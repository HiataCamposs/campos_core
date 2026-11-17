import { describe, it, expect } from "vitest";
import { fmtMoney, fmtDate } from "../format";

describe("fmtMoney", () => {
  it("formata em pt-BR com 2 casas", () => {
    expect(fmtMoney(1234.5)).toBe("R$ 1.234,50");
    expect(fmtMoney(0)).toBe("R$ 0,00");
    expect(fmtMoney("10")).toBe("R$ 10,00");
  });
  it("vazio vira travessão", () => {
    expect(fmtMoney(null)).toBe("—");
    expect(fmtMoney("")).toBe("—");
    expect(fmtMoney("abc")).toBe("—");
  });
});

describe("fmtDate", () => {
  it("formata data e timestamp sem deslocar fuso", () => {
    expect(fmtDate("2026-11-16")).toBe("16/11/2026");
    expect(fmtDate("2026-11-16T23:30:00+00:00")).toBe("16/11/2026");
  });
  it("vazio vira travessão", () => {
    expect(fmtDate(null)).toBe("—");
    expect(fmtDate("")).toBe("—");
  });
});
