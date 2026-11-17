import { describe, it, expect, vi, afterEach } from "vitest";
import { todaySP, addDaysISO, daysAgoSP, localISO } from "../date";

afterEach(() => vi.useRealTimers());

describe("todaySP", () => {
  it("às 22h em Brasília continua sendo o mesmo dia (UTC já virou)", () => {
    vi.useFakeTimers();
    // 22:30 em Brasília (UTC-3) = 01:30 UTC do dia seguinte
    vi.setSystemTime(new Date("2026-11-17T01:30:00Z"));
    expect(new Date().toISOString().slice(0, 10)).toBe("2026-11-17"); // o bug antigo
    expect(todaySP()).toBe("2026-11-16");
  });
});

describe("addDaysISO", () => {
  it("vira mês e ano", () => {
    expect(addDaysISO("2026-12-30", 3)).toBe("2027-01-02");
    expect(addDaysISO("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("arredonda dias fracionados", () => {
    expect(addDaysISO("2026-11-16", 2.6)).toBe("2026-11-19");
    expect(addDaysISO("2026-11-16", 2.4)).toBe("2026-11-18");
  });
});

describe("daysAgoSP", () => {
  it("conta a partir de hoje em Brasília", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-17T01:30:00Z"));
    expect(daysAgoSP(7)).toBe("2026-11-09");
  });
});

describe("localISO", () => {
  it("usa a data local, não UTC", () => {
    expect(localISO(new Date(2026, 10, 16, 23, 30))).toBe("2026-11-16");
  });
});
