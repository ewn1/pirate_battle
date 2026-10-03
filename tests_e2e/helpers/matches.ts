/** [E2E HELPER: QUICK MATCH] Plays a short losing match so there is a result to register. */
import type { Page } from "@playwright/test";
import { openWater, setHealth, snapshot, spawnEnemy, step, teleport, waitForStatus } from "./fixtures";

/** From the menu: Play -> sink the ship with a Chaser -> result panel is shown. */
export async function playAndLose(page: Page): Promise<void> {
  await page.getByTestId("play-button").click();
  await waitForStatus(page, "running");
  const spot = await openWater(page, 200);
  await teleport(page, spot.x, spot.y, 0);
  await setHealth(page, 1);
  await spawnEnemy(page, "chaser", spot.x + 90, spot.y);
  await step(page, 3000);
  await waitForStatus(page, "over");
  const snap = await snapshot(page);
  if (snap.result?.reason !== "player_sunk") throw new Error("expected player_sunk");
}
