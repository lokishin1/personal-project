"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import type { SearchResult, SecurityCandidate } from "@/lib/market-data";

type SearchState = "idle" | "loading" | "done" | "error";

// Yahoo 요청 제한을 피하려고 입력이 멈춘 뒤에만 검색한다.
const DEBOUNCE_MS = 350;

export function StockSearch({
  autoFocus = false,
  onSelect,
}: {
  autoFocus?: boolean;
  /** 주면 종목 화면으로 이동하지 않고 고른 종목을 넘겨준다. */
  onSelect?: (candidate: SecurityCandidate | null) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<SecurityCandidate[]>([]);
  const [state, setState] = useState<SearchState>("idle");

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setState("loading");
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        const result = (await response.json()) as SearchResult;
        if (result.status !== "ok") throw new Error("search failed");
        setCandidates(result.candidates);
        setState("done");
      } catch {
        if (controller.signal.aborted) return;
        setCandidates([]);
        setState("error");
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const statusMessage =
    state === "loading"
      ? "검색 중…"
      : state === "error"
        ? "검색하지 못했습니다. 잠시 후 다시 입력해 주세요."
        : state === "done"
          ? "검색 결과가 없습니다. 티커나 영문 회사명으로 입력해 주세요."
          : "티커나 영문 회사명을 입력하세요.";

  return (
    <Combobox<SecurityCandidate>
      items={candidates}
      filter={null}
      inputValue={query}
      onInputValueChange={(value) => {
        setQuery(value);
        if (!value.trim()) {
          setCandidates([]);
          setState("idle");
        }
      }}
      itemToStringLabel={(item) => item.symbol}
      isItemEqualToValue={(item, value) => item.symbol === value.symbol}
      onValueChange={(item) => {
        if (onSelect) onSelect(item);
        else if (item) router.push(`/stocks/${encodeURIComponent(item.symbol)}`);
      }}
    >
      <ComboboxInput
        aria-label="종목 검색"
        placeholder="티커 또는 영문 회사명 (예: TSLA, tesla)"
        showTrigger={false}
        autoFocus={autoFocus}
        className="w-full"
      />
      <ComboboxContent>
        <ComboboxEmpty>{statusMessage}</ComboboxEmpty>
        <ComboboxList>
          {(item: SecurityCandidate) => (
            <ComboboxItem key={item.symbol} value={item}>
              <span className="font-medium">{item.symbol}</span>
              <span className="truncate text-muted-foreground">{item.name}</span>
              <span className="ml-auto text-xs text-muted-foreground">{item.type === "ETF" ? "ETF" : "주식"}</span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
