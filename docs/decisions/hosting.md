# 앱 호스팅

## Decisions

- 앱은 Vercel에 배포한다. GitHub 저장소와 연결해 기본 브랜치에 병합되면 배포되게 한다.
- 개인·비상업 용도 동안은 무료 Hobby 플랜을 쓴다.

## Boundaries

- 데이터베이스와 로그인은 이 결정의 대상이 아니다. [user-data-storage](user-data-storage.md)를 따른다.
- 시장 데이터 출처는 [market-data-source](market-data-source.md)를 따른다. Vercel에서 Yahoo Finance가 막히더라도 이 결정만으로 데이터 출처를 바꾸지 않는다.

## Why

사용자는 휴대폰과 PC에서 언제든 앱을 열 수 있어야 한다. Vercel은 Next.js를 만든 곳이라 Next.js 16의 기능(proxy, 서버 액션)을 설정 없이 지원하고, 무료 플랜으로 개인 용도를 감당한다.

## Reconsider when

- 배포된 앱에서 Yahoo Finance 요청이 반복해서 막힐 때 (클라우드 IP 차단 보고가 있다)
- 다른 사람에게 공개하거나 수익을 내게 되어 Hobby 플랜의 비상업 조건을 벗어날 때

## Still-rejected alternatives

- 이 PC에서 실행하고 터널로 공개 — 가정·회사 회선 IP라 Yahoo 차단 위험은 낮지만, PC가 꺼지면 휴대폰에서 쓸 수 없다. Vercel에서 Yahoo가 막히면 다시 검토한다.
- Netlify, Cloudflare 등 다른 클라우드 — 같은 클라우드 IP 위험이 있고, Next.js 16 지원은 Vercel이 가장 앞선다.
