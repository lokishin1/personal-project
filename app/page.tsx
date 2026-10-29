import { StockSearch } from "@/components/stock-search";

export default function Home() {
  return (
    <div className="flex flex-col gap-6 py-16">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">종목 한눈에 보기</h1>
        <p className="text-muted-foreground">
          미국 주식·ETF를 찾으면 현재가, 고른 날짜부터의 상승률, PER/PBR, 기간별 그래프를 한 화면에서 보여줍니다.
        </p>
      </div>
      <StockSearch autoFocus />
    </div>
  );
}
