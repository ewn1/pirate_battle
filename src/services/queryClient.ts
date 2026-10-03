/**
 * [QUERY CLIENT]
 * One shared TanStack Query client. Exported as a singleton so non-React code
 * (mock reset, sync manager) can invalidate caches too.
 */
import { QueryClient } from "@tanstack/react-query";
import { shouldRetryQuery } from "./api/errors";
import { runtimeParams } from "./runtimeParams";

/** Exponential backoff capped at 4 s; fixed value when `?retryDelay=` is set. */
export function queryRetryDelay(attempt: number): number {
  if (runtimeParams.retryDelayMs !== null) return runtimeParams.retryDelayMs;
  return Math.min(1000 * 2 ** attempt, 4000);
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetryQuery,
      retryDelay: queryRetryDelay,
      refetchOnReconnect: true,
    },
  },
});
