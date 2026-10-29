export type ClosePoint = { date: string; close: number };

export type PeriodChange = { baseDate: string; basePrice: number; percent: number };

export type PeriodChanges = {
  asOf: string | null;
  week: PeriodChange | null;
  month: PeriodChange | null;
  /** 전해 마지막 거래일 종가 대비 */
  yearToDate: PeriodChange | null;
};

function shiftDay(day: string, { days = 0, months = 0 }: { days?: number; months?: number }): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  if (months) {
    // 3월 31일 − 1개월처럼 없는 날짜가 다음 달로 넘어가지 않도록 그 달의 마지막 날로 맞춘다.
    const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - months, 1));
    const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
    target.setUTCDate(Math.min(date.getUTCDate(), lastDay));
    date.setTime(target.getTime());
  }
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

/** 기준일 당일 또는 그 직전 거래일의 종가와 비교한다. points는 거래일 순서여야 한다. */
function changeSince(points: ClosePoint[], latest: ClosePoint, onOrBefore: string): PeriodChange | null {
  let base: ClosePoint | null = null;
  for (const point of points) {
    if (point.date > onOrBefore) break;
    base = point;
  }
  if (!base) return null;
  return { baseDate: base.date, basePrice: base.close, percent: (latest.close / base.close - 1) * 100 };
}

export function periodChanges(points: ClosePoint[]): PeriodChanges {
  const latest = points.at(-1);
  if (!latest) return { asOf: null, week: null, month: null, yearToDate: null };

  const lastDayOfPreviousYear = `${Number(latest.date.slice(0, 4)) - 1}-12-31`;
  return {
    asOf: latest.date,
    week: changeSince(points, latest, shiftDay(latest.date, { days: 7 })),
    month: changeSince(points, latest, shiftDay(latest.date, { months: 1 })),
    yearToDate: changeSince(points, latest, lastDayOfPreviousYear),
  };
}
