/** 터틀 규칙(55일 최고가 돌파 매수, 20일 최저가 이탈 또는 2N 손절 매도). 용어는 GLOSSARY.md를 따른다. */
export const ENTRY_LOOKBACK = 55;
export const EXIT_LOOKBACK = 20;
export const N_PERIOD = 20;
export const STOP_N_MULTIPLE = 2;

export type TurtleBar = {
  /** YYYY-MM-DD (거래일) */
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type TurtleSignal = {
  asOf: string;
  close: number;
  /** 직전 55거래일 최고가. 종가가 이보다 높으면 매수 신호 */
  entryLevel: number;
  /** 직전 20거래일 최저가. 보유 중 종가가 이보다 낮으면 매도 신호 */
  exitLevel: number;
  buySignal: boolean;
  /** 종가가 매수 기준가까지 몇 % 남았는지. 이미 넘었으면 0 이하 */
  distanceToEntryPercent: number;
  n: number;
  /** 최근 거래일 거래량 ÷ 직전 20거래일 평균 거래량 */
  volumeRatio: number | null;
};

export type ExitReason = "exit-level" | "stop";

export type BacktestTrade = {
  entryDate: string;
  entryPrice: number;
  stopPrice: number;
  exitDate: string;
  exitPrice: number;
  returnPercent: number;
  reason: ExitReason;
};

export type OpenTrade = {
  entryDate: string;
  entryPrice: number;
  stopPrice: number;
  /** 최근 종가 기준 */
  returnPercent: number;
  /** 최근 거래일에 매도 신호가 났는지 */
  sellSignal: boolean;
};

export type Backtest = {
  periodStart: string;
  periodEnd: string;
  trades: BacktestTrade[];
  openTrade: OpenTrade | null;
  /** 끝난 거래와 진행 중인 거래(최근 종가 기준)를 복리로 이은 수익률 */
  strategyReturnPercent: number;
  /** 기간 첫 거래일 종가부터 최근 종가까지 계속 보유했을 때 */
  buyAndHoldReturnPercent: number;
};

export type TurtleResult = { status: "ok"; signal: TurtleSignal; backtest: Backtest } | { status: "insufficient" };

function maxHigh(bars: TurtleBar[], from: number, to: number): number {
  let value = -Infinity;
  for (let i = from; i < to; i++) value = Math.max(value, bars[i].high);
  return value;
}

function minLow(bars: TurtleBar[], from: number, to: number): number {
  let value = Infinity;
  for (let i = from; i < to; i++) value = Math.min(value, bars[i].low);
  return value;
}

function trueRange(bars: TurtleBar[], i: number): number {
  const bar = bars[i];
  if (i === 0) return bar.high - bar.low;
  const prevClose = bars[i - 1].close;
  return Math.max(bar.high - bar.low, Math.abs(bar.high - prevClose), Math.abs(bar.low - prevClose));
}

/** i번째 거래일까지 최근 20거래일 진폭의 단순 평균 */
function averageTrueRange(bars: TurtleBar[], i: number): number {
  const from = Math.max(0, i - N_PERIOD + 1);
  let sum = 0;
  for (let k = from; k <= i; k++) sum += trueRange(bars, k);
  return sum / (i - from + 1);
}

/**
 * bars는 거래일 순서여야 한다. periodStart(YYYY-MM-DD) 이후 거래일에 대해 백테스트한다.
 * 신호가 난 다음 거래일 시가에 사고판다.
 */
export function analyzeTurtle(bars: TurtleBar[], periodStart: string): TurtleResult {
  const last = bars.length - 1;
  if (last < ENTRY_LOOKBACK) return { status: "insufficient" };

  const lastBar = bars[last];
  const entryLevel = maxHigh(bars, last - ENTRY_LOOKBACK, last);
  const exitLevel = minLow(bars, last - EXIT_LOOKBACK, last);
  let volumeSum = 0;
  for (let i = last - EXIT_LOOKBACK; i < last; i++) volumeSum += bars[i].volume;
  const averageVolume = volumeSum / EXIT_LOOKBACK;

  const signal: TurtleSignal = {
    asOf: lastBar.date,
    close: lastBar.close,
    entryLevel,
    exitLevel,
    buySignal: lastBar.close > entryLevel,
    distanceToEntryPercent: (entryLevel / lastBar.close - 1) * 100,
    n: averageTrueRange(bars, last),
    volumeRatio: averageVolume > 0 ? lastBar.volume / averageVolume : null,
  };

  // 기준가를 계산할 수 있는 첫 거래일부터 시작한다.
  let start = bars.findIndex((bar) => bar.date >= periodStart);
  if (start === -1) start = last;
  start = Math.max(start, ENTRY_LOOKBACK);

  const trades: BacktestTrade[] = [];
  let position: { entryIndex: number; entryPrice: number; stopPrice: number } | null = null;
  let pendingEntry: { stopN: number } | null = null;
  let openSellSignal = false;

  for (let i = start; i <= last; i++) {
    const bar = bars[i];

    // 전날 신호에 따라 오늘 시가에 산다.
    if (pendingEntry) {
      position = { entryIndex: i, entryPrice: bar.open, stopPrice: bar.open - STOP_N_MULTIPLE * pendingEntry.stopN };
      pendingEntry = null;
    }

    if (position) {
      const hitStop = bar.close < position.stopPrice;
      const hitExit = bar.close < minLow(bars, i - EXIT_LOOKBACK, i);
      if (hitStop || hitExit) {
        if (i === last) {
          openSellSignal = true;
        } else {
          const exitPrice = bars[i + 1].open;
          trades.push({
            entryDate: bars[position.entryIndex].date,
            entryPrice: position.entryPrice,
            stopPrice: position.stopPrice,
            exitDate: bars[i + 1].date,
            exitPrice,
            returnPercent: (exitPrice / position.entryPrice - 1) * 100,
            reason: hitStop ? "stop" : "exit-level",
          });
          position = null;
        }
      }
      continue;
    }

    if (i < last && bar.close > maxHigh(bars, i - ENTRY_LOOKBACK, i)) {
      pendingEntry = { stopN: averageTrueRange(bars, i) };
    }
  }

  const openTrade: OpenTrade | null = position
    ? {
        entryDate: bars[position.entryIndex].date,
        entryPrice: position.entryPrice,
        stopPrice: position.stopPrice,
        returnPercent: (lastBar.close / position.entryPrice - 1) * 100,
        sellSignal: openSellSignal,
      }
    : null;

  let growth = 1;
  for (const t of trades) growth *= 1 + t.returnPercent / 100;
  if (openTrade) growth *= 1 + openTrade.returnPercent / 100;

  return {
    status: "ok",
    signal,
    backtest: {
      periodStart: bars[start].date,
      periodEnd: lastBar.date,
      trades,
      openTrade,
      strategyReturnPercent: (growth - 1) * 100,
      buyAndHoldReturnPercent: (lastBar.close / bars[start].close - 1) * 100,
    },
  };
}
