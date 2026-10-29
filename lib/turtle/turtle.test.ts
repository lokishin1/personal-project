import { describe, expect, it } from "vitest";

import { analyzeTurtle, holdingExitSignal, type TurtleBar } from "@/lib/turtle";

// 하루씩 날짜를 붙인다. 기본값은 고가 = 종가+10, 저가 = 종가−10, 시가 = 종가, 거래량 100이다.
function series(specs: Array<number | Partial<Omit<TurtleBar, "date">> & { close: number }>): TurtleBar[] {
  const start = Date.UTC(2023, 0, 1);
  return specs.map((spec, i) => {
    const s = typeof spec === "number" ? { close: spec } : spec;
    return {
      date: new Date(start + i * 86_400_000).toISOString().slice(0, 10),
      open: s.open ?? s.close,
      high: s.high ?? s.close + 10,
      low: s.low ?? s.close - 10,
      close: s.close,
      volume: s.volume ?? 100,
    };
  });
}

const flat = (n: number) => Array.from({ length: n }, () => 100);

describe("analyzeTurtle 지금 신호", () => {
  it("직전 55거래일 최고가, 직전 20거래일 최저가, N, 거래량 비율을 계산한다", () => {
    // 0–59번: 종가 100(고가 110, 저가 90). 30번만 고가 130. 마지막(60번) 종가 105, 거래량 300
    const bars = series([...flat(30), { close: 100, high: 130 }, ...flat(29), { close: 105, volume: 300 }]);

    const result = analyzeTurtle(bars, bars[0].date);

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.signal).toMatchObject({
      asOf: bars[60].date,
      close: 105,
      entryLevel: 130,
      exitLevel: 90,
      buySignal: false,
      volumeRatio: 3,
    });
    // 진폭: 41–59번은 20, 60번은 max(115−95, |115−100|, |95−100|) = 20 → N = 20
    expect(result.signal.n).toBeCloseTo(20, 6);
    expect(result.signal.distanceToEntryPercent).toBeCloseTo((130 / 105 - 1) * 100, 6);
  });

  it("마지막 종가가 직전 55거래일 최고가를 넘으면 매수 신호다", () => {
    const bars = series([...flat(60), 115]);

    const result = analyzeTurtle(bars, bars[0].date);

    expect(result.status === "ok" && result.signal.buySignal).toBe(true);
  });

  it("기준가를 계산할 만큼 가격 기록이 없으면 insufficient를 돌려준다", () => {
    expect(analyzeTurtle(series(flat(55)), "2023-01-01")).toEqual({ status: "insufficient" });
  });
});

describe("analyzeTurtle 백테스트", () => {
  // 0–55번 종가 100(고가 110, 저가 90). 56번 종가 115로 직전 55일 최고가(110) 돌파 → 매수 신호.
  // 56번의 N = (19×20 + 25) / 20 = 20.25. 57번 시가 116에 매수, 손절 가격 = 116 − 2×20.25 = 75.5
  const breakout = [...flat(56), { close: 115 }];

  it("20일 최저가를 깨면 다음 날 시가에 팔고 이유를 20일 최저가 이탈로 남긴다", () => {
    // 58번 종가 85 < 직전 20일 최저가 90 (손절 75.5보다는 위) → 59번 시가 86에 매도
    const bars = series([...breakout, { close: 116, open: 116 }, 85, { close: 100, open: 86 }, 100]);

    const result = analyzeTurtle(bars, bars[55].date);
    if (result.status !== "ok") throw new Error("unexpected");

    expect(result.backtest.trades).toEqual([
      {
        entryDate: bars[57].date,
        entryPrice: 116,
        stopPrice: 75.5,
        exitDate: bars[59].date,
        exitPrice: 86,
        returnPercent: expect.closeTo((86 / 116 - 1) * 100, 6),
        reason: "exit-level",
      },
    ]);
    expect(result.backtest.openTrade).toBeNull();
    expect(result.backtest.strategyReturnPercent).toBeCloseTo((86 / 116 - 1) * 100, 6);
    expect(result.backtest.buyAndHoldReturnPercent).toBeCloseTo(0, 6);
  });

  it("매수한 날 종가가 손절 가격 아래면 다음 날 시가에 팔고 이유를 손절로 남긴다", () => {
    // 57번 시가 116에 사고 같은 날 종가 70 < 손절 75.5 (20일 최저가 90도 깼지만 손절이 우선) → 58번 시가 72에 매도
    const bars = series([...breakout, { close: 70, open: 116, high: 120, low: 60 }, { close: 72, open: 72 }, 100, 100]);

    const result = analyzeTurtle(bars, bars[55].date);
    if (result.status !== "ok") throw new Error("unexpected");

    expect(result.backtest.trades).toMatchObject([
      { entryDate: bars[57].date, exitDate: bars[58].date, exitPrice: 72, reason: "stop" },
    ]);
    expect(result.backtest.trades[0].returnPercent).toBeCloseTo((72 / 116 - 1) * 100, 6);
  });

  it("기간 끝까지 팔지 않은 거래는 진행 중인 거래로 최근 종가 기준 수익률을 보여주고 누적 수익률에 넣는다", () => {
    const bars = series([...breakout, { close: 116, open: 116 }, 120, 125, 130]);

    const result = analyzeTurtle(bars, bars[55].date);
    if (result.status !== "ok") throw new Error("unexpected");

    expect(result.backtest.trades).toEqual([]);
    expect(result.backtest.openTrade).toMatchObject({ entryDate: bars[57].date, entryPrice: 116, stopPrice: 75.5, sellSignal: false });
    expect(result.backtest.openTrade?.returnPercent).toBeCloseTo((130 / 116 - 1) * 100, 6);
    expect(result.backtest.strategyReturnPercent).toBeCloseTo((130 / 116 - 1) * 100, 6);
    expect(result.backtest.buyAndHoldReturnPercent).toBeCloseTo(30, 6);
  });

  it("최근 거래일에 매도 신호가 나면 진행 중인 거래에 표시한다", () => {
    const bars = series([...breakout, { close: 116, open: 116 }, 120, 125, 80]);

    const result = analyzeTurtle(bars, bars[55].date);
    if (result.status !== "ok") throw new Error("unexpected");

    expect(result.backtest.openTrade).toMatchObject({ sellSignal: true });
    expect(result.backtest.openTrade?.returnPercent).toBeCloseTo((80 / 116 - 1) * 100, 6);
  });

  it("최근 거래일의 매수 신호는 아직 거래로 잡지 않는다", () => {
    const bars = series([...flat(60), 115]);

    const result = analyzeTurtle(bars, bars[0].date);
    if (result.status !== "ok") throw new Error("unexpected");

    expect(result.signal.buySignal).toBe(true);
    expect(result.backtest.trades).toEqual([]);
    expect(result.backtest.openTrade).toBeNull();
  });

  it("거래를 여러 번 하면 수익률을 복리로 잇는다", () => {
    // 첫 거래: 116 → 86. 그 뒤 60–115번 종가 100으로 쉬었다가 116번 종가 140으로 다시 돌파 → 117번 시가 150에 매수, 끝까지 보유(종가 165)
    const bars = series([
      ...breakout,
      { close: 116, open: 116 },
      85,
      { close: 100, open: 86 },
      ...flat(56),
      { close: 140 },
      { close: 150, open: 150 },
      165,
    ]);

    const result = analyzeTurtle(bars, bars[55].date);
    if (result.status !== "ok") throw new Error("unexpected");

    expect(result.backtest.trades).toHaveLength(1);
    expect(result.backtest.openTrade).toMatchObject({ entryPrice: 150 });
    expect(result.backtest.strategyReturnPercent).toBeCloseTo(((86 / 116) * (165 / 150) - 1) * 100, 6);
  });
});

