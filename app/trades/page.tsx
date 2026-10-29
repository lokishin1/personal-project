import Link from "next/link";
import { redirect } from "next/navigation";

import { addTradeAction } from "@/app/trades/actions";
import { formatMoney, formatPercent, formatSignedMoney } from "@/components/stock-overview/format";
import { DeleteTradeButton } from "@/components/trade-journal/delete-trade-button";
import { TradeForm } from "@/components/trade-journal/trade-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getStockOverview } from "@/lib/market-data";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { evaluatePosition, summarizePositions, type Position } from "@/lib/trade-journal";
import { listTrades } from "@/lib/trade-journal/store";

const CURRENCY = "USD";

async function currentPrices(positions: Position[]): Promise<Map<string, number | null>> {
  const held = positions.filter((p) => p.quantity > 0);
  const results = await Promise.all(held.map((p) => getStockOverview(p.symbol)));
  return new Map(held.map((p, i) => [p.symbol, results[i].status === "ok" ? results[i].overview.price : null]));
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 }).format(value);
}

export default async function TradesPage() {
  if (!(await getVerifiedUserId())) redirect("/login?next=/trades");

  const trades = await listTrades();

  return (
    <div className="flex flex-col gap-6 py-8">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">매매 기록</h1>

      <Card>
        <CardHeader>
          <CardTitle>매매 입력</CardTitle>
          <CardDescription>증권사 앱에서 체결된 내역을 그대로 입력하세요. 수수료와 세금은 계산에 넣지 않습니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <TradeForm action={addTradeAction} submitLabel="저장" />
        </CardContent>
      </Card>

      {trades.ok ? (
        <TradeSummary trades={trades.value} />
      ) : (
        <Alert variant="destructive">
          <AlertTitle>매매 기록을 불러오지 못했습니다</AlertTitle>
          <AlertDescription>잠시 후 새로고침해 주세요.</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

async function TradeSummary({ trades }: { trades: Parameters<typeof summarizePositions>[0] }) {
  if (trades.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>아직 매매 기록이 없습니다</EmptyTitle>
          <EmptyDescription>위에서 첫 매매를 입력하면 종목별 보유 현황과 수익률이 여기에 나타납니다.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const summary = summarizePositions(trades);
  if (summary.status !== "ok") {
    return (
      <Alert variant="destructive">
        <AlertTitle>기록에 맞지 않는 매도가 있습니다</AlertTitle>
        <AlertDescription>
          {summary.tradeDate} 기준 {summary.symbol}의 매도 수량이 보유 수량보다 많습니다. 아래 내역을 고쳐 주세요.
        </AlertDescription>
      </Alert>
    );
  }

  const positions = summary.positions;
  const prices = await currentPrices(positions);
  const held = positions.filter((p) => p.quantity > 0);
  const realized = positions.filter((p) => p.realizedCostBasis > 0);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>보유 중인 종목</CardTitle>
          <CardDescription>평균단가 기준 평가 손익입니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {held.length === 0 ? (
            <p className="text-sm text-muted-foreground">지금 보유 중인 종목이 없습니다.</p>
          ) : (
            <ul className="flex flex-col divide-y">
              {held.map((p) => {
                const price = prices.get(p.symbol) ?? null;
                const evaluation = evaluatePosition(p, price);
                return (
                  <li key={p.symbol} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <Link href={`/stocks/${encodeURIComponent(p.symbol)}`} className="font-medium underline-offset-4 hover:underline">
                          {p.symbol}
                        </Link>
                        <p className="truncate text-sm text-muted-foreground">{p.name}</p>
                      </div>
                      {evaluation.unrealizedPercent != null && (
                        <p className="text-xl font-semibold tabular-nums">{formatPercent(evaluation.unrealizedPercent)}</p>
                      )}
                    </div>
                    <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                      <div>
                        <dt className="text-muted-foreground">수량</dt>
                        <dd className="tabular-nums">{formatQuantity(p.quantity)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">평균단가</dt>
                        <dd className="tabular-nums">{formatMoney(p.averageCost!, CURRENCY)}</dd>
                      </div>
                      {price == null ? (
                        <div className="col-span-2">
                          <dt className="text-muted-foreground">평가</dt>
                          <dd className="text-muted-foreground">현재가를 가져오지 못해 평가할 수 없습니다</dd>
                        </div>
                      ) : (
                        <>
                          <div>
                            <dt className="text-muted-foreground">현재가</dt>
                            <dd className="tabular-nums">{formatMoney(price, CURRENCY)}</dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">평가 손익</dt>
                            <dd className="tabular-nums">{formatSignedMoney(evaluation.unrealizedPnl!, CURRENCY)}</dd>
                          </div>
                        </>
                      )}
                    </dl>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {realized.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>실현 손익</CardTitle>
            <CardDescription>매도한 수량의 평균단가 대비 손익입니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>종목</TableHead>
                  <TableHead className="text-right">실현 손익</TableHead>
                  <TableHead className="text-right">실현 수익률</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {realized.map((p) => {
                  const evaluation = evaluatePosition(p, null);
                  return (
                    <TableRow key={p.symbol}>
                      <TableCell className="font-medium">{p.symbol}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatSignedMoney(p.realizedPnl, CURRENCY)}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatPercent(evaluation.realizedPercent!)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>매매 내역</CardTitle>
          <CardDescription>종목별, 거래일 순서입니다.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {positions.map((p) => (
            <section key={p.symbol} aria-label={`${p.symbol} 매매 내역`} className="flex flex-col gap-2">
              <h2 className="font-medium">
                {p.symbol} <span className="font-normal text-muted-foreground">{p.name}</span>
              </h2>
              <ul className="flex flex-col divide-y rounded-lg border">
                {p.trades.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 py-2">
                    <div className="flex flex-wrap items-baseline gap-x-3 text-sm">
                      <span className="tabular-nums">{t.tradeDate}</span>
                      <span className="font-medium">{t.side === "buy" ? "매수" : "매도"}</span>
                      <span className="tabular-nums">
                        {formatMoney(t.price, CURRENCY)} × {formatQuantity(t.quantity)}주
                      </span>
                    </div>
                    <div className="flex items-start gap-1">
                      <Link href={`/trades/${t.id}/edit`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                        수정
                      </Link>
                      <DeleteTradeButton id={t.id} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
