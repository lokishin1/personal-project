import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// 요청마다 새로 만든다. 전역 변수에 두지 않는다.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server Component에서는 쿠키를 쓸 수 없다. 세션 갱신은 proxy가 맡는다.
          }
        },
      },
    },
  );
}

/** 서버에서 서명을 검증한 사용자 id. 로그인하지 않았으면 null */
export async function getVerifiedUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ?? null;
}
