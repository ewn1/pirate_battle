/**
 * [MATCH QUERIES]
 * TanStack Query hooks for the Ranking and Match History tabs.
 *
 * - Query keys include the page (and configuration / player), so each page is
 *   cached separately and a LATE response can only fill its own key: it can
 *   never overwrite the data of the page currently displayed.
 * - The AbortSignal is forwarded to Axios, cancelling superseded requests.
 * - `refetchOnMount: "always"` refreshes a tab every time it is shown again.
 * - After a match is registered the SyncManager invalidates both keys.
 * - `keepPreviousData` keeps the old page on screen while the next one loads.
 */
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { configKey, type ConfigSnapshot } from "../game/config/GameConfig";
import { DEFAULT_PAGE_SIZE } from "../services/api/contracts";
import { fetchHistory, fetchRanking } from "../services/api/endpoints";

export const RANKING_QUERY_KEY = "ranking";
export const HISTORY_QUERY_KEY = "history";

const STALE_TIME_MS = 15_000;

export function useRankingQuery(config: ConfigSnapshot, page: number) {
  return useQuery({
    queryKey: [RANKING_QUERY_KEY, configKey(config), page],
    queryFn: ({ signal }) =>
      fetchRanking({ page, pageSize: DEFAULT_PAGE_SIZE, config }, signal),
    placeholderData: keepPreviousData,
    staleTime: STALE_TIME_MS,
    refetchOnMount: "always",
  });
}

export function useHistoryQuery(playerId: string, page: number) {
  return useQuery({
    queryKey: [HISTORY_QUERY_KEY, playerId, page],
    queryFn: ({ signal }) =>
      fetchHistory({ playerId, page, pageSize: DEFAULT_PAGE_SIZE }, signal),
    placeholderData: keepPreviousData,
    staleTime: STALE_TIME_MS,
    refetchOnMount: "always",
  });
}
