/**
 * [MATCH STORE]
 * Local persistence of:
 *   - the last COMPLETED match (so the Result screen survives a refresh), and
 *   - the queue of matches waiting to be registered on the server.
 *
 * A match enters the queue exactly once, when it ends (abandoned matches are
 * never enqueued). Entries are keyed by the match id, which is also the
 * server's idempotency key, so retries and repeated clicks cannot duplicate.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MatchRecord } from "../services/api/contracts";
import type { MatchResult } from "../game/core/types";

export const MATCH_STORAGE_KEY = "pirate-battle:matches:v1";
const MAX_SAVED_IDS = 50;

export interface StoredResult {
  result: MatchResult;
  record: MatchRecord;
}

export interface PendingEntry {
  record: MatchRecord;
  /** "queued": will be (re)sent automatically. "failed": needs a manual retry. */
  status: "queued" | "failed";
  attempts: number;
  lastError: string | null;
  /** Epoch ms before which the entry must not be sent again (backoff). */
  nextAttemptAt: number;
}

export type RegistrationStatus =
  | "saving"
  | "saved"
  | "pending"
  | "failed"
  | "unknown";

interface MatchState {
  lastResult: StoredResult | null;
  queue: PendingEntry[];
  /** Ids already confirmed by the server (kept to ignore stale re-enqueues). */
  saved: string[];
  /** Ids with a request in flight right now. Not persisted. */
  inFlight: string[];

  /** Stores the finished match and queues it for registration (idempotent). */
  completeMatch: (stored: StoredResult) => void;
  setInFlight: (id: string, inFlight: boolean) => void;
  markSaved: (id: string) => void;
  markFailed: (
    id: string,
    error: string,
    retryable: boolean,
    nextAttemptAt: number,
  ) => void;
  /** Manual retry of one entry. */
  retryNow: (id: string) => void;
  /** Makes every automatically-retried entry eligible immediately. */
  retryAllQueued: () => void;
  /** Restores the initial state (used by "Reset mock data"). */
  clearAll: () => void;
}

export const useMatchStore = create<MatchState>()(
  persist(
    (set) => ({
      lastResult: null,
      queue: [],
      saved: [],
      inFlight: [],

      completeMatch: (stored) =>
        set((state) => {
          const id = stored.record.id;
          const alreadyKnown =
            state.saved.includes(id) || state.queue.some((e) => e.record.id === id);
          return {
            lastResult: stored,
            queue: alreadyKnown
              ? state.queue
              : [
                  ...state.queue,
                  {
                    record: stored.record,
                    status: "queued",
                    attempts: 0,
                    lastError: null,
                    nextAttemptAt: 0,
                  },
                ],
          };
        }),

      setInFlight: (id, inFlight) =>
        set((state) => ({
          inFlight: inFlight
            ? state.inFlight.includes(id)
              ? state.inFlight
              : [...state.inFlight, id]
            : state.inFlight.filter((value) => value !== id),
        })),

      markSaved: (id) =>
        set((state) => ({
          queue: state.queue.filter((entry) => entry.record.id !== id),
          saved: [...state.saved.filter((value) => value !== id), id].slice(
            -MAX_SAVED_IDS,
          ),
        })),

      markFailed: (id, error, retryable, nextAttemptAt) =>
        set((state) => ({
          queue: state.queue.map((entry) =>
            entry.record.id === id
              ? {
                  ...entry,
                  attempts: entry.attempts + 1,
                  lastError: error,
                  status: retryable ? "queued" : "failed",
                  nextAttemptAt,
                }
              : entry,
          ),
        })),

      retryNow: (id) =>
        set((state) => ({
          queue: state.queue.map((entry) =>
            entry.record.id === id
              ? { ...entry, status: "queued", nextAttemptAt: 0 }
              : entry,
          ),
        })),

      retryAllQueued: () =>
        set((state) => ({
          queue: state.queue.map((entry) =>
            entry.status === "queued" ? { ...entry, nextAttemptAt: 0 } : entry,
          ),
        })),

      clearAll: () =>
        set({ lastResult: null, queue: [], saved: [], inFlight: [] }),
    }),
    {
      name: MATCH_STORAGE_KEY,
      version: 1,
      partialize: (state) => ({
        lastResult: state.lastResult,
        queue: state.queue,
        saved: state.saved,
      }),
    },
  ),
);

/** Registration status of one match, derived from the store. */
export function selectRegistration(
  state: Pick<MatchState, "queue" | "saved" | "inFlight">,
  id: string,
): RegistrationStatus {
  if (state.saved.includes(id)) return "saved";
  const entry = state.queue.find((e) => e.record.id === id);
  if (!entry) return "unknown";
  if (state.inFlight.includes(id)) return "saving";
  return entry.status === "failed" ? "failed" : "pending";
}
