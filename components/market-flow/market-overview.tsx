import { formatPercent, formatPriceTime } from "@/components/stock-overview/format";
import { PriceChart } from "@/components/stock-overview/price-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDailyBars, getStockOverview } from "@/lib/market-data";
import { periodChanges, type PeriodChange } from "@/lib/market-flow";

const INDICES = [
  { symbol: "^GSPC", name: "S&P 500" },
  { symbol: "^NDX", name: "나스닥 100" },
] as const;

const CHART_MONTHS = 3;

function formatIndex(value: number): string {
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

function formatSignedIndex(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${formatIndex(Math.abs(value))}`;
}

/** 연초 대비를 계산하려면 전해 12월부터, 그래프는 최근 3개월이 필요하다. */
function fetchWindow(now = new Date()): { from: string; chartFrom: string } {
  const chartFrom = new Date(now);
  chartFrom.setUTCMonth(chartFrom.getUTCMonth() - CHART_MONTHS);
  const yearStart = `${now.getUTCFullYear() - 1}-12-01`;
  const chartDay = chartFrom.toISOString().slice(0, 10);
  return { from: yearStart < chartDay ? yearStart : chartDay, chartFrom: chartDay };
}

export async function MarketOverview() {
  const { from, chartFrom } = fetchWindow();
  const cards = await Promise.all(
    INDICES.map(async (index) => {
      const [quote, bars] = await Promise.all([getStockOverview(index.symbol), getDailyBars(index.symbol, from)]);
      return { index, quote, bars };
    }),
  );

  return (
    <section aria-label="오늘의 시장" className="grid gap-4 sm:grid-cols-2">
      {cards.map(({ index, quote, bars }) => {
        if (quote.status !== "ok" || bars.status !== "ok") {
          return (
            <Card key={index.symbol}>
              <CardHeader>
                <CardTitle>{index.name}</CardTitle>
                <CardDescription>지수 데이터를 가져오지 못했습니다. 잠시 후 새로고침해 주세요.</CardDescription>
              </CardHeader>
            </Card>
          );
        }

        const { overview } = quote;
        const points = bars.bars.map((b) => ({ date: b.date, close: b.close }));
        const changes = periodChanges(points);
        const chartPoints = points.filter((p) => p.date >= chartFrom);

        return (
          <Card key={index.symbol}>
            <CardHeader>
              <CardDescription>{index.name}</CardDescription>
              <CardTitle className="text-3xl tabular-nums">{formatIndex(overview.price)}</CardTitle>
              <p className="text-sm tabular-nums">
                {overview.change != null && overview.changePercent != null ? (
                  <>
                    <span className="font-medium">
                      {formatSignedIndex(overview.change)} ({formatPercent(overview.changePercent)})
                    </span>{" "}
                    <span className="text-muted-foreground">전일 대비</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">전일 대비 변화 없음</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">기준 시각 {formatPriceTime(overview.priceTime)} (한국 시간)</p>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <dl className="grid grid-cols-3 gap-2 text-sm">
                <ChangeItem label="1주" change={changes.week} />
                <ChangeItem label="1개월" change={changes.month} />
                <ChangeItem label="연초 대비" change={changes.yearToDate} />
              </dl>
              {chartPoints.length > 1 && <PriceChart points={chartPoints} />}
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}

function ChangeItem({ label, change }: { label: string; change: PeriodChange | null }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{change ? formatPercent(change.percent) : "해당 없음"}</dd>
    </div>
  );
}
