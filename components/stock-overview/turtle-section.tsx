import { formatMoney, formatPercent } from "@/components/stock-overview/format";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDailyBars } from "@/lib/market-data";
import { analyzeTurtle, type BacktestTrade } from "@/lib/turtle";

const BACKTEST_YEARS = 3;
// 백테스트 첫날 앞의 55거래일을 넉넉히 덮는다.
const LOOKBACK_EXTRA_MONTHS = 4;
const HIGH_VOLUME_RATIO = 1.5;

function yearsAgo(years: number, extraMonths = 0): string {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() - years);
  date.setUTCMonth(date.getUTCMonth() - extraMonths);
  return date.toISOString().slice(0, 10);
}

const REASON_LABELS: Record<BacktestTrade["reason"], string> = {
  "exit-level": "20일 최저가 이탈",
  stop: "손절",
};

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
      {note && <dd className="text-xs text-muted-foreground">{note}</dd>}
    </div>
  );
}

export async function TurtleSection({ symbol, currency }: { symbol: string; currency: string }) {
  const bars = await getDailyBars(symbol, yearsAgo(BACKTEST_YEARS, LOOKBACK_EXTRA_MONTHS));
  const result = bars.status === "ok" ? analyzeTurtle(bars.bars, yearsAgo(BACKTEST_YEARS)) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>터틀 신호</CardTitle>
        <CardDescription>55일 최고가를 넘으면 매수, 20일 최저가를 깨거나 매수가 − 2N(손절 가격) 아래로 내려가면 매도합니다.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {!result ? (
          <Alert variant="destructive">
            <AlertTitle>터틀 신호를 계산하지 못했습니다</AlertTitle>
            <AlertDescription>가격 기록을 받지 못했습니다. 잠시 후 새로고침해 주세요.</AlertDescription>
          </Alert>
        ) : result.status === "insufficient" ? (
          <p className="text-sm text-muted-foreground">
            상장한 지 55거래일이 지나지 않아 기준가를 계산할 수 없습니다.
          </p>
        ) : (
          <TurtleDetails result={result} currency={currency} />
        )}
        <p className="text-xs text-muted-foreground">
          과거 결과이며 앞으로의 수익을 보장하지 않습니다. 수수료와 세금은 넣지 않았습니다.
        </p>
      </CardContent>
    </Card>
  );
}

function TurtleDetails({
  result,
  currency,
}: {
  result: Extract<ReturnType<typeof analyzeTurtle>, { status: "ok" }>;
  currency: string;
}) {
  const { signal, backtest } = result;
  const open = backtest.openTrade;
  const wins = backtest.trades.filter((t) => t.returnPercent > 0).length;
  const highVolume = signal.volumeRatio != null && signal.volumeRatio >= HIGH_VOLUME_RATIO;

  return (
    <>
      <section aria-label="지금 신호" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {open?.sellSignal ? (
            <Badge variant="destructive">매도 신호</Badge>
          ) : signal.buySignal ? (
            <Badge>매수 신호</Badge>
          ) : (
            <Badge variant="outline">신호 없음</Badge>
          )}
          <p className="text-sm text-muted-foreground">
            {signal.asOf} 종가 {formatMoney(signal.close, currency)} 기준
            {!signal.buySignal && ` · 매수 기준가까지 ${formatPercent(signal.distanceToEntryPercent)}`}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Metric label="매수 기준가 (55일 최고가)" value={formatMoney(signal.entryLevel, currency)} />
          <Metric label="매도 기준가 (20일 최저가)" value={formatMoney(signal.exitLevel, currency)} />
          <Metric label="N (하루 평균 변동폭)" value={formatMoney(signal.n, currency)} />
          <Metric
            label="거래량 (20일 평균 대비)"
            value={signal.volumeRatio == null ? "해당 없음" : `${signal.volumeRatio.toFixed(2)}배`}
            note={highVolume ? "평소보다 많음" : undefined}
          />
        </dl>
      </section>

      {open && (
        <section aria-label="진행 중인 거래" className="flex flex-col gap-3 rounded-lg border p-4">
          <h3 className="font-medium">규칙상 보유 중</h3>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric label="매수일 · 매수가" value={formatMoney(open.entryPrice, currency)} note={open.entryDate} />
            <Metric label="현재 수익률" value={formatPercent(open.returnPercent)} />
            <Metric label="손절 가격" value={formatMoney(open.stopPrice, currency)} />
            <Metric label="매도 기준가" value={formatMoney(signal.exitLevel, currency)} />
          </dl>
        </section>
      )}

      <section aria-label="백테스트" className="flex flex-col gap-4">
        <div>
          <h3 className="font-medium">최근 {BACKTEST_YEARS}년 백테스트</h3>
          <p className="text-sm text-muted-foreground">
            {backtest.periodStart} – {backtest.periodEnd} · 신호가 난 다음 거래일 시가에 사고판다고 가정했습니다.
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Metric
            label="규칙대로 매매"
            value={formatPercent(backtest.strategyReturnPercent)}
            note={open ? "진행 중인 거래는 최근 종가로 계산" : undefined}
          />
          <Metric label="같은 기간 계속 보유" value={formatPercent(backtest.buyAndHoldReturnPercent)} />
          <Metric label="끝난 거래" value={`${backtest.trades.length}번`} />
          <Metric
            label="수익 낸 거래"
            value={backtest.trades.length === 0 ? "해당 없음" : `${wins}번 (${Math.round((wins / backtest.trades.length) * 100)}%)`}
          />
        </dl>

        {backtest.trades.length === 0 && !open ? (
          <p className="text-sm text-muted-foreground">최근 {BACKTEST_YEARS}년 동안 매수 신호가 없었습니다.</p>
        ) : (
          backtest.trades.length > 0 && (
            <ul aria-label="백테스트 거래 목록" className="flex flex-col divide-y rounded-lg border">
              {[...backtest.trades].reverse().map((t) => (
                <li key={t.entryDate} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-3 py-2 text-sm">
                  <span className="tabular-nums">
                    {t.entryDate} → {t.exitDate}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatMoney(t.entryPrice, currency)} → {formatMoney(t.exitPrice, currency)} · {REASON_LABELS[t.reason]}
                  </span>
                  <span className="font-medium tabular-nums">{formatPercent(t.returnPercent)}</span>
                </li>
              ))}
            </ul>
          )
        )}
      </section>
    </>
  );
}
