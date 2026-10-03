/**
 * [RUNTIME PARAMS]
 * Central place for URL flags used by tests, mocks and profiling.
 * Values are read once at startup and kept in sessionStorage so they survive
 * client-side navigation and page reloads inside the same tab.
 *
 * Supported flags (all optional):
 *   ?e2e=1            expose window.__PIRATE_TEST__ (test instrumentation)
 *   ?manual=1         manual simulation clock (tests advance time via step())
 *   ?seed=123         seed for the simulation RNG (spawns, spawn types)
 *   ?mockSeed=7       seed for the mock API RNG (variable latency)
 *   ?latencyScale=0   multiplier applied to every simulated mock latency
 *   ?apiTimeout=800   Axios timeout in ms (default 4000)
 *   ?retryDelay=50    TanStack Query retry delay in ms (default exponential)
 *   ?perf=1           collect frame-time metrics in window.__PIRATE_PERF__
 *   ?touch=1          force the on-screen touch controls (desktop debugging)
 *   ?e2e=0            clears every stored flag
 */
const STORAGE_KEY = "pirate-battle:runtime-params";
const KNOWN_KEYS = [
  "e2e",
  "manual",
  "seed",
  "mockSeed",
  "latencyScale",
  "apiTimeout",
  "retryDelay",
  "perf",
  "touch",
] as const;

type Key = (typeof KNOWN_KEYS)[number];
type Stored = Partial<Record<Key, string>>;

function readStored(): Stored {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "{}") as Stored;
  } catch {
    return {};
  }
}

function resolveRaw(): Stored {
  if (typeof window === "undefined") return {};
  const url = new URLSearchParams(window.location.search);

  // `?e2e=0` resets everything.
  if (url.get("e2e") === "0") {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage unavailable */
    }
    return {};
  }

  const merged = readStored();
  let changed = false;
  for (const key of KNOWN_KEYS) {
    const value = url.get(key);
    if (value !== null) {
      merged[key] = value;
      changed = true;
    }
  }
  if (changed) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch {
      /* storage unavailable */
    }
  }
  return merged;
}

const raw = resolveRaw();

function num(key: Key): number | null {
  const value = raw[key];
  if (value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export const runtimeParams = {
  /** True when test instrumentation must be exposed on `window`. */
  e2e: raw.e2e !== undefined || import.meta.env.DEV,
  manualClock: raw.manual === "1",
  seed: num("seed"),
  mockSeed: num("mockSeed") ?? 1,
  latencyScale: num("latencyScale") ?? 1,
  apiTimeoutMs: num("apiTimeout") ?? 4000,
  retryDelayMs: num("retryDelay"),
  perf: raw.perf === "1",
  forceTouch: raw.touch === "1",
} as const;
