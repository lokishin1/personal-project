import Link from "next/link";
import { redirect } from "next/navigation";

import { updateTradeAction } from "@/app/trades/actions";
import { TradeForm } from "@/components/trade-journal/trade-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { getTrade } from "@/lib/trade-journal/store";

export default async function EditTradePage({ params }: PageProps<"/trades/[id]/edit">) {
  const { id } = await params;
  if (!(await getVerifiedUserId())) redirect(`/login?next=/trades/${id}/edit`);

  const trade = await getTrade(id);

  return (
    <div className="flex flex-col gap-6 py-8">
      <Link href="/trades" className={buttonVariants({ variant: "ghost", size: "sm", className: "self-start" })}>
        ← 매매 기록으로
      </Link>
      {!trade.ok || !trade.value ? (
        <Alert variant="destructive">
          <AlertTitle>{trade.ok ? "이 매매 기록을 찾을 수 없습니다" : "매매 기록을 불러오지 못했습니다"}</AlertTitle>
          <AlertDescription>매매 기록 화면에서 다시 골라 주세요.</AlertDescription>
        </Alert>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>매매 수정</CardTitle>
          </CardHeader>
          <CardContent>
            <TradeForm action={updateTradeAction.bind(null, id)} submitLabel="수정 저장" trade={trade.value} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
