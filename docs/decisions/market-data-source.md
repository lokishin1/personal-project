# 시장 데이터 출처

## Decisions

- 미국 주식과 ETF의 가격, 기간별 가격 이력(시가·고가·저가·종가·거래량), PER/PBR은 Yahoo Finance에서 `yahoo-finance2` 패키지로 가져옵니다.
- API 키나 유료 구독 없이 동작하는 것을 전제로 합니다.

## Boundaries

- 앱을 본인 혼자 쓰는 동안에만 적용합니다. 다른 사람에게 공개하는 결정은 이 계약이 허용하지 않습니다.
- 뉴스 출처는 이 결정에 포함되지 않습니다.

## Why

터틀 트레이딩 추천은 S&P 500·나스닥 100 구성 종목과 미국 상장 ETF 전체의 일별 가격과 거래량이 필요합니다. 무료로 이 범위와 PER/PBR을 함께 제공하는 출처는 Yahoo Finance뿐이었습니다. 비공식 경로라 예고 없이 깨질 수 있다는 위험은 개인용 단계에서 감수합니다.

## Reconsider when

- 다른 사람도 쓸 수 있게 공개하려 할 때 (Yahoo 데이터의 재배포·상업 이용 조건)
- `yahoo-finance2`가 Yahoo 쪽 변경으로 반복해서 실패하거나 유지보수가 멈출 때

## Still-rejected alternatives

- Financial Modeling Prep 무료 플랜 — 재무 지표가 약 87개 샘플 종목으로 제한되어 추천 범위를 다루지 못합니다. 유료(Starter 이상)를 쓸 의향이 생기면 다시 검토합니다.
- Finnhub 무료 플랜 — 과거 가격 이력(candle)이 유료로 옮겨졌다는 보고가 있어 기간별 그래프와 터틀 계산을 받칠 수 없습니다.

## Evidence worth preserving

- 2026-10-29 `yahoo-finance2@4.0.5` 스크래치 테스트: 키 없이 `quote("TSLA")`가 현재가·전일 종가·`trailingPE`·`priceToBook`을, `quote("QQQ")`(ETF)도 PER/PBR을 반환했습니다. `chart("TSLA", { period1: "2026-01-02", interval: "1d" })`는 일별 OHLCV 207개를 반환했습니다. v4는 `new YahooFinance()` 인스턴스 방식입니다.
