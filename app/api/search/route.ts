import type { NextRequest } from "next/server";

import { searchSecurities } from "@/lib/market-data";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!query) return Response.json({ status: "ok", candidates: [] });

  const result = await searchSecurities(query);
  return Response.json(result, { status: result.status === "ok" ? 200 : 502 });
}
