const FALLBACK = "/trades";
const BASE = "http://app.invalid";

/**
 * 로그인 뒤 이동할 경로를 앱 안으로 제한한다.
 * 브라우저와 같은 규칙(URL 파서)으로 해석해서, `/\host`나 `//host`처럼 외부로 나가는 값을 막는다.
 */
export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/")) return FALLBACK;
  let url: URL;
  try {
    url = new URL(value, BASE);
  } catch {
    return FALLBACK;
  }
  if (url.origin !== BASE) return FALLBACK;
  return `${url.pathname}${url.search}${url.hash}`;
}
