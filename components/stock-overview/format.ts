export function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
}

export function formatPriceTime(date: Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(date);
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatRatio(value: number | null): string {
  return value == null ? "해당 없음" : value.toFixed(2);
}
