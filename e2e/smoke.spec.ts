import { expect, test } from "@playwright/test";

test("홈 화면이 열리고 종목 검색 입력이 보인다", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("종목 한눈에 보기");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("종목 한눈에 보기");
  await expect(page.getByRole("combobox", { name: "종목 검색" })).toBeVisible();
});
