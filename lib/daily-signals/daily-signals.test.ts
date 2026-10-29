import { describe, expect, it } from "vitest";

import { scanDailySignals } from "@/lib/daily-signals";
import type { TurtleBar } from "@/lib/turtle";
import type { UniverseMember } from "@/lib/signal-universe";

// 61거래일: 0–59번은 종가 100(고가 110, 저가 90, 거래량 100), 마지막 날만 따로 정한다.
function bars(lastClose: number, lastVolume = 100, lastDate = "2023-03-02"): TurtleBar[] {
  const start = Date.UTC(2023, 0, 1);
  const list: TurtleBar[] = Array.from({ length: 60 }, (_, i) => ({
    date: new Date(start + i * 86_400_000).toISOString().slice(0, 10),
    open: 100,
    high: 110,
    low: 90,
    close: 100,
    volume: 100,
  }));
  list.push({ date: lastDate, open: lastClose, high: lastClose + 10, low: lastClose - 10, close: lastClose, volume: lastVolume });
  return list;
}

const member = (symbol: string, type: "EQUITY" | "ETF" = "EQUITY"): UniverseMember => ({ symbol, name: `${symbol} Inc.`, type });

describe("scanDailySignals", () => {
  it("최근 거래일에 매수 신호가 난 종목만 거래량 비율이 큰 순서로 돌려준다", async () => {
    const data: Record<string, TurtleBar[]> = {
      AAA: bars(120, 150), // 110 돌파, 거래량 1.5배
      BBB: bars(105), // 신호 없음
      CCC: bars(115, 300, "2023-03-02"), // 110 돌파, 거래량 3배
    };

    const result = await scanDailySignals({
      members: [member("AAA"), member("BBB"), member("CCC", "ETF")],
      getBars: async (symbol) => data[symbol],
      periodStart: "2023-01-01",
    });

    expect(result.asOf).toBe("2023-03-02");
    expect(result.total).toBe(3);
    expect(result.failed).toBe(0);
    expect(result.buySignals.map((row) => row.symbol)).toEqual(["CCC", "AAA"]);
    expect(result.buySignals[0]).toMatchObject({
      symbol: "CCC",
      name: "CCC Inc.",
      type: "ETF",
      close: 115,
      entryLevel: 110,
      volumeRatio: 3,
    });
    expect(result.buySignals[0].abovePercent).toBeCloseTo((115 / 110 - 1) * 100, 6);
    // 진폭: 41–59번 20, 60번 max(20, |125−100|, |105−100|) = 25 → N = (19×20 + 25) / 20 = 20.25
    expect(result.buySignals[0].n).toBeCloseTo(20.25, 6);
    expect(result.buySignals[0].stopEstimate).toBeCloseTo(115 - 2 * 20.25, 6);
    expect(result.nearest).toEqual([]);
  });

  it("가격을 받지 못하거나 기록이 짧거나 최근 거래일이 다른 종목은 계산하지 못한 종목으로 센다", async () => {
    const data: Record<string, TurtleBar[] | null> = {
      AAA: bars(120),
      BBB: bars(130),
      FAIL: null,
      SHORT: bars(120).slice(0, 30),
      STALE: bars(130, 100, "2023-02-15"),
    };

    const result = await scanDailySignals({
      members: Object.keys(data).map((s) => member(s)),
      getBars: async (symbol) => {
        if (symbol === "FAIL") throw new Error("network");
        return data[symbol];
      },
      periodStart: "2023-01-01",
    });

    expect(result.total).toBe(5);
    expect(result.failed).toBe(3);
    expect(result.buySignals.map((row) => row.symbol).sort()).toEqual(["AAA", "BBB"]);
  });

  it("매수 신호가 하나도 없으면 매수 기준가까지 가장 가까운 10개를 남은 % 순서로 돌려준다", async () => {
    const closes = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 99, 98];
    const members = closes.map((_, i) => member(`S${i}`));

    const result = await scanDailySignals({
      members,
      getBars: async (symbol) => bars(closes[Number(symbol.slice(1))]),
      periodStart: "2023-01-01",
    });

    expect(result.buySignals).toEqual([]);
    expect(result.nearest.map((row) => row.symbol)).toEqual(["S9", "S8", "S7", "S6", "S5", "S4", "S3", "S2", "S1", "S0"]);
    expect(result.nearest[0].distanceToEntryPercent).toBeCloseTo((110 / 109 - 1) * 100, 6);
  });

  it("동시에 가격을 받는 종목 수를 제한한다", async () => {
    let running = 0;
    let peak = 0;
    const members = Array.from({ length: 20 }, (_, i) => member(`S${i}`));

    await scanDailySignals({
      members,
      getBars: async () => {
        running++;
        peak = Math.max(peak, running);
        await new Promise((resolve) => setTimeout(resolve, 5));
        running--;
        return bars(100);
      },
      periodStart: "2023-01-01",
      concurrency: 4,
    });

    expect(peak).toBe(4);
  });
});
