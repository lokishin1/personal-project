import type { SecurityType } from "./search";
import { yahoo } from "./yahoo";

export type StockOverview = {
  symbol: string;
  name: string;
  type: SecurityType | string;
  currency: string;
  price: number;
  /** 전일 종가 대비 변화(포인트·%). Yahoo가 주지 않으면 null */
  change: number | null;
  changePercent: number | null;
  priceTime: Date;
  /** 최근 12개월 실적 기준 PER. 적자 등으로 없으면 null */
  per: number | null;
  pbr: number | null;
};

export type OverviewResult =
  | { status: "ok"; overview: StockOverview }
  | { status: "not-found" }
  | { status: "error" };

export async function getStockOverview(symbol: string): Promise<OverviewResult> {
  let quote;
  try {
    quote = await yahoo.quote(symbol.toUpperCase());
  } catch {
    return { status: "error" };
  }
  if (!quote || quote.regularMarketPrice == null || !quote.regularMarketTime) {
    return { status: "not-found" };
  }

  return {
    status: "ok",
    overview: {
      symbol: quote.symbol,
      name: quote.shortName ?? quote.longName ?? quote.symbol,
      type: quote.quoteType,
      currency: quote.currency ?? "USD",
      price: quote.regularMarketPrice,
      change: quote.regularMarketChange ?? null,
      changePercent: quote.regularMarketChangePercent ?? null,
      priceTime: quote.regularMarketTime,
      per: quote.trailingPE ?? null,
      pbr: quote.priceToBook ?? null,
    },
  };
}
