import { unstable_cache } from "next/cache";

import { scanDailySignals, type DailySignals } from "@/lib/daily-signals";
import { getDailyBars } from "@/lib/market-data";
import { loadSignalUniverse, type UniverseSource } from "@/lib/signal-universe";
import { backtestWindow } from "@/lib/turtle";

export type DailySignalsResult = DailySignals & { failedSources: UniverseSource[] };

// 가격은 하루 한 번 바뀐다. 한 시간마다 다시 계산하되, 그동안 들어온 요청에는 저장해 둔 결과를 바로 준다.
const REVALIDATE_SECONDS = 60 * 60;

async function computeDailySignals(): Promise<DailySignalsResult> {
  const universe = await loadSignalUniverse();
  // 명단을 못 받은 결과는 캐시되지 않도록 던진다.
  if (universe.status !== "ok") throw new Error("signal universe unavailable");

  const { fetchFrom, periodStart } = backtestWindow();
  const signals = await scanDailySignals({
    members: universe.members,
    periodStart,
    getBars: async (symbol) => {
      const result = await getDailyBars(symbol, fetchFrom);
      return result.status === "ok" ? result.bars : null;
    },
  });
  if (signals.asOf == null) throw new Error("no price data");

  return { ...signals, failedSources: universe.failedSources };
}

export const getDailySignals = unstable_cache(computeDailySignals, ["daily-turtle-signals-v1"], {
  revalidate: REVALIDATE_SECONDS,
});
