import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const yahoo = vi.hoisted(() => ({
  search: vi.fn(),
  quote: vi.fn(),
  chart: vi.fn(),
}));

vi.mock("yahoo-finance2", () => ({
  default: vi.fn(function () {
    return yahoo;
  }),
}));

import { getDailyBars, getPriceHistory, getReturnSince, getStockOverview, searchSecurities } from "@/lib/market-data";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("searchSecurities", () => {
  it("미국 거래소에 상장된 주식과 ETF만 후보로 돌려준다", async () => {
    yahoo.search.mockResolvedValue({
      quotes: [
        { symbol: "TSLA", quoteType: "EQUITY", exchange: "NMS", shortname: "Tesla, Inc.", isYahooFinance: true },
        { symbol: "STSLA=F", quoteType: "FUTURE", exchange: "CME", shortname: "Tesla Futures", isYahooFinance: true },
        { symbol: "TSLZ", quoteType: "ETF", exchange: "BTS", shortname: "T-Rex 2X Inverse Tesla", isYahooFinance: true },
        { symbol: "TL0.DE", quoteType: "EQUITY", exchange: "GER", shortname: "TESLA INC", isYahooFinance: true },
        { symbol: "SPY", quoteType: "ETF", exchange: "PCX", longname: "SPDR S&P 500 ETF Trust", isYahooFinance: true },
        { index: "abc", name: "news-like entry", isYahooFinance: false },
      ],
    });

    const result = await searchSecurities("tesla");

    expect(result).toEqual({
      status: "ok",
      candidates: [
        { symbol: "TSLA", name: "Tesla, Inc.", type: "EQUITY" },
        { symbol: "TSLZ", name: "T-Rex 2X Inverse Tesla", type: "ETF" },
        { symbol: "SPY", name: "SPDR S&P 500 ETF Trust", type: "ETF" },
      ],
    });
  });
});

describe("getStockOverview", () => {
  it("현재가와 그 기준 시각, PER(최근 12개월)과 PBR을 돌려준다", async () => {
    yahoo.quote.mockResolvedValue({
      symbol: "TSLA",
      quoteType: "EQUITY",
      shortName: "Tesla, Inc.",
      longName: "Tesla, Inc.",
      currency: "USD",
      regularMarketPrice: 404.22,
      regularMarketTime: new Date("2026-10-28T20:00:01.000Z"),
      trailingPE: 449.13336,
      priceToBook: 17.895344,
    });

    const result = await getStockOverview("tsla");

    expect(yahoo.quote).toHaveBeenCalledWith("TSLA");
    expect(result).toEqual({
      status: "ok",
      overview: {
        symbol: "TSLA",
        name: "Tesla, Inc.",
        type: "EQUITY",
        currency: "USD",
        price: 404.22,
        priceTime: new Date("2026-10-28T20:00:01.000Z"),
        per: 449.13336,
        pbr: 17.895344,
      },
    });
  });

  it("적자 등으로 PER이 없으면 값을 비워 둔다", async () => {
    yahoo.quote.mockResolvedValue({
      symbol: "RIVN",
      quoteType: "EQUITY",
      shortName: "Rivian Automotive, Inc.",
      currency: "USD",
      regularMarketPrice: 12.5,
      regularMarketTime: new Date("2026-10-28T20:00:00.000Z"),
      priceToBook: 3.11,
    });

    const result = await getStockOverview("RIVN");

    expect(result.status === "ok" && result.overview.per).toBeNull();
    expect(result.status === "ok" && result.overview.pbr).toBe(3.11);
  });

  it("존재하지 않는 티커면 not-found를 돌려준다", async () => {
    yahoo.quote.mockResolvedValue(undefined);

    expect(await getStockOverview("ZZZZQ")).toEqual({ status: "not-found" });
  });

  it("Yahoo 호출이 실패하면 error를 돌려준다", async () => {
    yahoo.quote.mockRejectedValue(new Error("network"));

    expect(await getStockOverview("TSLA")).toEqual({ status: "error" });
  });
});

function bar(day: string, close: number) {
  return { date: new Date(`${day}T13:30:00.000Z`), open: close, high: close, low: close, close, volume: 1 };
}

