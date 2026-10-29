import { summarizePositions, type Trade, type TradeSide } from "./positions";

export type TradeInput = {
  symbol: string;
  name: string;
  side: TradeSide;
  tradeDate: string;
  price: number;
  quantity: number;
};

export type RawTradeInput = Record<keyof TradeInput, string | undefined | null>;

export type ParseResult = { ok: true; value: TradeInput } | { ok: false; error: string };

function isValidDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** 폼 입력을 검증한다. today는 YYYY-MM-DD */
export function parseTradeInput(raw: RawTradeInput, today: string): ParseResult {
  const symbol = raw.symbol?.trim().toUpperCase() ?? "";
  if (!symbol) return { ok: false, error: "종목을 골라 주세요." };

  const side = raw.side;
  if (side !== "buy" && side !== "sell") return { ok: false, error: "매수 또는 매도를 골라 주세요." };

  const tradeDate = raw.tradeDate?.trim() ?? "";
  if (!isValidDay(tradeDate)) return { ok: false, error: "거래일을 올바르게 입력해 주세요." };
  if (tradeDate > today) return { ok: false, error: "미래 날짜는 입력할 수 없습니다." };

  const price = Number(raw.price);
  if (!Number.isFinite(price) || price <= 0) return { ok: false, error: "가격은 0보다 커야 합니다." };

  const quantity = Number(raw.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) return { ok: false, error: "수량은 0보다 커야 합니다." };

  return {
    ok: true,
    value: { symbol, name: raw.name?.trim() || symbol, side, tradeDate, price, quantity },
  };
}

export type TradeChange =
  | { type: "add"; trade: Trade }
  | { type: "update"; trade: Trade }
  | { type: "delete"; id: string };

/** 변경을 적용했을 때 어느 시점에서도 보유 수량이 음수가 되지 않는지 확인한다. */
export function checkTradeChange(existing: Trade[], change: TradeChange): { ok: true } | { ok: false; error: string } {
  const next =
    change.type === "add"
      ? [...existing, change.trade]
      : change.type === "update"
        ? existing.map((t) => (t.id === change.trade.id ? change.trade : t))
        : existing.filter((t) => t.id !== change.id);

  const result = summarizePositions(next);
  if (result.status === "oversold") {
    return { ok: false, error: `${result.tradeDate} 기준 ${result.symbol} 보유 수량보다 많이 팔 수 없습니다.` };
  }
  return { ok: true };
}
