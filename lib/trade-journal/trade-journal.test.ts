import { describe, expect, it } from "vitest";

import {
  checkTradeChange,
  evaluatePosition,
  parseTradeInput,
  summarizePositions,
  summarizeTurtleTrades,
  type Trade,
} from "@/lib/trade-journal";

function trade(overrides: Partial<Trade> & Pick<Trade, "side" | "price" | "quantity" | "tradeDate">): Trade {
  return {
    id: `${overrides.tradeDate}-${overrides.side}-${overrides.price}`,
    symbol: "TSLA",
    name: "Tesla, Inc.",
    source: "manual",
    createdAt: `${overrides.tradeDate}T00:00:00.000Z`,
    ...overrides,
  };
}

describe("summarizeTurtleTrades", () => {
  // 직접 판단 $300×10, 터틀 $400×10 매수, 터틀 $420×5 매도
  const mixed = [
    trade({ side: "buy", tradeDate: "2026-01-05", price: 300, quantity: 10 }),
    trade({ side: "buy", tradeDate: "2026-02-05", price: 400, quantity: 10, source: "turtle" }),
    trade({ side: "sell", tradeDate: "2026-03-05", price: 420, quantity: 5, source: "turtle" }),
  ];

  it("터틀 매매만 모아 평균단가 방식으로 실현 손익과 수익률을 계산한다", () => {
    const result = summarizeTurtleTrades(mixed);

    expect(result).toMatchObject({ tradeCount: 2, sellCount: 1, winningSells: 1, realizedPnl: 100 });
    expect(result.realizedPercent).toBeCloseTo(5, 6);
    expect(result.openPositions).toMatchObject([{ symbol: "TSLA", quantity: 5, averageCost: 400 }]);
  });

  it("종목별 전체 요약은 출처와 관계없이 모든 매매로 계산한다", () => {
    const result = summarizePositions(mixed);

    expect(result.status === "ok" && result.positions[0]).toMatchObject({ quantity: 15, averageCost: 350, realizedPnl: 350 });
  });

  it("터틀 매매가 없으면 매매 수 0과 빈 결과를 돌려준다", () => {
    expect(summarizeTurtleTrades([mixed[0]])).toMatchObject({ tradeCount: 0, sellCount: 0, realizedPnl: 0, realizedPercent: null, openPositions: [] });
  });

  it("평균단가보다 싸게 판 터틀 매도는 수익 낸 매도로 세지 않는다", () => {
    const result = summarizeTurtleTrades([
      ...mixed,
      trade({ side: "sell", tradeDate: "2026-04-05", price: 380, quantity: 5, source: "turtle" }),
    ]);

    expect(result).toMatchObject({ sellCount: 2, winningSells: 1, realizedPnl: 0 });
  });
});

describe("summarizePositions", () => {
  it("여러 번 매수하면 평균단가는 매수 금액의 가중 평균이다", () => {
    const result = summarizePositions([
      trade({ side: "buy", tradeDate: "2026-01-05", price: 400, quantity: 10 }),
      trade({ side: "buy", tradeDate: "2026-03-05", price: 300, quantity: 10 }),
    ]);

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.positions).toEqual([
      expect.objectContaining({ symbol: "TSLA", quantity: 20, averageCost: 350, realizedPnl: 0 }),
    ]);
  });
});

const specExample = [
  trade({ side: "buy", tradeDate: "2026-01-05", price: 400, quantity: 10 }),
  trade({ side: "buy", tradeDate: "2026-03-05", price: 300, quantity: 10 }),
  trade({ side: "sell", tradeDate: "2026-05-05", price: 380, quantity: 10 }),
];

describe("summarizePositions 매도", () => {
  it("매도하면 그 시점 평균단가 기준으로 실현 손익을 계산하고 남은 평균단가는 그대로 둔다", () => {
    const result = summarizePositions(specExample);

    expect(result.status === "ok" && result.positions[0]).toMatchObject({
      quantity: 10,
      averageCost: 350,
      realizedPnl: 300,
      realizedCostBasis: 3500,
    });
  });

  it("전량 매도하면 보유 수량은 0, 평균단가는 null이고 실현 손익은 남는다", () => {
    const result = summarizePositions([
      ...specExample,
      trade({ side: "sell", tradeDate: "2026-06-01", price: 340, quantity: 10 }),
    ]);

    expect(result.status === "ok" && result.positions[0]).toMatchObject({
      quantity: 0,
      averageCost: null,
      realizedPnl: 200,
    });
  });

  it("어느 시점에서든 보유 수량보다 많이 팔면 oversold를 돌려준다", () => {
    const result = summarizePositions([
      trade({ side: "buy", tradeDate: "2026-01-05", price: 400, quantity: 10 }),
      trade({ side: "sell", tradeDate: "2026-01-04", price: 390, quantity: 5 }),
    ]);

    expect(result).toEqual({ status: "oversold", symbol: "TSLA", tradeDate: "2026-01-04" });
  });

  it("같은 날 매매는 입력 순서대로 계산한다", () => {
    const result = summarizePositions([
      { ...trade({ side: "sell", tradeDate: "2026-02-01", price: 410, quantity: 10 }), createdAt: "2026-02-01T10:00:00.000Z" },
      { ...trade({ side: "buy", tradeDate: "2026-02-01", price: 400, quantity: 10 }), createdAt: "2026-02-01T09:00:00.000Z" },
    ]);

    expect(result.status === "ok" && result.positions[0]).toMatchObject({ quantity: 0, realizedPnl: 100 });
  });

  it("종목별로 따로 계산한다", () => {
    const result = summarizePositions([
      trade({ side: "buy", tradeDate: "2026-01-05", price: 400, quantity: 10 }),
      trade({ symbol: "QQQ", name: "Invesco QQQ Trust", side: "buy", tradeDate: "2026-01-06", price: 700, quantity: 2 }),
    ]);

    expect(result.status === "ok" && result.positions.map((p) => [p.symbol, p.quantity])).toEqual([
      ["TSLA", 10],
      ["QQQ", 2],
    ]);
  });
});

