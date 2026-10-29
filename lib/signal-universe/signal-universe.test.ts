import { afterEach, describe, expect, it, vi } from "vitest";

import { loadSignalUniverse, MAJOR_ETFS } from "@/lib/signal-universe";

const SP500_CSV = [
  "Symbol,Security,GICS Sector,GICS Sub-Industry,Headquarters Location,Date added,CIK,Founded",
  'MMM,3M,Industrials,Industrial Conglomerates,"Saint Paul, Minnesota",1957-03-04,66740,1902',
  'BRK.B,Berkshire Hathaway,Financials,Multi-Sector Holdings,"Omaha, Nebraska",2010-02-16,1067983,1839',
  'AAPL,Apple Inc.,Information Technology,"Technology Hardware, Storage & Peripherals","Cupertino, California",1982-11-30,320193,1977',
].join("\n");

const NASDAQ100_JSON = {
  data: {
    data: {
      rows: [
        { symbol: "AAPL", companyName: "Apple Inc. Common Stock" },
        { symbol: "TSLA", companyName: "Tesla, Inc. Common Stock" },
      ],
    },
  },
};

function stubFetch(responses: { sp500?: string | null; nasdaq?: unknown | null }) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL) => {
      const url = input.toString();
      if (url.includes("s-and-p-500")) {
        return responses.sp500 == null ? new Response("down", { status: 503 }) : new Response(responses.sp500);
      }
      if (url.includes("nasdaq100")) {
        return responses.nasdaq == null ? new Response("blocked", { status: 403 }) : Response.json(responses.nasdaq);
      }
      throw new Error(`unexpected ${url}`);
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("loadSignalUniverse", () => {
  it("S&P 500, 나스닥 100, 주요 ETF를 합치고 겹치는 티커는 하나로 센다", async () => {
    stubFetch({ sp500: SP500_CSV, nasdaq: NASDAQ100_JSON });

    const result = await loadSignalUniverse();

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.failedSources).toEqual([]);
    const symbols = result.members.map((m) => m.symbol);
    expect(symbols.slice(0, 4)).toEqual(["MMM", "BRK-B", "AAPL", "TSLA"]);
    expect(symbols.filter((s) => s === "AAPL")).toHaveLength(1);
    expect(result.members).toHaveLength(4 + MAJOR_ETFS.length);
    expect(result.members.find((m) => m.symbol === "BRK-B")).toEqual({ symbol: "BRK-B", name: "Berkshire Hathaway", type: "EQUITY" });
    expect(result.members.find((m) => m.symbol === "SPY")).toMatchObject({ type: "ETF" });
  });

  it("주요 ETF 목록에는 54개가 있고 레버리지·인버스 ETF가 없다", () => {
    expect(MAJOR_ETFS).toHaveLength(54);
    expect(MAJOR_ETFS.map((e) => e.symbol)).not.toEqual(expect.arrayContaining(["TQQQ", "SQQQ", "SOXL", "UVXY"]));
  });

  it("한쪽 명단을 받지 못하면 나머지로 만들고 실패한 출처를 알려준다", async () => {
    stubFetch({ sp500: SP500_CSV, nasdaq: null });

    const result = await loadSignalUniverse();

    expect(result).toMatchObject({ status: "ok", failedSources: ["nasdaq100"] });
  });

  it("지수 구성 종목 명단을 둘 다 받지 못하면 error를 돌려준다", async () => {
    stubFetch({ sp500: null, nasdaq: null });

    expect(await loadSignalUniverse()).toEqual({ status: "error" });
  });
});
