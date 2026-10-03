/** [E2E: COMBAT] Weapons, cooldowns, damage, scoring and enemy behaviour. */
import {
  expect,
  holdKey,
  openGame,
  openLane,
  openWater,
  snapshot,
  spawnEnemy,
  step,
  stepTrackEnemyShots,
  teleport,
  test,
} from "./helpers/fixtures";

test.describe("Combat", () => {
  test.beforeEach(async ({ page }) => {
    await openGame(page);
  });

  test("frontal shot spawns a projectile and respects the cooldown", async ({
    page,
  }) => {
    const spot = await openWater(page);
    await teleport(page, spot.x, spot.y, 0);
    // NOTE: keys are HELD across simulation steps (the engine samples input per step).
    await holdKey(page, "Space", 50);
    expect((await snapshot(page)).projectiles.player).toBe(1);

    // Pressing again inside the cooldown does not add projectiles.
    await holdKey(page, "Space", 50);
    expect((await snapshot(page)).projectiles.player).toBe(1);

    await step(page, 600);
    await holdKey(page, "Space", 50);
    expect((await snapshot(page)).projectiles.player).toBe(2);
  });

  test("broadside fires a volley of three, with its own cooldown", async ({
    page,
  }) => {
    const spot = await openWater(page);
    await teleport(page, spot.x, spot.y, 0);
    await holdKey(page, "KeyQ", 50);
    expect((await snapshot(page)).projectiles.player).toBe(3);
    await holdKey(page, "KeyQ", 50);
    expect((await snapshot(page)).projectiles.player).toBe(3);
    // The other side is independent.
    await holdKey(page, "KeyE", 50);
    expect((await snapshot(page)).projectiles.player).toBe(6);
  });

  test("a hit damages the enemy once and a kill scores exactly one point", async ({
    page,
  }) => {
    const lane = await openLane(page, 320);
    await teleport(page, lane.x, lane.y, 0);
    const id = await spawnEnemy(page, "chaser", lane.x + 300, lane.y);

    // First shot: damages (30 HP - 25) but does not kill.
    await holdKey(page, "Space", 50);
    await step(page, 550); // > 0.5 s cooldown (and the projectile has landed)
    let snap = await snapshot(page);
    const hit = snap.enemies.find((e) => e.id === id);
    expect(hit?.alive).toBe(true);
    expect(hit?.health).toBe(5);
    expect(snap.score).toBe(0);

    // Second shot after the cooldown: kills it.
    await holdKey(page, "Space", 50);
    await step(page, 450);
    snap = await snapshot(page);
    expect(snap.score).toBe(1);

    // The kill is never counted twice.
    await step(page, 3000);
    expect((await snapshot(page)).score).toBe(1);
  });

  test("a Chaser that touches the player explodes and damages it", async ({
    page,
  }) => {
    const spot = await openWater(page, 200);
    await teleport(page, spot.x, spot.y, 0);
    const before = (await snapshot(page)).player.health;
    await spawnEnemy(page, "chaser", spot.x + 120, spot.y);
    await step(page, 3000);
    const snap = await snapshot(page);
    expect(snap.player.health).toBeLessThan(before);
    expect(snap.score).toBe(0); // dying by ramming does not score
  });

  test("a Shooter fires at the player when in range", async ({ page }) => {
    const spot = await openWater(page, 200);
    await teleport(page, spot.x, spot.y, 0);
    await spawnEnemy(page, "shooter", spot.x + 220, spot.y);
    const peak = await stepTrackEnemyShots(page, 4000, 100);
    expect(peak).toBeGreaterThan(0);
  });

  test("enemies spawn on the configured interval, away from the player", async ({
    page,
  }) => {
    const first = await snapshot(page);
    expect(first.counts.spawned).toBeLessThanOrEqual(1);
    await step(page, 3100);
    const second = await snapshot(page);
    expect(second.counts.spawned).toBeGreaterThan(first.counts.spawned);
    for (const enemy of second.enemies.filter((e) => e.alive)) {
      expect(enemy.x).toBeGreaterThanOrEqual(0);
      expect(enemy.x).toBeLessThanOrEqual(second.arena.width);
      expect(enemy.y).toBeGreaterThanOrEqual(0);
      expect(enemy.y).toBeLessThanOrEqual(second.arena.height);
    }
  });
});