describe("evaluatePosition", () => {
  it("현재가 기준 평가 손익과 평가 수익률, 실현 수익률을 계산한다", () => {
    const result = summarizePositions(specExample);
    if (result.status !== "ok") throw new Error("unexpected");

    const evaluation = evaluatePosition(result.positions[0], 404.22);

    expect(evaluation.unrealizedPnl).toBeCloseTo(542.2, 6);
    expect(evaluation.unrealizedPercent).toBeCloseTo(15.4914, 3);
    expect(evaluation.realizedPercent).toBeCloseTo(8.5714, 3);
  });

  it("현재가가 없거나 보유 수량이 0이면 평가 값은 null이다", () => {
    const result = summarizePositions(specExample);
    if (result.status !== "ok") throw new Error("unexpected");

    expect(evaluatePosition(result.positions[0], null)).toMatchObject({ unrealizedPnl: null, unrealizedPercent: null });
  });
});

describe("parseTradeInput", () => {
  const valid = { symbol: "tsla", name: "Tesla, Inc.", side: "buy", tradeDate: "2026-10-28", price: "404.22", quantity: "3" };

  it("올바른 입력을 정리된 값으로 돌려준다", () => {
    expect(parseTradeInput(valid, "2026-10-29")).toEqual({
      ok: true,
      value: { symbol: "TSLA", name: "Tesla, Inc.", side: "buy", source: "manual", tradeDate: "2026-10-28", price: 404.22, quantity: 3 },
    });
  });

  it.each([
    [{ symbol: "" }, "종목을 골라 주세요."],
    [{ side: "hold" }, "매수 또는 매도를 골라 주세요."],
    [{ tradeDate: "2026-10-30" }, "미래 날짜는 입력할 수 없습니다."],
    [{ tradeDate: "2026-02-30" }, "거래일을 올바르게 입력해 주세요."],
    [{ price: "0" }, "가격은 0보다 커야 합니다."],
    [{ price: "abc" }, "가격은 0보다 커야 합니다."],
    [{ quantity: "-1" }, "수량은 0보다 커야 합니다."],
  ])("%o 이면 저장하지 않고 이유를 알려준다", (override, message) => {
    expect(parseTradeInput({ ...valid, ...override }, "2026-10-29")).toEqual({ ok: false, error: message });
  });
});

describe("checkTradeChange", () => {
  const buy = trade({ side: "buy", tradeDate: "2026-01-05", price: 400, quantity: 10 });
  const sell = trade({ side: "sell", tradeDate: "2026-02-05", price: 410, quantity: 10 });

  it("보유 수량보다 많이 파는 새 매매는 막는다", () => {
    const next = trade({ side: "sell", tradeDate: "2026-03-01", price: 420, quantity: 1 });

    expect(checkTradeChange([buy, sell], { type: "add", trade: next })).toEqual({
      ok: false,
      error: "2026-03-01 기준 TSLA 보유 수량보다 많이 팔 수 없습니다.",
    });
  });

  it("삭제로 이후 매도가 보유 수량을 넘게 되면 막는다", () => {
    expect(checkTradeChange([buy, sell], { type: "delete", id: buy.id })).toMatchObject({ ok: false });
  });

  it("수정 후에도 보유 수량이 음수가 되지 않으면 허용한다", () => {
    expect(checkTradeChange([buy, sell], { type: "update", trade: { ...buy, quantity: 12 } })).toEqual({ ok: true });
  });
});

describe("출처 검증", () => {
  const manualBuy = trade({ side: "buy", tradeDate: "2026-01-05", price: 300, quantity: 10 });
  const turtleBuy = trade({ side: "buy", tradeDate: "2026-02-05", price: 400, quantity: 3, source: "turtle" });

  it("터틀 출처 매도는 터틀 출처로 산 수량을 넘을 수 없다", () => {
    const sell = trade({ side: "sell", tradeDate: "2026-03-05", price: 420, quantity: 5, source: "turtle" });

    expect(checkTradeChange([manualBuy, turtleBuy], { type: "add", trade: sell })).toEqual({
      ok: false,
      error: "2026-03-05 기준 TSLA를 터틀 신호로 산 수량보다 많이 팔 수 없습니다.",
    });
  });

  it("출처를 직접 판단으로 바꿔 터틀 매도가 터틀 매수를 넘게 되면 막는다", () => {
    const sell = trade({ side: "sell", tradeDate: "2026-03-05", price: 420, quantity: 3, source: "turtle" });

    expect(checkTradeChange([manualBuy, turtleBuy, sell], { type: "update", trade: { ...turtleBuy, source: "manual" } })).toMatchObject({ ok: false });
  });

  it("parseTradeInput은 출처를 읽고, 알 수 없는 값은 막는다", () => {
    const base = { symbol: "TSLA", name: "Tesla", side: "buy", tradeDate: "2026-10-28", price: "1", quantity: "1" };

    expect(parseTradeInput({ ...base, source: "turtle" }, "2026-10-29")).toMatchObject({ ok: true, value: { source: "turtle" } });
    expect(parseTradeInput({ ...base, source: undefined }, "2026-10-29")).toMatchObject({ ok: true, value: { source: "manual" } });
    expect(parseTradeInput({ ...base, source: "news" }, "2026-10-29")).toEqual({ ok: false, error: "출처를 골라 주세요." });
  });
});
