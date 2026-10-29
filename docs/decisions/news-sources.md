# 뉴스 출처

## Decisions

- 뉴스 추천의 기사 출처는 다음 RSS 네 곳이다.
  - WSJ 기술: `https://feeds.content.dowjones.io/public/rss/RSSWSJD`
  - Bloomberg 기술: `https://feeds.bloomberg.com/technology/news.rss`
  - CNBC 기술: `https://www.cnbc.com/id/19854910/device/rss/rss.html`
  - MarketWatch 주요 뉴스: `https://feeds.content.dowjones.io/public/rss/mw_topstories`

## Boundaries

- 기사가 신제품·신기술 발표인지 가려내는 방식과, 회사 이름을 티커로 바꾸는 방식은 정하지 않았다. 정할 때는 아래 근거를 참고한다.
- RSS에는 제목과 짧은 요약만 있고 티커가 없다.

## Why

`PRODUCT.md`의 "미국 유명 경제지" 기준에 맞고, 2026-10-29에 네 곳 모두 그날 기사까지 갱신되고 있었다. Yahoo 종목별 뉴스는 기사마다 관련 티커가 붙어 편하지만, 실제 기사는 대부분 Motley Fool·Zacks 같은 투자 블로그라 기준에 맞지 않았다.

## Reconsider when

- 피드가 갱신을 멈추거나 주소가 바뀔 때 (WSJ의 예전 주소 `feeds.a.dj.com/rss/RSSWSJD.xml`는 2025년 1월에 멈췄다)
- 기사 본문이나 티커가 꼭 필요해질 때

## Still-rejected alternatives

- Reuters — 공개 RSS가 없다(404).
- Yahoo 종목별 뉴스 — 경제지 기사가 적다. 티커 연결이 중요해지고 출처 기준을 넓히기로 하면 다시 검토한다.

## Evidence worth preserving

- 2026-10-29 오늘 기사 100건에 키워드 규칙(launch, unveil, debut, first, hands-on 등)을 적용했더니 4건이 걸렸다. 3건은 실제 신제품 기사(애플의 첫 터치스크린 맥북, 두 매체), 1건은 무관한 칼럼이었다.
- 같은 날 Claude로 분류하는 방식은 Claude Opus 5.5 기준 하루 약 $0.1–0.2로 추정했다. 사용자가 유료라는 이유로 보류했다.
