/** [E2E: MOVEMENT] Keyboard movement, arena limits and island collisions. */
import { expect, holdKey, openGame, openWater, snapshot, step, teleport, test } from "./helpers/fixtures";

test.describe("Movement", () => {
  test.beforeEach(async ({ page }) => {
    await openGame(page);
  });

  test("W moves forward, S slows/reverses, A/D rotate", async ({ page }) => {
    const spot = await openWater(page);
    await teleport(page, spot.x, spot.y, 0);
    const before = await snapshot(page);

    await holdKey(page, "KeyW", 500);
    const forward = await snapshot(page);
    expect(forward.player.x).toBeGreaterThan(before.player.x);

    await holdKey(page, "KeyD", 400);
    const right = await snapshot(page);
    expect(right.player.heading).toBeGreaterThan(forward.player.heading);

    await holdKey(page, "KeyA", 800);
    const left = await snapshot(page);
    expect(left.player.heading).toBeLessThan(right.player.heading);

    await holdKey(page, "KeyS", 1500);
    expect((await snapshot(page)).player.speed).toBeLessThan(forward.player.speed);
  });

  test("arrow keys work like WASD", async ({ page }) => {
    const spot = await openWater(page);
    await teleport(page, spot.x, spot.y, 0);
    const before = await snapshot(page);
    await holdKey(page, "ArrowUp", 500);
    expect((await snapshot(page)).player.x).toBeGreaterThan(before.player.x);
  });

  test("the ship never leaves the arena", async ({ page }) => {
    const snap = await snapshot(page);
    await teleport(page, snap.arena.width - 40, snap.arena.height / 2, 0);
    await holdKey(page, "KeyW", 4000);
    const after = await snapshot(page);
    expect(after.player.x).toBeLessThanOrEqual(after.arena.width);
    expect(after.player.x).toBeGreaterThanOrEqual(0);
    expect(after.player.y).toBeGreaterThanOrEqual(0);
    expect(after.player.y).toBeLessThanOrEqual(after.arena.height);
  });

  test("islands block the ship", async ({ page }) => {
    const snap = await snapshot(page);
    const island = snap.islands[0];
    // Approach the island from the left, heading right.
    await teleport(page, island.x - island.radius - 90, island.y, 0);
    await holdKey(page, "KeyW", 3000);
    const after = await snapshot(page);
    const distance = Math.hypot(after.player.x - island.x, after.player.y - island.y);
    expect(distance).toBeGreaterThanOrEqual(island.radius + 10);
    await step(page, 200);
  });
});
