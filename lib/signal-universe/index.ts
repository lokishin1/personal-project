/** 신호 대상 종목: S&P 500 + 나스닥 100 + 주요 ETF(고정 목록). GLOSSARY.md 참고 */

export type UniverseMember = { symbol: string; name: string; type: "EQUITY" | "ETF" };

export type UniverseSource = "sp500" | "nasdaq100";

export type UniverseResult =
  | { status: "ok"; members: UniverseMember[]; failedSources: UniverseSource[] }
  | { status: "error" };

// 공식 API가 아닌 공개 출처다. 바뀌면 docs/specs/daily-turtle-signals/spec.md의 "신호 대상 종목"도 고친다.
const SP500_CSV_URL = "https://raw.githubusercontent.com/datasets/s-and-p-500-companies/main/data/constituents.csv";
const NASDAQ100_URL = "https://api.nasdaq.com/api/quote/list-type/nasdaq100";

// 레버리지·인버스 ETF는 넣지 않는다.
export const MAJOR_ETFS: ReadonlyArray<{ symbol: string; name: string }> = [
  { symbol: "SPY", name: "SPDR S&P 500 ETF Trust" },
  { symbol: "IVV", name: "iShares Core S&P 500 ETF" },
  { symbol: "VOO", name: "Vanguard S&P 500 ETF" },
  { symbol: "VTI", name: "Vanguard Total Stock Market ETF" },
  { symbol: "QQQ", name: "Invesco QQQ Trust" },
  { symbol: "DIA", name: "SPDR Dow Jones Industrial Average ETF" },
  { symbol: "IWM", name: "iShares Russell 2000 ETF" },
  { symbol: "MDY", name: "SPDR S&P MidCap 400 ETF" },
  { symbol: "VEA", name: "Vanguard FTSE Developed Markets ETF" },
  { symbol: "VWO", name: "Vanguard FTSE Emerging Markets ETF" },
  { symbol: "EFA", name: "iShares MSCI EAFE ETF" },
  { symbol: "EEM", name: "iShares MSCI Emerging Markets ETF" },
  { symbol: "ACWI", name: "iShares MSCI ACWI ETF" },
  { symbol: "XLK", name: "Technology Select Sector SPDR Fund" },
  { symbol: "XLF", name: "Financial Select Sector SPDR Fund" },
  { symbol: "XLV", name: "Health Care Select Sector SPDR Fund" },
  { symbol: "XLE", name: "Energy Select Sector SPDR Fund" },
  { symbol: "XLY", name: "Consumer Discretionary Select Sector SPDR Fund" },
  { symbol: "XLP", name: "Consumer Staples Select Sector SPDR Fund" },
  { symbol: "XLI", name: "Industrial Select Sector SPDR Fund" },
  { symbol: "XLB", name: "Materials Select Sector SPDR Fund" },
  { symbol: "XLU", name: "Utilities Select Sector SPDR Fund" },
  { symbol: "XLRE", name: "Real Estate Select Sector SPDR Fund" },
  { symbol: "XLC", name: "Communication Services Select Sector SPDR Fund" },
  { symbol: "SMH", name: "VanEck Semiconductor ETF" },
  { symbol: "SOXX", name: "iShares Semiconductor ETF" },
  { symbol: "IGV", name: "iShares Expanded Tech-Software Sector ETF" },
  { symbol: "XBI", name: "SPDR S&P Biotech ETF" },
  { symbol: "IBB", name: "iShares Biotechnology ETF" },
  { symbol: "KRE", name: "SPDR S&P Regional Banking ETF" },
  { symbol: "XHB", name: "SPDR S&P Homebuilders ETF" },
  { symbol: "ITB", name: "iShares U.S. Home Construction ETF" },
  { symbol: "ARKK", name: "ARK Innovation ETF" },
  { symbol: "VNQ", name: "Vanguard Real Estate ETF" },
  { symbol: "TLT", name: "iShares 20+ Year Treasury Bond ETF" },
  { symbol: "IEF", name: "iShares 7-10 Year Treasury Bond ETF" },
  { symbol: "SHY", name: "iShares 1-3 Year Treasury Bond ETF" },
  { symbol: "AGG", name: "iShares Core U.S. Aggregate Bond ETF" },
  { symbol: "BND", name: "Vanguard Total Bond Market ETF" },
  { symbol: "LQD", name: "iShares iBoxx $ Investment Grade Corporate Bond ETF" },
  { symbol: "HYG", name: "iShares iBoxx $ High Yield Corporate Bond ETF" },
  { symbol: "TIP", name: "iShares TIPS Bond ETF" },
  { symbol: "GLD", name: "SPDR Gold Shares" },
  { symbol: "SLV", name: "iShares Silver Trust" },
  { symbol: "USO", name: "United States Oil Fund" },
  { symbol: "UNG", name: "United States Natural Gas Fund" },
  { symbol: "DBC", name: "Invesco DB Commodity Index Tracking Fund" },
  { symbol: "GDX", name: "VanEck Gold Miners ETF" },
  { symbol: "VIG", name: "Vanguard Dividend Appreciation ETF" },
  { symbol: "SCHD", name: "Schwab U.S. Dividend Equity ETF" },
  { symbol: "VYM", name: "Vanguard High Dividend Yield ETF" },
  { symbol: "MTUM", name: "iShares MSCI USA Momentum Factor ETF" },
  { symbol: "QUAL", name: "iShares MSCI USA Quality Factor ETF" },
  { symbol: "USMV", name: "iShares MSCI USA Min Vol Factor ETF" },
];

