import { yahoo } from "./yahoo";

export type SecurityType = "EQUITY" | "ETF";

export type SecurityCandidate = {
  symbol: string;
  name: string;
  type: SecurityType;
};

export type SearchResult =
  | { status: "ok"; candidates: SecurityCandidate[] }
  | { status: "error" };

// Yahoo 거래소 코드: Nasdaq(NMS·NGM·NCM·NAS), NYSE(NYQ), NYSE American(ASE), NYSE Arca(PCX), Cboe BZX(BTS)
const US_EXCHANGES = new Set(["NMS", "NGM", "NCM", "NAS", "NYQ", "ASE", "PCX", "BTS"]);

type RawQuote = {
  symbol?: string;
  quoteType?: string;
  exchange?: string;
  shortname?: string;
  longname?: string;
};

export async function searchSecurities(query: string): Promise<SearchResult> {
  let quotes: RawQuote[];
  try {
    const result = await yahoo.search(query, { newsCount: 0 });
    quotes = result.quotes as RawQuote[];
  } catch {
    return { status: "error" };
  }

  const candidates: SecurityCandidate[] = [];
  for (const quote of quotes) {
    if (!quote.symbol || !quote.exchange || !US_EXCHANGES.has(quote.exchange)) continue;
    if (quote.quoteType !== "EQUITY" && quote.quoteType !== "ETF") continue;
    candidates.push({
      symbol: quote.symbol,
      name: quote.shortname ?? quote.longname ?? quote.symbol,
      type: quote.quoteType,
    });
  }
  return { status: "ok", candidates };
}
