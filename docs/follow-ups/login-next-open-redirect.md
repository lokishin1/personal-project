# 로그인 후 이동 경로(next)로 외부 사이트에 보낼 수 있음

- 증상: `/login?next=/%5Cevil.example`로 로그인하면 `redirect("/\evil.example")`이 되고, 브라우저는 `/\`를 `//`처럼 해석해 외부 사이트로 이동한다.
- 근거: `app/login/actions.ts`의 `safeNext`와 `app/login/page.tsx`의 같은 검사는 앞의 `//`만 막는다(trade-journal 구현의 `code-review low` 지적).
- 제안: `next`를 `new URL(next, "http://x")`로 해석해 origin이 그대로이고 pathname이 `/`로 시작할 때만 허용한다. 두 곳의 검사를 하나로 합친다.
- 배포(다음 작업) 전에 고치는 것이 좋다.
