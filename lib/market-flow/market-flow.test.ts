import { describe, expect, it } from "vitest";

import { periodChanges } from "@/lib/market-flow";

describe("periodChanges", () => {
  // 주말이 빠진 거래일 종가
  const points = [
    { date: "2025-12-30", close: 90 },
    { date: "2025-12-31", close: 100 }, // 연초 기준(전해 마지막 거래일)
    { date: "2026-01-02", close: 101 },
    { date: "2026-09-25", close: 110 }, // 금요일
    { date: "2026-09-28", close: 120 }, // 1개월 전 날짜(10-28)보다 앞선 가장 가까운 거래일
    { date: "2026-10-20", close: 125 },
    { date: "2026-10-21", close: 130 }, // 7일 전 날짜(10-21) 당일
    { date: "2026-10-27", close: 140 },
    { date: "2026-10-28", close: 143 },
  ];

  it("최근 종가를 7일 전, 1개월 전, 전해 마지막 거래일의 종가와 비교한다", () => {
    const result = periodChanges(points);

    expect(result.asOf).toBe("2026-10-28");
    expect(result.week).toMatchObject({ baseDate: "2026-10-21", basePrice: 130 });
    expect(result.week?.percent).toBeCloseTo((143 / 130 - 1) * 100, 6);
    expect(result.month).toMatchObject({ baseDate: "2026-09-28", basePrice: 120 });
    expect(result.month?.percent).toBeCloseTo((143 / 120 - 1) * 100, 6);
    expect(result.yearToDate).toMatchObject({ baseDate: "2025-12-31", basePrice: 100 });
    expect(result.yearToDate?.percent).toBeCloseTo(43, 6);
  });

  it("비교할 날짜보다 앞선 기록이 없으면 그 변화는 null이다", () => {
    const result = periodChanges(points.slice(5));

    expect(result.week).not.toBeNull();
    expect(result.month).toBeNull();
    expect(result.yearToDate).toBeNull();
  });

  it("기록이 비어 있으면 모두 null이다", () => {
    expect(periodChanges([])).toEqual({ asOf: null, week: null, month: null, yearToDate: null });
  });
});

describe("periodChanges 월말", () => {
  it("1개월 전 날짜가 없는 달(3월 31일 → 2월)이면 그 달의 마지막 날 이전 거래일과 비교한다", () => {
    const result = periodChanges([
      { date: "2026-02-27", close: 100 }, // 2월의 마지막 거래일(금요일)
      { date: "2026-03-02", close: 105 },
      { date: "2026-03-31", close: 110 },
    ]);

    expect(result.month).toMatchObject({ baseDate: "2026-02-27", basePrice: 100 });
  });
});
