import { yahoo } from "./yahoo";

export const PRICE_RANGES = ["1m", "3m", "6m", "1y", "5y"] as const;
export type PriceRange = (typeof PRICE_RANGES)[number];

const RANGE_MONTHS: Record<PriceRange, number> = { "1m": 1, "3m": 3, "6m": 6, "1y": 12, "5y": 60 };

export type PricePoint = { date: string; close: number };

export type HistoryResult = { status: "ok"; points: PricePoint[] } | { status: "error" };

export type ReturnResult =
  | { status: "ok"; baseDate: string; basePrice: number; changePercent: number }
  | { status: "future" }
  | { status: "no-data" }
  | { status: "invalid-date" }
  | { status: "error" };

type Bar = { date: Date; close: number | null };

// 일별 봉의 시각은 미국장 개장 시각(UTC 13:30/14:30)이라 UTC 날짜가 거래일과 같다.
function toDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseDay(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && toDay(date) === value ? date : null;
}

function isNoDataError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : "";
  return message.includes("Data doesn't exist") || message.includes("No data found");
}

async function fetchDailyBars(symbol: string, period1: string, period2?: string): Promise<Bar[]> {
  // period2를 undefined로 넘기면 yahoo-finance2 옵션 검증에서 실패하므로 값이 있을 때만 넣는다.
  const result = await yahoo.chart(symbol.toUpperCase(), {
    period1,
    ...(period2 ? { period2 } : {}),
    interval: "1d",
  });
  return result.quotes as Bar[];
}

export async function getPriceHistory(symbol: string, range: PriceRange): Promise<HistoryResult> {
  const from = new Date();
  from.setUTCMonth(from.getUTCMonth() - RANGE_MONTHS[range]);

  let bars: Bar[];
  try {
    bars = await fetchDailyBars(symbol, toDay(from));
  } catch {
    return { status: "error" };
  }

  const points: PricePoint[] = [];
  for (const bar of bars) {
    if (bar.close != null) points.push({ date: toDay(bar.date), close: bar.close });
  }
  return { status: "ok", points };
}

export async function getReturnSince(
  symbol: string,
  day: string,
  currentPrice: number,
): Promise<ReturnResult> {
  const chosen = parseDay(day);
  if (!chosen) return { status: "invalid-date" };
  if (day > toDay(new Date())) return { status: "future" };

  // 휴장일이 이어져도 직전 거래일이 들어오도록 열흘 앞부터 받는다.
  const from = new Date(chosen);
  from.setUTCDate(from.getUTCDate() - 10);
  const to = new Date(chosen);
  to.setUTCDate(to.getUTCDate() + 1);

  let bars: Bar[];
  try {
    bars = await fetchDailyBars(symbol, toDay(from), toDay(to));
  } catch (error) {
    return isNoDataError(error) ? { status: "no-data" } : { status: "error" };
  }

  const base = bars.filter((bar) => bar.close != null && toDay(bar.date) <= day).at(-1);
  if (!base || base.close == null) return { status: "no-data" };

  return {
    status: "ok",
    baseDate: toDay(base.date),
    basePrice: base.close,
    changePercent: ((currentPrice - base.close) / base.close) * 100,
  };
}

export type DailyBar = { date: string; open: number; high: number; low: number; close: number; volume: number };

export type DailyBarsResult = { status: "ok"; bars: DailyBar[] } | { status: "error" };

type FullBar = { date: Date; open: number | null; high: number | null; low: number | null; close: number | null; volume: number | null };

/** period1(YYYY-MM-DD)부터 최근까지의 일별 시가·고가·저가·종가·거래량 */
export async function getDailyBars(symbol: string, period1: string): Promise<DailyBarsResult> {
  let quotes: FullBar[];
  try {
    quotes = (await fetchDailyBars(symbol, period1)) as unknown as FullBar[];
  } catch {
    return { status: "error" };
  }

  const bars: DailyBar[] = [];
  for (const q of quotes) {
    if (q.open == null || q.high == null || q.low == null || q.close == null) continue;
    bars.push({ date: toDay(q.date), open: q.open, high: q.high, low: q.low, close: q.close, volume: q.volume ?? 0 });
  }
  return { status: "ok", bars };
}
