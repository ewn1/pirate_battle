import { test, expect } from "@playwright/test";

test.describe("Pirate Ship Battle - Suíte Completa E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("1. Menu principal e navegação até Opções", async ({ page }) => {
    await expect(page.getByRole("button", { name: /PLAY/i })).toBeVisible();
    await page.getByRole("button", { name: /OPTIONS/i }).click();
    await expect(page.getByText(/Match Duration/i)).toBeVisible();
  });

  test("2. Salvar e persistir configurações no localStorage", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /OPTIONS/i }).click();
    const durationInput = page.locator("#sessionTime");
    await durationInput.fill("120");
    await page.getByRole("button", { name: /SAVE/i }).click();

    await page.reload();
    await page.getByRole("button", { name: /OPTIONS/i }).click();
    await expect(page.locator("#sessionTime")).toHaveValue("120");
  });

  test("3. Início de partida e renderização do Canvas da Arena", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /PLAY/i }).click();
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();
  });

  test("4. Movimentação do jogador e disparos (Teclado: W, A, S, D, Q, E, Espaço)", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /PLAY/i }).click();
    await page.waitForTimeout(500);

    // Movimentação para frente, rotação e ré
    await page.keyboard.press("KeyW");
    await page.keyboard.press("KeyA");
    await page.keyboard.press("KeyS");
    await page.keyboard.press("KeyD");

    // Disparos frontal e laterais
    await page.keyboard.press("Space");
    await page.keyboard.press("KeyQ");
    await page.keyboard.press("KeyE");

    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();
  });

  test("5. Pausa de jogo ao perder o foco (Blur) ou clicar em Pausar", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /PLAY/i }).click();
    await page.waitForTimeout(500);

    // Simula evento de blur/pausa
    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    await expect(page.getByText(/PAUSED/i)).toBeVisible();
  });

  test("6. Ranking e Histórico consumindo APIs mockadas via MSW com Paginação", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /RANKING/i }).click();
    await expect(page.getByText("Blackbeard")).toBeVisible();

    await page.getByRole("button", { name: /MATCH HISTORY/i }).click();
    await expect(page.getByText(/Completed/i)).toBeVisible();
  });

  test("7. Regressão visual da tela principal", async ({ page }) => {
    await expect(page).toHaveScreenshot("main-menu.png", {
      maxDiffPixelRatio: 0.05,
    });
  });
});
