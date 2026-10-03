/**
 * [API CONTRACTS]
 * Typed request/response shapes shared by the HTTP client, the MSW handlers,
 * the fixtures and the React layer. Single source of truth for the REST API.
 *
 *   GET  /api/ranking?page&pageSize&sessionTimeSec&spawnIntervalMs
 *   GET  /api/history?playerId&page&pageSize
 *   POST /api/history            (idempotent by `id`)
 */
import type { ConfigSnapshot } from "../../game/config/GameConfig";
import type { EndReason } from "../../game/core/types";

export type { ConfigSnapshot, EndReason };

/** One finished match. `id` is the match id and the idempotency key. */
export interface MatchRecord {
  id: string;
  playerId: string;
  playerName: string;
  score: number;
  /** Effective (active) play time in seconds. */
  durationSeconds: number;
  reason: EndReason;
  /** ISO date-time when the match ended. */
  playedAt: string;
  /** Configuration used by the match. */
  config: ConfigSnapshot;
}

export interface RankingEntry extends MatchRecord {
  /** 1-based position inside the full (not only the current page) ranking. */
  rank: number;
}

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface RankingQuery {
  page: number;
  pageSize: number;
  /** Only matches played with this configuration are compared. */
  config: ConfigSnapshot;
}

export interface HistoryQuery {
  playerId: string;
  page: number;
  pageSize: number;
}

/** Body of POST /api/history. */
export type SubmitMatchRequest = MatchRecord;

export interface SubmitMatchResponse {
  record: MatchRecord;
  /** True when the record already existed (retry / repeated click). */
  duplicate: boolean;
}

export interface ApiErrorBody {
  code: string;
  message: string;
}

export const API_PATHS = {
  ranking: "/ranking",
  history: "/history",
} as const;

export const DEFAULT_PAGE_SIZE = 5;

/**
 * Deterministic ranking order, shared by the mock server:
 *   1. higher score first
 *   2. shorter duration first
 *   3. earlier `playedAt` first
 *   4. `id` ascending (final, total order)
 */
export function compareRanking(a: MatchRecord, b: MatchRecord): number {
  if (b.score !== a.score) return b.score - a.score;
  if (a.durationSeconds !== b.durationSeconds) {
    return a.durationSeconds - b.durationSeconds;
  }
  const byDate = Date.parse(a.playedAt) - Date.parse(b.playedAt);
  if (byDate !== 0) return byDate;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}
