"use client";

import { useActionState, useState } from "react";

import type { TradeFormState } from "@/app/trades/actions";
import { StockSearch } from "@/components/stock-search";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { SecurityCandidate } from "@/lib/market-data";
import type { Trade } from "@/lib/trade-journal";

const initialState: TradeFormState = { error: null };

type TradeFormProps = {
  action: (prev: TradeFormState, formData: FormData) => Promise<TradeFormState>;
  submitLabel: string;
  /** 수정할 때 넘긴다. 종목은 바꿀 수 없다. */
  trade?: Trade;
};

export function TradeForm({ action, submitLabel, trade }: TradeFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [security, setSecurity] = useState<SecurityCandidate | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const values = state.error ? state.values : undefined;

  return (
    <form action={formAction} key={state.savedAt ?? JSON.stringify(values ?? {})}>
      <FieldGroup>
        {trade ? (
          <Field>
            <FieldLabel>종목</FieldLabel>
            <p className="font-medium">
              {trade.symbol} <span className="font-normal text-muted-foreground">{trade.name}</span>
            </p>
          </Field>
        ) : (
          <Field>
            <FieldLabel>종목</FieldLabel>
            <StockSearch onSelect={setSecurity} />
            <input type="hidden" name="symbol" value={security?.symbol ?? ""} />
            <input type="hidden" name="name" value={security?.name ?? ""} />
            <FieldDescription>
              {security ? `${security.symbol} · ${security.name}` : "티커나 영문 회사명으로 찾아서 고르세요."}
            </FieldDescription>
          </Field>
        )}

        <FieldSet>
          <FieldLegend variant="label">구분</FieldLegend>
          <RadioGroup name="side" defaultValue={values?.side ?? trade?.side ?? "buy"} className="flex gap-6">
            <Field orientation="horizontal">
              <RadioGroupItem value="buy" id="side-buy" aria-label="매수" />
              <FieldLabel htmlFor="side-buy">매수</FieldLabel>
            </Field>
            <Field orientation="horizontal">
              <RadioGroupItem value="sell" id="side-sell" aria-label="매도" />
              <FieldLabel htmlFor="side-sell">매도</FieldLabel>
            </Field>
          </RadioGroup>
        </FieldSet>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="tradeDate">거래일</FieldLabel>
            <Input id="tradeDate" name="tradeDate" type="date" max={today} defaultValue={values?.tradeDate ?? trade?.tradeDate ?? today} required />
          </Field>
          <Field>
            <FieldLabel htmlFor="price">체결 가격 (USD)</FieldLabel>
            <Input id="price" name="price" type="number" inputMode="decimal" step="any" min="0" defaultValue={values?.price ?? trade?.price} required />
          </Field>
          <Field>
            <FieldLabel htmlFor="quantity">수량</FieldLabel>
            <Input id="quantity" name="quantity" type="number" inputMode="decimal" step="any" min="0" defaultValue={values?.quantity ?? trade?.quantity} required />
          </Field>
        </div>

        {state.error && <FieldError>{state.error}</FieldError>}
        {state.savedAt && !state.error && <FieldDescription>저장했습니다.</FieldDescription>}

        <Button type="submit" disabled={pending} className="self-start">
          {pending ? "저장 중…" : submitLabel}
        </Button>
      </FieldGroup>
    </form>
  );
}
