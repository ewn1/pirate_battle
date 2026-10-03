/**
 * [MOCK CONTROL]
 * UI-facing controls of the mock API: scenario selection and reset.
 * Kept free of MSW / fixtures imports so the React layer can use it without
 * pulling the mock server into its bundle path.
 *
 * Selecting a scenario:
 *   - UI: "Network simulation" panel in the Captain's Log screen
 *   - URL: `?scenario=timeout` (stored, survives refresh)
 *   - Console: localStorage.setItem("pirate-battle:scenario", "http-5xx")
 */

export const SCENARIO_STORAGE_KEY = "pirate-battle:scenario";
export const MOCK_DB_STORAGE_KEY = "pirate-battle:mock-db:v1";
/** Test-only failure injection: texture requests fail while this is "1". */
export const FAIL_ASSETS_STORAGE_KEY = "pirate-battle:fail-assets";
export const SCENARIO_EVENT = "pirate-battle:scenario-changed";

export const SCENARIOS = [
  {
    id: "success",
    label: "Success",
    description: "Everything works. Ranking has several pages.",
  },
  {
    id: "empty",
    label: "Empty lists",
    description: "Ranking and history return no records.",
  },
  {
    id: "many-pages",
    label: "Many pages",
    description: "Your history is filled with 12 extra matches (3 pages).",
  },
  {
    id: "slow",
    label: "Slow network",
    description: "Every request takes about 2.5 seconds.",
  },
  {
    id: "variable-latency",
    label: "Variable latency",
    description: "Seeded random latency between 100 ms and 1.2 s.",
  },
  {
    id: "out-of-order",
    label: "Out-of-order responses",
    description: "Page 1 answers slowly, other pages answer fast.",
  },
  {
    id: "timeout",
    label: "Timeout (all requests)",
    description: "Requests never answer; the client times out.",
  },
  {
    id: "network-error",
    label: "Connection failure",
    description: "Every request fails with a network error.",
  },
  {
    id: "http-4xx",
    label: "HTTP 4xx",
    description: "Every request is rejected with HTTP 403.",
  },
  {
    id: "http-5xx",
    label: "HTTP 5xx",
    description: "Every request fails with HTTP 500.",
  },
  {
    id: "ranking-fails",
    label: "Ranking query fails",
    description: "Only GET /ranking fails (HTTP 500).",
  },
  {
    id: "history-fails",
    label: "History query fails",
    description: "Only GET /history fails (HTTP 500).",
  },
  {
    id: "timeout-after-register",
    label: "Timeout after registering",
    description:
      "The server stores the match but never answers. The retry recovers it without duplicates.",
  },
  {
    id: "submit-unavailable",
    label: "Registration unavailable",
    description:
      "POST /history returns HTTP 503. Switch to another scenario to recover.",
  },
] as const;

export type ScenarioId = (typeof SCENARIOS)[number]["id"];

const SCENARIO_IDS = new Set<string>(SCENARIOS.map((s) => s.id));

export function isScenarioId(value: string | null): value is ScenarioId {
  return value !== null && SCENARIO_IDS.has(value);
}

export function getScenario(): ScenarioId {
  try {
    const stored = localStorage.getItem(SCENARIO_STORAGE_KEY);
    if (isScenarioId(stored)) return stored;
  } catch {
    /* storage unavailable */
  }
  return "success";
}

export function setScenario(id: ScenarioId): void {
  try {
    localStorage.setItem(SCENARIO_STORAGE_KEY, id);
  } catch {
    /* storage unavailable */
  }
  window.dispatchEvent(new CustomEvent(SCENARIO_EVENT, { detail: id }));
}

/** Applies `?scenario=` once at startup (before the first request). */
export function applyScenarioFromUrl(): void {
  if (typeof window === "undefined") return;
  const fromUrl = new URLSearchParams(window.location.search).get("scenario");
  if (isScenarioId(fromUrl)) setScenario(fromUrl);
}

/** Restores the mock server to its initial state (scenario + stored records). */
export function resetMockData(): void {
  try {
    localStorage.removeItem(MOCK_DB_STORAGE_KEY);
    localStorage.removeItem(SCENARIO_STORAGE_KEY);
  } catch {
    /* storage unavailable */
  }
  window.dispatchEvent(new CustomEvent(SCENARIO_EVENT, { detail: "success" }));
}
