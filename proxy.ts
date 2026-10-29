import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // 정적 파일, 이미지 최적화, favicon, 이미지 파일, 종목 검색 API는 세션이 필요 없다.
    "/((?!_next/static|_next/image|favicon.ico|api/search|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