describe("holdingExitSignal", () => {
  // 0–39번 종가 100(진폭 20). 마지막(40번)만 따로 정한다. 날짜는 2023-01-01부터 하루씩.
  const day = (i: number) => series(flat(i + 1))[i].date;

  it("매도 기준가는 직전 20거래일 최저가, 손절 가격은 평균단가 − 2 × 매수일의 N이다", () => {
    const bars = series([...flat(40), 104]);

    const result = holdingExitSignal(bars, { averageCost: 120, lastBuyDate: day(30) });

    // 30번까지 진폭은 모두 20 → N = 20, 손절 = 120 − 40 = 80. 20일 최저가 = 90
    expect(result).toMatchObject({ status: "ok", asOf: day(40), close: 104, exitLevel: 90, nAtBuy: 20, stopPrice: 80, hitExit: false, hitStop: false });
    if (result.status !== "ok") return;
    expect(result.aboveExitPercent).toBeCloseTo((104 / 90 - 1) * 100, 6);
    expect(result.aboveStopPercent).toBeCloseTo((104 / 80 - 1) * 100, 6);
  });

  it("매수일이 휴장일이면 그 직전 거래일의 N을 쓴다", () => {
    // 25번 날짜를 빼서 휴장일로 만든다. 24번 진폭만 40으로 키워 두면 직전 거래일(24번)의 N에 반영된다.
    const all = series([...flat(24), { close: 100, high: 120, low: 80 }, ...flat(16), 104]);
    const holiday = all[25].date;
    const bars = all.filter((b) => b.date !== holiday);

    const result = holdingExitSignal(bars, { averageCost: 120, lastBuyDate: holiday });

    expect(result.status === "ok" && result.nAtBuy).toBeCloseTo((19 * 20 + 40) / 20, 6);
  });

  it("종가가 20일 최저가나 손절 가격보다 낮으면 각각 이탈로 표시한다", () => {
    const exitOnly = holdingExitSignal(series([...flat(40), 85]), { averageCost: 120, lastBuyDate: day(30) });
    const both = holdingExitSignal(series([...flat(40), 75]), { averageCost: 120, lastBuyDate: day(30) });

    expect(exitOnly).toMatchObject({ hitExit: true, hitStop: false });
    expect(both).toMatchObject({ hitExit: true, hitStop: true });
  });

  it("매수일 이전 가격 기록이 20거래일이 안 되면 insufficient를 돌려준다", () => {
    const bars = series([...flat(40), 104]);

    expect(holdingExitSignal(bars, { averageCost: 120, lastBuyDate: day(10) })).toEqual({ status: "insufficient" });
    expect(holdingExitSignal(bars, { averageCost: 120, lastBuyDate: "2022-12-01" })).toEqual({ status: "insufficient" });
  });
});
