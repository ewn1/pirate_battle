/**
 * [SYNC MANAGER]
 * Invisible component mounted once at the app root. It drains the queue of
 * finished-but-unregistered matches (see useMatchStore):
 *
 *   - sends one match at a time through a TanStack Query mutation (Axios);
 *   - on success: removes it from the queue, marks it saved and invalidates
 *     the Ranking and History queries so both tabs show it;
 *   - on a retryable failure (timeout, network, 5xx): keeps it and retries
 *     with exponential backoff (persisted, so it also survives a refresh);
 *   - on a 4xx rejection: marks it "failed" and waits for a manual retry.
 *
 * Because the server is idempotent by match id, a retry after a timeout that
 * actually stored the record returns that record: no duplicates.
 * The queue never blocks gameplay: the player can start another match at any
 * time, even with entries pending.
 */
import { useCallback, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { MatchRecord } from "../services/api/contracts";
import { toApiError } from "../services/api/errors";
import { submitMatch } from "../services/api/endpoints";
import { SCENARIO_EVENT } from "../services/mockControl";
import { runtimeParams } from "../services/runtimeParams";
import { useMatchStore } from "../store/useMatchStore";
import { HISTORY_QUERY_KEY, RANKING_QUERY_KEY } from "../hooks/useMatchQueries";

const MAX_BACKOFF_MS = 30_000;

function backoffDelay(attempts: number): number {
  const base = runtimeParams.retryDelayMs ?? 1000;
  return Math.min(MAX_BACKOFF_MS, base * 2 ** attempts);
}

export function SyncManager() {
  const queryClient = useQueryClient();
  const queue = useMatchStore((state) => state.queue);

  /* ---- [MUTATION] ------------------------------------------------------- */
  const mutation = useMutation({
    mutationFn: (record: MatchRecord) => submitMatch(record),
    retry: 0, // retries are owned by the persisted queue below
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [RANKING_QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: [HISTORY_QUERY_KEY] });
    },
  });

  const mutateRef = useRef(mutation.mutateAsync);
  useEffect(() => {
    mutateRef.current = mutation.mutateAsync;
  });

  /* ---- [FLUSH] ---------------------------------------------------------- */
  const runningRef = useRef(false);

  const flush = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    try {
      for (;;) {
        const state = useMatchStore.getState();
        const now = Date.now();
        const next = state.queue.find(
          (entry) =>
            entry.status === "queued" &&
            entry.nextAttemptAt <= now &&
            !state.inFlight.includes(entry.record.id),
        );
        if (!next) break;

        const id = next.record.id;
        state.setInFlight(id, true);
        try {
          await mutateRef.current(next.record);
          useMatchStore.getState().markSaved(id);
        } catch (error) {
          const apiError = toApiError(error);
          useMatchStore
            .getState()
            .markFailed(
              id,
              apiError.message,
              apiError.retryable,
              Date.now() + backoffDelay(next.attempts),
            );
        } finally {
          useMatchStore.getState().setInFlight(id, false);
        }
      }
    } finally {
      runningRef.current = false;
    }
  }, []);

  /* ---- [TRIGGERS] ------------------------------------------------------- */
  // Queue changed (new match, retry requested, backoff updated): try now and
  // schedule a wake-up for the earliest entry still waiting for its backoff.
  useEffect(() => {
    void flush();
    const now = Date.now();
    const waits = queue
      .filter((entry) => entry.status === "queued" && entry.nextAttemptAt > now)
      .map((entry) => entry.nextAttemptAt - now);
    if (waits.length === 0) return;
    const timer = window.setTimeout(() => void flush(), Math.min(...waits) + 10);
    return () => window.clearTimeout(timer);
  }, [queue, flush]);

  // Connectivity came back or the mock scenario changed: retry immediately.
  useEffect(() => {
    const retryAll = () => useMatchStore.getState().retryAllQueued();
    window.addEventListener("online", retryAll);
    window.addEventListener(SCENARIO_EVENT, retryAll);
    return () => {
      window.removeEventListener("online", retryAll);
      window.removeEventListener(SCENARIO_EVENT, retryAll);
    };
  }, []);

  return null;
}
