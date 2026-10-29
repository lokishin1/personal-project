export type TradeSide = "buy" | "sell";

export type Trade = {
  id: string;
  symbol: string;
  name: string;
  side: TradeSide;
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

    for (const t of list) {
      if (t.side === "buy") {
        quantity += t.quantity;
        costTotal += t.price * t.quantity;
        continue;
      }
      // 부동소수 오차로 전량 매도가 막히지 않도록 아주 작은 차이는 허용한다.
      if (t.quantity > quantity + 1e-9) return { status: "oversold", symbol, tradeDate: t.tradeDate };
      const averageCost = costTotal / quantity;
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
      trades: list,
    });
  }
  return { status: "ok", positions };
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
