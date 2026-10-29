import type { UniverseMember } from "@/lib/signal-universe";
import { analyzeTurtle, STOP_N_MULTIPLE, type TurtleBar } from "@/lib/turtle";

export type SignalRow = {
  symbol: string;
  name: string;
  type: UniverseMember["type"];
  close: number;
  entryLevel: number;
  /** 종가가 매수 기준가를 넘은 폭(%). 신호가 없으면 음수 */
  abovePercent: number;
  /** 매수 기준가까지 남은 %(신호 없는 종목용) */
  distanceToEntryPercent: number;
  n: number;
  /** 종가에 샀다고 보고 계산한 손절 가격(종가 − 2N). 실제 손절은 다음 날 시가 기준이다 */
  stopEstimate: number;
  volumeRatio: number | null;
  strategyReturnPercent: number;
  buyAndHoldReturnPercent: number;
};

export type DailySignals = {
  /** 대부분의 종목이 가진 최근 거래일 */
  asOf: string | null;
  computedAt: string;
  total: number;
  /** 가격을 받지 못했거나, 기록이 짧거나, 최근 거래일이 다른 종목 수 */
  failed: number;
  buySignals: SignalRow[];
  /** 매수 신호가 하나도 없을 때만 채운다 */
  nearest: SignalRow[];
};

export type ScanOptions = {
  members: UniverseMember[];
  getBars: (symbol: string) => Promise<TurtleBar[] | null>;
  /** 백테스트 시작일(YYYY-MM-DD) */
  periodStart: string;
  concurrency?: number;
};

const NEAREST_COUNT = 10;

async function mapWithLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function mostCommon(values: string[]): string | null {
  const counts = new Map<string, number>();
  let best: string | null = null;
  for (const value of values) {
    const count = (counts.get(value) ?? 0) + 1;
    counts.set(value, count);
    if (best == null || count > counts.get(best)!) best = value;
  }
  return best;
}

export async function scanDailySignals({ members, getBars, periodStart, concurrency = 6 }: ScanOptions): Promise<DailySignals> {
  const analyzed = await mapWithLimit(members, concurrency, async (member) => {
    try {
      const bars = await getBars(member.symbol);
      if (!bars) return null;
      const result = analyzeTurtle(bars, periodStart);
      return result.status === "ok" ? { member, result } : null;
    } catch {
      return null;
    }
  });

  const ok = analyzed.filter((item) => item != null);
  const asOf = mostCommon(ok.map((item) => item.result.signal.asOf));
  const current = ok.filter((item) => item.result.signal.asOf === asOf);

  const rows = current.map(({ member, result }) => {
    const { signal, backtest } = result;
    const row: SignalRow = {
      symbol: member.symbol,
      name: member.name,
      type: member.type,
      close: signal.close,
      entryLevel: signal.entryLevel,
      abovePercent: (signal.close / signal.entryLevel - 1) * 100,
      distanceToEntryPercent: signal.distanceToEntryPercent,
      n: signal.n,
      stopEstimate: signal.close - STOP_N_MULTIPLE * signal.n,
      volumeRatio: signal.volumeRatio,
      strategyReturnPercent: backtest.strategyReturnPercent,
      buyAndHoldReturnPercent: backtest.buyAndHoldReturnPercent,
    };
    return { row, buySignal: signal.buySignal };
  });

  const buySignals = rows
    .filter((item) => item.buySignal)
    .map((item) => item.row)
    .sort((a, b) => (b.volumeRatio ?? 0) - (a.volumeRatio ?? 0));
  const nearest =
    buySignals.length > 0
      ? []
      : rows
          .map((item) => item.row)
          .sort((a, b) => a.distanceToEntryPercent - b.distanceToEntryPercent)
          .slice(0, NEAREST_COUNT);

  return {
    asOf,
    computedAt: new Date().toISOString(),
    total: members.length,
    failed: members.length - current.length,
    buySignals,
    nearest,
  };
}
