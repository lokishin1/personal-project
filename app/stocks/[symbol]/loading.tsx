import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6 py-8" aria-busy="true" aria-label="종목 정보를 불러오는 중">
      <p className="text-sm text-muted-foreground">종목 정보를 불러오는 중…</p>
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-40" />
      <Skeleton className="h-80" />
    </div>
  );
}
