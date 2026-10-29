import Link from "next/link";
import { Suspense } from "react";

import { PriceChart } from "@/components/stock-overview/price-chart";
import { TurtleSection } from "@/components/stock-overview/turtle-section";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatMoney,
  formatPercent,
  formatPriceTime,
  formatRatio,
} from "@/components/stock-overview/format";
import { StockSearch } from "@/components/stock-search";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  PRICE_RANGES,
  getPriceHistory,
  getReturnSince,
  getStockOverview,
  type PriceRange,
  type ReturnResult,
} from "@/lib/market-data";

const RANGE_LABELS: Record<PriceRange, string> = {
  "1m": "1개월",
  "3m": "3개월",
  "6m": "6개월",
  "1y": "1년",
  "5y": "5년",
};

function pickString(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

export default async function StockPage({ params, searchParams }: PageProps<"/stocks/[symbol]">) {
  const symbol = decodeURIComponent((await params).symbol).toUpperCase();
  const query = await searchParams;
  const rangeParam = pickString(query.range);
  const range: PriceRange = PRICE_RANGES.find((r) => r === rangeParam) ?? "1y";
  const from = pickString(query.from);

  const overviewResult = await getStockOverview(symbol);

  if (overviewResult.status !== "ok") {
    return (
      <div className="flex flex-col gap-6 py-8">
        <StockSearch />
        {overviewResult.status === "not-found" ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle>‘{symbol}’ 종목을 찾을 수 없습니다</EmptyTitle>
              <EmptyDescription>티커를 확인하거나 위에서 다시 검색해 주세요.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Alert variant="destructive">
            <AlertTitle>데이터를 가져오지 못했습니다</AlertTitle>
            <AlertDescription>
              Yahoo Finance에서 {symbol} 정보를 받지 못했습니다. 잠시 후 새로고침하거나 다시 검색해 주세요.
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  const overview = overviewResult.overview;
  const [history, returnResult] = await Promise.all([
    getPriceHistory(symbol, range),
    from ? getReturnSince(symbol, from, overview.price) : Promise.resolve(null),
  ]);

  const rangeHref = (r: PriceRange) => {
    const next = new URLSearchParams({ range: r });
    if (from) next.set("from", from);
    return `/stocks/${encodeURIComponent(symbol)}?${next}`;
  };
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-6 py-8">
      <StockSearch />

      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">
          {overview.symbol} · {overview.type === "ETF" ? "ETF" : "주식"}
        </p>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{overview.name}</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>현재가</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{formatMoney(overview.price, overview.currency)}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            기준 시각 {formatPriceTime(overview.priceTime)} (한국 시간)
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>밸류에이션</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-muted-foreground">PER (최근 12개월)</dt>
                <dd className="text-2xl font-semibold tabular-nums">{formatRatio(overview.per)}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">PBR</dt>
                <dd className="text-2xl font-semibold tabular-nums">{formatRatio(overview.pbr)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>고른 날짜부터의 상승률</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form method="get" className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              name="from"
              aria-label="기준 날짜"
              defaultValue={from}
              max={today}
              required
              className="w-auto"
            />
            <input type="hidden" name="range" value={range} />
            <Button type="submit">계산</Button>
          </form>
          <ReturnSummary result={returnResult} chosen={from} currency={overview.currency} />
        </CardContent>
      </Card>

      <Suspense fallback={<Skeleton className="h-96" aria-label="터틀 신호를 계산하는 중" />}>
        <TurtleSection symbol={symbol} currency={overview.currency} />
      </Suspense>

      <Card>
        <CardHeader>
          <CardTitle>기간별 가격</CardTitle>
          <CardDescription>일별 종가</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <nav aria-label="그래프 기간" className="flex flex-wrap gap-2">
            {PRICE_RANGES.map((r) => (
              <Link
                key={r}
                href={rangeHref(r)}
                scroll={false}
                aria-current={r === range ? "page" : undefined}
                className={buttonVariants({ variant: r === range ? "default" : "outline", size: "sm" })}
              >
                {RANGE_LABELS[r]}
              </Link>
            ))}
          </nav>
          {history.status === "ok" && history.points.length > 0 ? (
            <PriceChart points={history.points} />
          ) : history.status === "ok" ? (
            <p className="text-sm text-muted-foreground">이 기간에는 가격 데이터가 없습니다.</p>
          ) : (
            <Alert variant="destructive">
              <AlertTitle>그래프 데이터를 가져오지 못했습니다</AlertTitle>
              <AlertDescription>잠시 후 새로고침하거나 다른 기간을 골라 주세요.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ReturnSummary({
  result,
  chosen,
  currency,
}: {
  result: ReturnResult | null;
  chosen: string | undefined;
  currency: string;
}) {
  if (!result) {
    return <p className="text-sm text-muted-foreground">날짜를 고르면 그 날짜 종가 대비 현재가 상승률을 보여줍니다.</p>;
  }
  switch (result.status) {
    case "ok":
      return (
        <div className="flex flex-col gap-1">
          <p className="text-3xl font-semibold tabular-nums">{formatPercent(result.changePercent)}</p>
          <p className="text-sm text-muted-foreground">
            기준: {result.baseDate} 종가 {formatMoney(result.basePrice, currency)}
            {result.baseDate !== chosen && ` · 고른 날짜(${chosen})가 휴장일이라 직전 거래일 기준`}
          </p>
        </div>
      );
    case "future":
      return <p className="text-sm text-muted-foreground">미래 날짜는 계산할 수 없습니다. 오늘 이전 날짜를 골라 주세요.</p>;
    case "no-data":
      return <p className="text-sm text-muted-foreground">그 날짜에는 가격 데이터가 없습니다. 상장 전 날짜인지 확인해 주세요.</p>;
    case "invalid-date":
      return <p className="text-sm text-muted-foreground">날짜 형식이 올바르지 않습니다. 다시 골라 주세요.</p>;
    case "error":
      return (
        <Alert variant="destructive">
          <AlertTitle>상승률을 계산하지 못했습니다</AlertTitle>
          <AlertDescription>가격 데이터를 받지 못했습니다. 잠시 후 다시 시도해 주세요.</AlertDescription>
        </Alert>
      );
  }
}