/** Yahoo 티커 형식으로 바꾼다. 예: BRK.B → BRK-B */
function toYahooSymbol(symbol: string): string {
  return symbol.trim().toUpperCase().replace(/\./g, "-");
}

/** CSV 한 줄의 앞 두 칸(티커, 이름)만 읽는다. 큰따옴표 안의 쉼표를 처리한다. */
function firstTwoFields(line: string): [string, string] {
  const fields: string[] = [];
  let current = "";
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === "," && !quoted) {
      fields.push(current);
      current = "";
      if (fields.length === 2) break;
    } else current += ch;
  }
  if (fields.length < 2) fields.push(current);
  return [fields[0] ?? "", fields[1] ?? ""];
}

async function loadSp500(): Promise<UniverseMember[]> {
  const response = await fetch(SP500_CSV_URL);
  if (!response.ok) throw new Error(`sp500 ${response.status}`);
  const lines = (await response.text()).trim().split(/\r?\n/).slice(1);
  return lines
    .map(firstTwoFields)
    .filter(([symbol]) => symbol)
    .map(([symbol, name]) => ({ symbol: toYahooSymbol(symbol), name: name.trim(), type: "EQUITY" as const }));
}

async function loadNasdaq100(): Promise<UniverseMember[]> {
  // Nasdaq 사이트는 브라우저처럼 보이지 않는 요청을 막는다.
  const response = await fetch(NASDAQ100_URL, { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" } });
  if (!response.ok) throw new Error(`nasdaq100 ${response.status}`);
  const json = (await response.json()) as { data?: { data?: { rows?: { symbol?: string; companyName?: string }[] } } };
  const rows = json.data?.data?.rows ?? [];
  if (rows.length === 0) throw new Error("nasdaq100 empty");
  return rows
    .filter((row) => row.symbol)
    .map((row) => ({
      symbol: toYahooSymbol(row.symbol!),
      name: (row.companyName ?? row.symbol!).replace(/\s+(Class [A-Z] )?(Common Stock|Ordinary Shares|American Depositary Shares).*$/i, "").trim(),
      type: "EQUITY" as const,
    }));
}

export async function loadSignalUniverse(): Promise<UniverseResult> {
  const [sp500, nasdaq100] = await Promise.allSettled([loadSp500(), loadNasdaq100()]);
  if (sp500.status === "rejected" && nasdaq100.status === "rejected") return { status: "error" };

  const failedSources: UniverseSource[] = [];
  if (sp500.status === "rejected") failedSources.push("sp500");
  if (nasdaq100.status === "rejected") failedSources.push("nasdaq100");

  const bySymbol = new Map<string, UniverseMember>();
  const lists = [
    sp500.status === "fulfilled" ? sp500.value : [],
    nasdaq100.status === "fulfilled" ? nasdaq100.value : [],
    MAJOR_ETFS.map((etf) => ({ ...etf, type: "ETF" as const })),
  ];
  for (const list of lists) {
    for (const member of list) if (!bySymbol.has(member.symbol)) bySymbol.set(member.symbol, member);
  }
  return { status: "ok", members: [...bySymbol.values()], failedSources };
}
