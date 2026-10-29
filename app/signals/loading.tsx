import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6 py-8" aria-busy="true" aria-label="오늘의 신호를 계산하는 중">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">오늘의 신호</h1>
      <p className="text-sm text-muted-foreground">
        약 570개 종목의 신호를 계산하는 중입니다. 그날 처음 열 때는 30초 정도 걸릴 수 있습니다.
      </p>
      <Skeleton className="h-20" />
      <Skeleton className="h-96" />
    </div>
  );
}
