import { redirect } from "next/navigation";

import { AuthForms } from "@/components/auth-forms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getVerifiedUserId } from "@/lib/supabase/server";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const nextParam = (await searchParams).next;
  const next = typeof nextParam === "string" && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/trades";

  if (await getVerifiedUserId()) redirect(next);

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col py-16">
      <Card>
        <CardHeader>
          <CardTitle>로그인</CardTitle>
          <CardDescription>매매 기록은 로그인한 계정에만 저장되고, 다른 기기에서도 같은 기록을 볼 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForms next={next} />
        </CardContent>
      </Card>
    </div>
  );
}
