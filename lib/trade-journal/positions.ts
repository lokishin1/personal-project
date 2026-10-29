export type TradeSide = "buy" | "sell";

/** 매매가 어떤 판단에서 나왔는지. GLOSSARY.md의 "출처" */
export type TradeSource = "turtle" | "manual";

export type Trade = {
  id: string;
  symbol: string;
  name: string;
  side: TradeSide;
  source: TradeSource;
  /** YYYY-MM-DD */
  tradeDate: string;
  price: number;
  quantity: number;
  /** 같은 날 여러 건이면 입력 순서대로 계산한다. */
  createdAt: string;
};

export type Position = {
  symbol: string;
  name: string;
  /** 현재 보유 수량. 전량 매도하면 0 */
  quantity: number;
  /** 보유분의 평균단가. 보유 수량이 0이면 null */
  averageCost: number | null;
  /** 매도로 확정된 손익 합계 */
  realizedPnl: number;
  /** 매도한 수량의 평균단가 기준 원가 합계 (실현 수익률 계산용) */
  realizedCostBasis: number;
  /** 매도 건수와, 그 시점 평균단가보다 비싸게 판 건수 */
  sellCount: number;
  winningSells: number;
  /** 가장 최근 매수일(YYYY-MM-DD). 매수가 없으면 null */
  lastBuyDate: string | null;
  /** 거래일·입력 순 매매 내역 */
  trades: Trade[];
};

export type PositionsResult =
  | { status: "ok"; positions: Position[] }
  | { status: "oversold"; symbol: string; tradeDate: string };

export function compareTrades(a: Trade, b: Trade): number {
  if (a.tradeDate !== b.tradeDate) return a.tradeDate < b.tradeDate ? -1 : 1;
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
  return 0;
}

export function summarizePositions(trades: Trade[]): PositionsResult {
  const bySymbol = new Map<string, Trade[]>();
  for (const t of [...trades].sort(compareTrades)) {
    const list = bySymbol.get(t.symbol) ?? [];
    list.push(t);
    bySymbol.set(t.symbol, list);
  }

  const positions: Position[] = [];
  for (const [symbol, list] of bySymbol) {
    let quantity = 0;
    let costTotal = 0;
    let realizedPnl = 0;
    let realizedCostBasis = 0;
    let sellCount = 0;
    let winningSells = 0;
    let lastBuyDate: string | null = null;

    for (const t of list) {
      if (t.side === "buy") {
        quantity += t.quantity;
        costTotal += t.price * t.quantity;
        lastBuyDate = t.tradeDate;
        continue;
      }
      // 부동소수 오차로 전량 매도가 막히지 않도록 아주 작은 차이는 허용한다.
      if (t.quantity > quantity + 1e-9) return { status: "oversold", symbol, tradeDate: t.tradeDate };
      const averageCost = costTotal / quantity;
      sellCount++;
      if (t.price > averageCost) winningSells++;
      realizedPnl += (t.price - averageCost) * t.quantity;
      realizedCostBasis += averageCost * t.quantity;
      quantity -= t.quantity;
      costTotal -= averageCost * t.quantity;
      if (quantity < 1e-9) {
        quantity = 0;
        costTotal = 0;
      }
    }

    positions.push({
      symbol,
      name: list.at(-1)!.name,
      quantity,
      averageCost: quantity > 0 ? costTotal / quantity : null,
      realizedPnl,
      realizedCostBasis,
      sellCount,
      winningSells,
      lastBuyDate,
      trades: list,
    });
  }
  return { status: "ok", positions };
}

export type TurtleSummary = {
  tradeCount: number;
  sellCount: number;
  winningSells: number;
  realizedPnl: number;
  /** 매도한 터틀 수량의 평균단가 대비 수익률. 터틀 매도가 없으면 null */
  realizedPercent: number | null;
  /** 터틀 매매로 지금 보유 중인 종목 */
  openPositions: Position[];
};

/** 출처가 터틀 신호인 매매만 모아 따로 계산한다. 터틀 매도 수량 검사는 checkTradeChange가 맡는다. */
export function summarizeTurtleTrades(trades: Trade[]): TurtleSummary {
  const turtle = trades.filter((t) => t.source === "turtle");
  const result = summarizePositions(turtle);
  const positions = result.status === "ok" ? result.positions : [];

  let realizedPnl = 0;
  let realizedCostBasis = 0;
  let sellCount = 0;
  let winningSells = 0;
  for (const p of positions) {
    realizedPnl += p.realizedPnl;
    realizedCostBasis += p.realizedCostBasis;
    sellCount += p.sellCount;
    winningSells += p.winningSells;
  }

  return {
    tradeCount: turtle.length,
    sellCount,
    winningSells,
    realizedPnl,
    realizedPercent: realizedCostBasis > 0 ? (realizedPnl / realizedCostBasis) * 100 : null,
    openPositions: positions.filter((p) => p.quantity > 0),
  };
}

export type PositionEvaluation = {
  /** 현재가 기준 평가 손익. 현재가가 없거나 보유 수량이 0이면 null */
  unrealizedPnl: number | null;
  unrealizedPercent: number | null;
  /** 매도분 평균단가 대비 수익률. 매도한 적이 없으면 null */
  realizedPercent: number | null;
};

export function evaluatePosition(position: Position, currentPrice: number | null): PositionEvaluation {
  const canEvaluate = currentPrice != null && position.quantity > 0 && position.averageCost != null;
  return {
    unrealizedPnl: canEvaluate ? (currentPrice - position.averageCost!) * position.quantity : null,
    unrealizedPercent: canEvaluate ? ((currentPrice - position.averageCost!) / position.averageCost!) * 100 : null,
    realizedPercent: position.realizedCostBasis > 0 ? (position.realizedPnl / position.realizedCostBasis) * 100 : null,
  };
}
