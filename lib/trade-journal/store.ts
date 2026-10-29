import { createClient } from "@/lib/supabase/server";

import type { Trade } from "./positions";
import type { TradeInput } from "./validation";

type TradeRow = {
  id: string;
  symbol: string;
  name: string;
  side: "buy" | "sell";
  source: "turtle" | "manual";
  trade_date: string;
  price: number | string;
  quantity: number | string;
  created_at: string;
};

const COLUMNS = "id, symbol, name, side, source, trade_date, price, quantity, created_at";

function toTrade(row: TradeRow): Trade {
  return {
    id: row.id,
    symbol: row.symbol,
    name: row.name,
    side: row.side,
    source: row.source,
    tradeDate: row.trade_date,
    price: Number(row.price),
    quantity: Number(row.quantity),
    createdAt: row.created_at,
  };
}

function toRow(input: TradeInput) {
  return {
    symbol: input.symbol,
    name: input.name,
    side: input.side,
    source: input.source,
    trade_date: input.tradeDate,
    price: input.price,
    quantity: input.quantity,
  };
}

export type StoreResult<T> = { ok: true; value: T } | { ok: false };

// 소유자 확인은 RLS가 맡는다. 로그인한 사용자의 행만 읽고 쓸 수 있다.
export async function listTrades(symbol?: string): Promise<StoreResult<Trade[]>> {
  const supabase = await createClient();
  let query = supabase.from("trades").select(COLUMNS);
  if (symbol) query = query.eq("symbol", symbol);
  const { data, error } = await query.order("trade_date").order("created_at");
  if (error) return { ok: false };
  return { ok: true, value: (data as TradeRow[]).map(toTrade) };
}

export async function getTrade(id: string): Promise<StoreResult<Trade | null>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("trades").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) return { ok: false };
  return { ok: true, value: data ? toTrade(data as TradeRow) : null };
}

export async function insertTrade(input: TradeInput): Promise<StoreResult<null>> {
  const supabase = await createClient();
  const { error } = await supabase.from("trades").insert(toRow(input));
  return error ? { ok: false } : { ok: true, value: null };
}

export async function updateTrade(id: string, input: TradeInput): Promise<StoreResult<null>> {
  const supabase = await createClient();
  const { error, count } = await supabase.from("trades").update(toRow(input), { count: "exact" }).eq("id", id);
  return error || count === 0 ? { ok: false } : { ok: true, value: null };
}

export async function deleteTrade(id: string): Promise<StoreResult<null>> {
  const supabase = await createClient();
  const { error, count } = await supabase.from("trades").delete({ count: "exact" }).eq("id", id);
  return error || count === 0 ? { ok: false } : { ok: true, value: null };
}
