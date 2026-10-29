import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import Home from "@/app/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// 지수 영역은 서버에서 Yahoo를 부르는 비동기 컴포넌트라 이 테스트에서는 빈 자리로 둔다.
vi.mock("@/components/market-flow/market-overview", () => ({
  MarketOverview: () => <div data-testid="market-overview" />,
}));

test("홈 화면은 오늘의 시장, 오늘의 신호·매매 기록 링크, 종목 검색을 보여준다", () => {
  render(<Home />);

  expect(screen.getByRole("heading", { level: 1, name: "오늘의 시장" })).toBeInTheDocument();
  expect(screen.getByTestId("market-overview")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "오늘의 신호 보기" })).toHaveAttribute("href", "/signals");
  expect(screen.getByRole("link", { name: "매매 기록 보기" })).toHaveAttribute("href", "/trades");
  expect(screen.getByRole("combobox", { name: "종목 검색" })).toBeInTheDocument();
});
