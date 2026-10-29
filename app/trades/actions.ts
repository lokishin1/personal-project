"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getVerifiedUserId } from "@/lib/supabase/server";
import { checkTradeChange, parseTradeInput, type Trade } from "@/lib/trade-journal";
import { deleteTrade, getTrade, insertTrade, listTrades, updateTrade } from "@/lib/trade-journal/store";

export type TradeFormValues = { side?: string; source?: string; tradeDate?: string; price?: string; quantity?: string };

/** 오류가 나면 입력값을 돌려준다. 폼 액션은 제출 뒤 입력을 초기화하기 때문이다. */
export type TradeFormState = { error: string | null; savedAt?: number; values?: TradeFormValues };

function readForm(formData: FormData) {
  const get = (key: string) => formData.get(key)?.toString();
  return {
    symbol: get("symbol"),
    name: get("name"),
    side: get("side"),
    source: get("source"),
    tradeDate: get("tradeDate"),
    price: get("price"),
    quantity: get("quantity"),
  };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const SAVE_FAILED = "저장하지 못했습니다. 잠시 후 다시 시도해 주세요.";

export async function addTradeAction(_prev: TradeFormState, formData: FormData): Promise<TradeFormState> {
  if (!(await getVerifiedUserId())) redirect("/login?next=/trades");

  const parsed = parseTradeInput(readForm(formData), today());
  if (!parsed.ok) return { error: parsed.error, values: readForm(formData) };

  const existing = await listTrades(parsed.value.symbol);
  if (!existing.ok) return { error: SAVE_FAILED, values: readForm(formData) };

  const draft: Trade = { ...parsed.value, id: "new", createdAt: new Date().toISOString() };
  const check = checkTradeChange(existing.value, { type: "add", trade: draft });
  if (!check.ok) return { error: check.error, values: readForm(formData) };

  const saved = await insertTrade(parsed.value);
  if (!saved.ok) return { error: SAVE_FAILED, values: readForm(formData) };

  revalidatePath("/trades");
  return { error: null, savedAt: Date.now() };
}

export async function updateTradeAction(
  id: string,
  _prev: TradeFormState,
  formData: FormData,
): Promise<TradeFormState> {
  if (!(await getVerifiedUserId())) redirect("/login?next=/trades");

  const current = await getTrade(id);
  if (!current.ok) return { error: SAVE_FAILED };
  if (!current.value) return { error: "이 매매 기록을 찾을 수 없습니다." };

  // 종목은 바꾸지 않는다. 다른 종목이면 삭제 후 새로 입력한다.
  const raw = { ...readForm(formData), symbol: current.value.symbol, name: current.value.name };
  const parsed = parseTradeInput(raw, today());
  if (!parsed.ok) return { error: parsed.error, values: readForm(formData) };

  const existing = await listTrades(current.value.symbol);
  if (!existing.ok) return { error: SAVE_FAILED, values: readForm(formData) };

  const check = checkTradeChange(existing.value, { type: "update", trade: { ...current.value, ...parsed.value } });
  if (!check.ok) return { error: check.error, values: readForm(formData) };

  const saved = await updateTrade(id, parsed.value);
  if (!saved.ok) return { error: SAVE_FAILED, values: readForm(formData) };

  revalidatePath("/trades");
  redirect("/trades");
}

export async function deleteTradeAction(id: string, _prev: TradeFormState): Promise<TradeFormState> {
  if (!(await getVerifiedUserId())) redirect("/login?next=/trades");

  const current = await getTrade(id);
  if (!current.ok) return { error: SAVE_FAILED };
  if (!current.value) return { error: "이 매매 기록을 찾을 수 없습니다." };

  const existing = await listTrades(current.value.symbol);
  if (!existing.ok) return { error: SAVE_FAILED };

  const check = checkTradeChange(existing.value, { type: "delete", id });
  if (!check.ok) return { error: check.error };

  const deleted = await deleteTrade(id);
  if (!deleted.ok) return { error: "삭제하지 못했습니다. 잠시 후 다시 시도해 주세요." };

  revalidatePath("/trades");
  return { error: null };
}
