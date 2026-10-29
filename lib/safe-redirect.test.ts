import { describe, expect, it } from "vitest";

import { safeNextPath } from "@/lib/safe-redirect";

describe("safeNextPath", () => {
  it.each([
    ["/stocks/TSLA", "/stocks/TSLA"],
    ["/trades/abc/edit", "/trades/abc/edit"],
    ["/stocks/TSLA?range=5y", "/stocks/TSLA?range=5y"],
  ])("앱 안의 경로 %s 는 그대로 둔다", (next, expected) => {
    expect(safeNextPath(next)).toBe(expected);
  });

  it.each([
    "/\\evil.example",
    "//evil.example",
    "https://evil.example",
    "/\t/evil.example",
    "javascript:alert(1)",
    "",
    undefined,
    null,
  ])("앱 밖을 가리키거나 비어 있는 %s 는 매매 기록 화면으로 바꾼다", (next) => {
    expect(safeNextPath(next)).toBe("/trades");
  });
});
