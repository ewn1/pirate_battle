/**
 * [MATCH TYPES]
 * Types shared between the engine, the React layer and the API contracts.
 */
import type { ConfigSnapshot } from "../config/GameConfig";

export type EndReason = "time_expired" | "player_sunk";

export type EngineStatus =
  | "loading"
  | "running"
  | "paused"
  | "over"
  | "destroyed";

export type PauseReason = "manual" | "blur" | "hidden";

/** Emitted once when a match ends. */
export interface MatchResult {
  matchId: string;
  reason: EndReason;
  score: number;
  /** Active play time in seconds (paused time is not counted). */
  durationSeconds: number;
  /** Enemies destroyed by the player's attacks (equals score). */
  kills: number;
  endedAt: string;
  config: ConfigSnapshot;
}
