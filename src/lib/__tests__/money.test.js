import { describe, it, expect } from "vitest";
import { toCents, calcRestante, calcStatusPagamento } from "../money";

describe("toCents", () => {
  it("converte e arredonda", () => {
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(toCents("12,5".replace(",", "."))).toBe(1250);
    expect(toCents(null)).toBe(0);
  });
});

describe("calcStatusPagamento", () => {
  it("pendente sem pagamento", () => {
    expect(calcStatusPagamento(100, 0)).toBe("pendente");
  });
  it("parcial com pagamento menor que o total", () => {
    expect(calcStatusPagamento(100, 50)).toBe("parcial");
  });
  it("pago quando quita (sem erro de float: 0,7 + 0,1 = 0,8)", () => {
    expect(0.7 + 0.1 >= 0.8).toBe(false); // o bug que motivou o helper
    expect(calcStatusPagamento(0.8, 0.7 + 0.1)).toBe("pago");
  });
  it("pago quando paga a mais", () => {
    expect(calcStatusPagamento(100, 120)).toBe("pago");
  });
});

describe("calcRestante", () => {
  it("nunca negativo e sem resíduo de float", () => {
    expect(calcRestante(0.8, 0.7 + 0.1)).toBe(0);
    expect(calcRestante(100, 120)).toBe(0);
    expect(calcRestante(100, 33.33)).toBe(66.67);
  });
});
