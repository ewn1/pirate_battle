import { test, expect } from "@playwright/test";

test.describe("Pirate Ship Battle - E2E Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should render main menu and navigate to options", async ({ page }) => {
    await expect(page.getByRole("button", { name: /PLAY/i })).toBeVisible();
    await page.getByRole("button", { name: /OPTIONS/i }).click();
    await expect(page.getByText("Match Duration (Seconds)")).toBeVisible();
  });

  test("should update options and return to main menu", async ({ page }) => {
    await page.getByRole("button", { name: /OPTIONS/i }).click();
    const durationInput = page.locator("#sessionTime");
    await durationInput.fill("120");
    await page.getByRole("button", { name: /SAVE/i }).click();
    await expect(page.getByRole("button", { name: /PLAY/i })).toBeVisible();
  });

  test("should load leaderboard via mocked API", async ({ page }) => {
    await page.getByRole("button", { name: /RANKING/i }).click();
    await expect(page.getByText("Blackbeard")).toBeVisible();
  });
});
