import Link from "next/link";

import { signOutAction } from "@/app/login/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { getVerifiedUserId } from "@/lib/supabase/server";

export async function SiteHeader() {
  const signedIn = Boolean(await getVerifiedUserId());

  return (
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link href="/" className="font-heading font-semibold">
          종목 한눈에 보기
        </Link>
        <nav aria-label="주요 메뉴" className="ml-auto flex items-center gap-1">
          <Link href="/signals" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            오늘의 신호
          </Link>
          <Link href="/trades" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            매매 기록
          </Link>
          {signedIn ? (
            <>
              <Link href="/settings" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                설정
              </Link>
              <form action={signOutAction}>
                <Button type="submit" variant="outline" size="sm">
                  로그아웃
                </Button>
              </form>
            </>
          ) : (
            <Link href="/login" className={buttonVariants({ variant: "outline", size: "sm" })}>
              로그인
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