describe("getReturnSince", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-29T03:00:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("고른 날짜 종가 대비 현재가 상승률을 돌려준다", async () => {
    yahoo.chart.mockResolvedValue({ quotes: [bar("2026-01-01", 400), bar("2026-01-02", 438.07)] });

    const result = await getReturnSince("TSLA", "2026-01-02", 404.22);

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.baseDate).toBe("2026-01-02");
    expect(result.basePrice).toBe(438.07);
    expect(result.changePercent).toBeCloseTo(-7.727, 2);
  });

  it("휴장일을 고르면 직전 거래일 종가를 기준으로 하고 그 날짜를 알려준다", async () => {
    yahoo.chart.mockResolvedValue({ quotes: [bar("2026-10-22", 374.58), bar("2026-10-23", 372.22)] });

    const result = await getReturnSince("TSLA", "2026-10-25", 404.22);

    expect(result).toMatchObject({ status: "ok", baseDate: "2026-10-23", basePrice: 372.22 });
  });

  it("미래 날짜를 고르면 future를 돌려주고 데이터를 요청하지 않는다", async () => {
    const result = await getReturnSince("TSLA", "2026-11-05", 404.22);

    expect(result).toEqual({ status: "future" });
    expect(yahoo.chart).not.toHaveBeenCalled();
  });

  it("상장 전 날짜처럼 데이터가 없으면 no-data를 돌려준다", async () => {
    yahoo.chart.mockRejectedValue(new Error("Data doesn't exist for startDate = 1262304000, endDate = 1263254400"));

    expect(await getReturnSince("RIVN", "2010-01-11", 12.5)).toEqual({ status: "no-data" });
  });

  it("날짜 형식이 잘못되면 invalid-date를 돌려준다", async () => {
    expect(await getReturnSince("TSLA", "2026-13-40", 404.22)).toEqual({ status: "invalid-date" });
  });
});

describe("getPriceHistory", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-29T03:00:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("고른 기간의 일별 종가를 돌려준다", async () => {
    yahoo.chart.mockResolvedValue({ quotes: [bar("2026-09-29", 440), { ...bar("2026-09-30", 0), close: null }, bar("2026-10-28", 404.22)] });

    const result = await getPriceHistory("TSLA", "1m");

    expect(yahoo.chart).toHaveBeenCalledWith("TSLA", expect.objectContaining({ period1: "2026-09-29", interval: "1d" }));
    expect(result).toEqual({
      status: "ok",
      points: [
        { date: "2026-09-29", close: 440 },
        { date: "2026-10-28", close: 404.22 },
      ],
    });
  });

  it("5년 기간은 5년 전부터 요청한다", async () => {
    yahoo.chart.mockResolvedValue({ quotes: [] });

    await getPriceHistory("TSLA", "5y");

    expect(yahoo.chart).toHaveBeenCalledWith("TSLA", expect.objectContaining({ period1: "2021-10-29" }));
  });

  it("Yahoo 호출이 실패하면 error를 돌려준다", async () => {
    yahoo.chart.mockRejectedValue(new Error("network"));

    expect(await getPriceHistory("TSLA", "1y")).toEqual({ status: "error" });
  });
});

describe("getDailyBars", () => {
  it("값이 빠진 날을 건너뛰고 거래일·시가·고가·저가·종가·거래량을 돌려준다", async () => {
    yahoo.chart.mockResolvedValue({
      quotes: [
        { date: new Date("2023-07-03T13:30:00.000Z"), open: 1, high: 3, low: 0.5, close: 2, volume: 10 },
        { date: new Date("2023-07-05T13:30:00.000Z"), open: null, high: null, low: null, close: null, volume: null },
        { date: new Date("2023-07-06T13:30:00.000Z"), open: 2, high: 4, low: 1.5, close: 3, volume: null },
      ],
    });

    const result = await getDailyBars("tsla", "2023-07-01");

    expect(yahoo.chart).toHaveBeenCalledWith("TSLA", { period1: "2023-07-01", interval: "1d" });
    expect(result).toEqual({
      status: "ok",
      bars: [
        { date: "2023-07-03", open: 1, high: 3, low: 0.5, close: 2, volume: 10 },
        { date: "2023-07-06", open: 2, high: 4, low: 1.5, close: 3, volume: 0 },
      ],
    });
  });

  it("Yahoo 호출이 실패하면 error를 돌려준다", async () => {
    yahoo.chart.mockRejectedValue(new Error("network"));

    expect(await getDailyBars("TSLA", "2023-07-01")).toEqual({ status: "error" });
  });
});
