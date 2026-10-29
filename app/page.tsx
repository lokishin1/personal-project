import Link from "next/link";
import { Suspense } from "react";

import { MarketOverview } from "@/components/market-flow/market-overview";
import { StockSearch } from "@/components/stock-search";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  return (
    <div className="flex flex-col gap-8 py-8">
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">오늘의 시장</h1>
            <p className="text-sm text-muted-foreground">전날 미국장 기준 지수 흐름입니다.</p>
          </div>
          <nav aria-label="오늘 볼 것" className="flex flex-wrap gap-2">
            <Link href="/signals" className={buttonVariants({ variant: "default", size: "sm" })}>
              오늘의 신호 보기
            </Link>
            <Link href="/trades" className={buttonVariants({ variant: "outline", size: "sm" })}>
              매매 기록 보기
            </Link>
          </nav>
        </div>
        <Suspense
          fallback={
            <div className="grid gap-4 sm:grid-cols-2" aria-label="지수를 불러오는 중">
              <Skeleton className="h-96" />
              <Skeleton className="h-96" />
            </div>
          }
        >
          <MarketOverview />
        </Suspense>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-heading text-lg font-semibold">종목 한눈에 보기</h2>
        <p className="text-sm text-muted-foreground">
          미국 주식·ETF를 찾으면 현재가, 고른 날짜부터의 상승률, PER/PBR, 기간별 그래프, 터틀 신호를 한 화면에서 보여줍니다.
        </p>
        <StockSearch />
      </section>
    </div>
  );
}
