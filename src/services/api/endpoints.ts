/**
 * [API ENDPOINTS]
 * Thin typed wrappers around Axios. Every GET accepts the AbortSignal that
 * TanStack Query provides, so superseded requests are cancelled and a late
 * response can never overwrite newer data.
 */
import { apiClient } from "./client";
import {
  API_PATHS,
  type HistoryQuery,
  type MatchRecord,
  type Page,
  type RankingEntry,
  type RankingQuery,
  type SubmitMatchResponse,
} from "./contracts";

export async function fetchRanking(
  query: RankingQuery,
  signal?: AbortSignal,
): Promise<Page<RankingEntry>> {
  const { data } = await apiClient.get<Page<RankingEntry>>(API_PATHS.ranking, {
    params: {
      page: query.page,
      pageSize: query.pageSize,
      sessionTimeSec: query.config.sessionTimeSec,
      spawnIntervalMs: query.config.spawnIntervalMs,
    },
    signal,
  });
  return data;
}

export async function fetchHistory(
  query: HistoryQuery,
  signal?: AbortSignal,
): Promise<Page<MatchRecord>> {
  const { data } = await apiClient.get<Page<MatchRecord>>(API_PATHS.history, {
    params: {
      playerId: query.playerId,
      page: query.page,
      pageSize: query.pageSize,
    },
    signal,
  });
  return data;
}

/** Idempotent: sending the same `id` twice returns the stored record. */
export async function submitMatch(
  record: MatchRecord,
): Promise<SubmitMatchResponse> {
  const { data } = await apiClient.post<SubmitMatchResponse>(
    API_PATHS.history,
    record,
  );
  return data;
}
