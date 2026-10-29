"use client";

import { useActionState } from "react";

import { deleteTradeAction, type TradeFormState } from "@/app/trades/actions";
import { Button } from "@/components/ui/button";

const initialState: TradeFormState = { error: null };

export function DeleteTradeButton({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState(deleteTradeAction.bind(null, id), initialState);

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {pending ? "삭제 중…" : "삭제"}
      </Button>
      {state.error && <p className="max-w-56 text-right text-xs text-destructive">{state.error}</p>}
    </form>
  );
}
