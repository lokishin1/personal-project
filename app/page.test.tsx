import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import Home from "@/app/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

test("홈 화면은 앱 제목과 종목 검색 입력을 보여준다", () => {
  render(<Home />);

  expect(screen.getByRole("heading", { level: 1, name: "종목 한눈에 보기" })).toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: "종목 검색" })).toBeInTheDocument();
});
