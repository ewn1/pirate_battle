/**
 * [MOCK FIXTURES]
 * Deterministic "other players". Generated with a fixed seed so every run,
 * test and deployment sees exactly the same ranking.
 *
 * For each supported configuration (duration x spawn interval) there are 12
 * players => 3 ranking pages at the default page size of 5.
 */
import { Rng } from "../../game/utils/Random";
import type { MatchRecord } from "../api/contracts";

const CAPTAINS = [
  "Captain Flint",
  "Red Sparrow",
  "Storm Rider",
  "Sea Wolf",
  "Anne Bonny",
  "Calico Jack",
  "Black Bess",
  "Mad Morgan",
  "Iron Hook",
  "Salty Pete",
  "Coral Kate",
  "Dread Roberts",
];

export const FIXTURE_DURATIONS = [60, 90, 120, 150, 180];
export const FIXTURE_SPAWN_INTERVALS_MS = [1000, 2000, 3000, 5000, 10000];

const BASE_TIME = Date.UTC(2026, 8, 1, 12, 0, 0); // 2026-09-01T12:00:00Z
const HOUR = 3_600_000;

function buildFixtures(): MatchRecord[] {
  const rng = new Rng(20260901);
  const records: MatchRecord[] = [];

  for (const sessionTimeSec of FIXTURE_DURATIONS) {
    for (const spawnIntervalMs of FIXTURE_SPAWN_INTERVALS_MS) {
      CAPTAINS.forEach((name, index) => {
        // Faster spawns => more targets => higher potential score.
        const potential = (sessionTimeSec / (spawnIntervalMs / 1000)) * 0.9;
        const score = Math.max(1, Math.round(potential * rng.range(0.25, 1)));
        const sunk = rng.chance(0.3);
        const duration = sunk
          ? Math.round(sessionTimeSec * rng.range(0.35, 0.9))
          : sessionTimeSec;
        records.push({
          id: `fx-${sessionTimeSec}-${spawnIntervalMs}-${index}`,
          playerId: `fx-player-${index}`,
          playerName: name,
          score,
          durationSeconds: duration,
          reason: sunk ? "player_sunk" : "time_expired",
          playedAt: new Date(
            BASE_TIME - Math.round(rng.range(1, 400)) * HOUR,
          ).toISOString(),
          config: { sessionTimeSec, spawnIntervalMs },
        });
      });
    }
  }
  return records;
}

/** Computed once; never mutated. */
export const FIXTURE_RECORDS: readonly MatchRecord[] = buildFixtures();

/** Extra matches used by the "many-pages" scenario for the current player. */
export function generatePlayerHistory(
  playerId: string,
  playerName: string,
  count = 12,
): MatchRecord[] {
  const rng = new Rng(777);
  return Array.from({ length: count }, (_, index) => {
    const sunk = index % 3 === 0;
    const sessionTimeSec = 90;
    return {
      id: `gen-${playerId}-${index}`,
      playerId,
      playerName,
      score: Math.round(rng.range(2, 40)),
      durationSeconds: sunk ? Math.round(rng.range(30, 85)) : sessionTimeSec,
      reason: sunk ? ("player_sunk" as const) : ("time_expired" as const),
      playedAt: new Date(BASE_TIME + (index + 1) * HOUR).toISOString(),
      config: { sessionTimeSec, spawnIntervalMs: 3000 },
    };
  });
}
