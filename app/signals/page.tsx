import Link from "next/link";

import { getDailySignals, type DailySignalsResult } from "@/app/signals/data";
import { formatMoney, formatPercent, formatPriceTime } from "@/components/stock-overview/format";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SignalRow } from "@/lib/daily-signals";
import { BACKTEST_YEARS } from "@/lib/turtle";

// 그날 첫 계산은 약 570개 종목의 가격을 받으므로 오래 걸릴 수 있다.
export const maxDuration = 300;

const SOURCE_LABELS: Record<DailySignalsResult["failedSources"][number], string> = {
  sp500: "S&P 500",
  nasdaq100: "나스닥 100",
};

export default async function SignalsPage() {
  let data: DailySignalsResult | null = null;
  try {
    data = await getDailySignals();
  } catch {
    data = null;
  }

  return (
    <div className="flex flex-col gap-6 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">오늘의 신호</h1>
        <p className="text-sm text-muted-foreground">
          S&P 500·나스닥 100 구성 종목과 주요 ETF 중 최근 거래일 종가가 55일 최고가를 넘은 종목입니다.
        </p>
      </div>

      {!data ? (
        <Alert variant="destructive">
          <AlertTitle>신호를 계산하지 못했습니다</AlertTitle>
          <AlertDescription>구성 종목 명단이나 가격을 받지 못했습니다. 잠시 후 새로고침해 주세요.</AlertDescription>
        </Alert>
      ) : (
        <SignalsContent data={data} />
      )}

      <p className="text-xs text-muted-foreground">
        과거 결과이며 앞으로의 수익을 보장하지 않습니다. 수수료와 세금은 넣지 않았습니다.
      </p>
    </div>
  );
}

function SignalsContent({ data }: { data: DailySignalsResult }) {
  return (
    <>
      <dl className="grid grid-cols-2 gap-4 rounded-lg border p-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">기준일</dt>
          <dd className="font-medium tabular-nums">{data.asOf} 종가</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">계산 시각</dt>
          <dd className="font-medium">{formatPriceTime(new Date(data.computedAt))}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">대상 종목</dt>
          <dd className="font-medium tabular-nums">{data.total}개</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">계산하지 못한 종목</dt>
          <dd className="font-medium tabular-nums">{data.failed}개</dd>
        </div>
      </dl>

      {data.failedSources.length > 0 && (
        <Alert>
          <AlertTitle>일부 명단을 받지 못했습니다</AlertTitle>
          <AlertDescription>
            {data.failedSources.map((s) => SOURCE_LABELS[s]).join(", ")} 구성 종목 없이 계산했습니다.
          </AlertDescription>
        </Alert>
      )}

      {data.buySignals.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>매수 신호 {data.buySignals.length}개</CardTitle>
            <CardDescription>거래량이 평소보다 많이 늘어난 종목부터 보여줍니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <SignalList rows={data.buySignals} variant="buy" />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>오늘은 매수 신호가 없습니다</CardTitle>
            <CardDescription>매수 기준가(55일 최고가)에 가장 가까운 종목 10개입니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <SignalList rows={data.nearest} variant="nearest" />
          </CardContent>
        </Card>
      )}
    </>
  );
}

function SignalList({ rows, variant }: { rows: SignalRow[]; variant: "buy" | "nearest" }) {
  return (
    <ul className="flex flex-col divide-y">
      {rows.map((row) => (
        <li key={row.symbol} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Link href={`/stocks/${encodeURIComponent(row.symbol)}`} className="font-medium underline-offset-4 hover:underline">
                  {row.symbol}
                </Link>
                {row.type === "ETF" && <Badge variant="outline">ETF</Badge>}
              </div>
              <p className="truncate text-sm text-muted-foreground">{row.name}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold tabular-nums">
                {variant === "buy" ? formatPercent(row.abovePercent) : `${formatPercent(row.distanceToEntryPercent)} 남음`}
              </p>
              <p className="text-xs text-muted-foreground">{variant === "buy" ? "매수 기준가 돌파" : "매수 기준가까지"}</p>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">종가 · 매수 기준가</dt>
              <dd className="tabular-nums">
                {formatMoney(row.close, "USD")} · {formatMoney(row.entryLevel, "USD")}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">예상 손절 가격 (종가 − 2N)</dt>
              <dd className="tabular-nums">{formatMoney(row.stopEstimate, "USD")}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">거래량 (20일 평균 대비)</dt>
              <dd className="tabular-nums">{row.volumeRatio == null ? "해당 없음" : `${row.volumeRatio.toFixed(2)}배`}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{BACKTEST_YEARS}년 백테스트 · 계속 보유</dt>
              <dd className="tabular-nums">
                {formatPercent(row.strategyReturnPercent)} · {formatPercent(row.buyAndHoldReturnPercent)}
              </dd>
            </div>
          </dl>
        </li>
      ))}
    </ul>
  );
}
