/**
 * [MSW HANDLERS]
 * REST mock of the ranking and history APIs. Contracts come from
 * `services/api/contracts.ts`; fixtures from `fixtures.ts`; persistence from
 * `db.ts`. The same handlers run in development, tests and the deployed build.
 *
 * Behaviour is driven by the active scenario (see `mockControl.ts`).
 * Latency is seeded (`?mockSeed=`) and scalable (`?latencyScale=0` in tests).
 */
import { delay, http, HttpResponse, passthrough } from "msw";
import { Rng } from "../../game/utils/Random";
import {
  DEFAULT_PAGE_SIZE,
  type MatchRecord,
  type Page,
  type RankingEntry,
  type SubmitMatchResponse,
} from "../api/contracts";
import { runtimeParams } from "../runtimeParams";
import {
  FAIL_ASSETS_STORAGE_KEY,
  getScenario,
  type ScenarioId,
} from "../mockControl";
import {
  allRecords,
  findRecord,
  insertRecord,
  rankRecords,
  sortHistory,
} from "./db";
import { generatePlayerHistory } from "./fixtures";

/* -------------------------------------------------------------------------- */
/* [LATENCY]                                                                  */
/* -------------------------------------------------------------------------- */

const BASE_LATENCY_MS = 120;
const latencyRng = new Rng(runtimeParams.mockSeed);

type Endpoint = "ranking" | "history" | "submit";

function latencyFor(scenario: ScenarioId, page: number): number {
  let ms = BASE_LATENCY_MS;
  if (scenario === "slow") ms = 2500;
  else if (scenario === "variable-latency") ms = latencyRng.range(100, 1200);
  else if (scenario === "out-of-order") ms = page <= 1 ? 1200 : 80;
  return Math.round(ms * runtimeParams.latencyScale);
}

/* -------------------------------------------------------------------------- */
/* [FAILURE INJECTION]                                                        */
/* -------------------------------------------------------------------------- */

function errorBody(code: string, message: string) {
  return { code, message };
}

/**
 * Returns a failing response for the scenario/endpoint pair, or null when the
 * request should succeed. "timeout" never resolves, so the client gives up.
 */
async function failureFor(
  scenario: ScenarioId,
  endpoint: Endpoint,
): Promise<Response | null> {
  const short = Math.round(150 * runtimeParams.latencyScale);

  switch (scenario) {
    case "timeout":
      await delay("infinite");
      return null;
    case "network-error":
      await delay(short);
      return HttpResponse.error();
    case "http-4xx":
      await delay(short);
      return HttpResponse.json(errorBody("forbidden", "Access denied."), {
        status: 403,
      });
    case "http-5xx":
      await delay(short);
      return HttpResponse.json(
        errorBody("internal_error", "Something went wrong on the server."),
        { status: 500 },
      );
    case "ranking-fails":
      if (endpoint !== "ranking") return null;
      await delay(short);
      return HttpResponse.json(
        errorBody("ranking_unavailable", "The ranking is unavailable."),
        { status: 500 },
      );
    case "history-fails":
      if (endpoint !== "history") return null;
      await delay(short);
      return HttpResponse.json(
        errorBody("history_unavailable", "The match history is unavailable."),
        { status: 500 },
      );
    case "submit-unavailable":
      if (endpoint !== "submit") return null;
      await delay(short);
      return HttpResponse.json(
        errorBody("registration_unavailable", "Registration is unavailable."),
        { status: 503, headers: { "Retry-After": "5" } },
      );
    default:
      return null;
  }
}

/* -------------------------------------------------------------------------- */
/* [HELPERS]                                                                  */
/* -------------------------------------------------------------------------- */

function intParam(url: URL, name: string, fallback: number, min = 1): number {
  const value = Number(url.searchParams.get(name));
  return Number.isInteger(value) && value >= min ? value : fallback;
}

function paginate<T>(items: T[], page: number, pageSize: number): Page<T> {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page,
    pageSize,
    total: items.length,
    totalPages,
  };
}

function isValidRecord(body: unknown): body is MatchRecord {
  if (typeof body !== "object" || body === null) return false;
  const r = body as Partial<MatchRecord>;
  return (
    typeof r.id === "string" &&
    r.id.length > 0 &&
    typeof r.playerId === "string" &&
    typeof r.playerName === "string" &&
    typeof r.score === "number" &&
    Number.isFinite(r.score) &&
    r.score >= 0 &&
    typeof r.durationSeconds === "number" &&
    r.durationSeconds >= 0 &&
    (r.reason === "time_expired" || r.reason === "player_sunk") &&
    typeof r.playedAt === "string" &&
    !Number.isNaN(Date.parse(r.playedAt)) &&
    typeof r.config?.sessionTimeSec === "number" &&
    typeof r.config?.spawnIntervalMs === "number"
  );
}

/* -------------------------------------------------------------------------- */
/* [HANDLERS]                                                                 */
/* -------------------------------------------------------------------------- */

export const handlers = [
  /* ---- GET /api/ranking ------------------------------------------------- */
  http.get("/api/ranking", async ({ request }) => {
    const scenario = getScenario();
    const url = new URL(request.url);
    const page = intParam(url, "page", 1);
    const pageSize = intParam(url, "pageSize", DEFAULT_PAGE_SIZE);

    const failure = await failureFor(scenario, "ranking");
    if (failure) return failure;
    await delay(latencyFor(scenario, page));

    if (scenario === "empty") {
      return HttpResponse.json(paginate<RankingEntry>([], page, pageSize));
    }

    const sessionTimeSec = Number(url.searchParams.get("sessionTimeSec"));
    const spawnIntervalMs = Number(url.searchParams.get("spawnIntervalMs"));

    // Only matches played with the same configuration are comparable.
    const comparable = allRecords().filter(
      (record) =>
        record.config.sessionTimeSec === sessionTimeSec &&
        record.config.spawnIntervalMs === spawnIntervalMs,
    );
    const ranked: RankingEntry[] = rankRecords(comparable).map(
      (record, index) => ({ ...record, rank: index + 1 }),
    );
    return HttpResponse.json(paginate(ranked, page, pageSize));
  }),

  /* ---- GET /api/history ------------------------------------------------- */
  http.get("/api/history", async ({ request }) => {
    const scenario = getScenario();
    const url = new URL(request.url);
    const playerId = url.searchParams.get("playerId");
    const page = intParam(url, "page", 1);
    const pageSize = intParam(url, "pageSize", DEFAULT_PAGE_SIZE);

    if (!playerId) {
      return HttpResponse.json(
        errorBody("missing_player", "playerId is required."),
        { status: 400 },
      );
    }

    const failure = await failureFor(scenario, "history");
    if (failure) return failure;
    await delay(latencyFor(scenario, page));

    if (scenario === "empty") {
      return HttpResponse.json(paginate<MatchRecord>([], page, pageSize));
    }

    let records = allRecords().filter((record) => record.playerId === playerId);
    if (scenario === "many-pages") {
      records = [...records, ...generatePlayerHistory(playerId, "You")];
    }
    return HttpResponse.json(paginate(sortHistory(records), page, pageSize));
  }),

  /* ---- POST /api/history (idempotent) ----------------------------------- */
  http.post("/api/history", async ({ request }) => {
    const scenario = getScenario();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      body = null;
    }
    if (!isValidRecord(body)) {
      return HttpResponse.json(
        errorBody("invalid_payload", "The match record is invalid."),
        { status: 400 },
      );
    }

    const failure = await failureFor(scenario, "submit");
    if (failure) return failure;
    await delay(latencyFor(scenario, 1));

    // Same id => same record. No duplicate in history or ranking.
    const existing = findRecord(body.id);
    if (existing) {
      const response: SubmitMatchResponse = { record: existing, duplicate: true };
      return HttpResponse.json(response, { status: 200 });
    }

    const { record } = insertRecord(body);

    if (scenario === "timeout-after-register") {
      // The record IS stored, but the answer never arrives: the client times
      // out and its retry finds the existing record (duplicate: true).
      await delay("infinite");
    }

    const response: SubmitMatchResponse = { record, duplicate: false };
    return HttpResponse.json(response, { status: 201 });
  }),

  /* ---- Test-only: make a texture request fail --------------------------- */
  http.get("/assets/png/default/ships/ship_1.png", () => {
    let fail = false;
    try {
      fail = localStorage.getItem(FAIL_ASSETS_STORAGE_KEY) === "1";
    } catch {
      /* storage unavailable */
    }
    return fail ? HttpResponse.error() : passthrough();
  }),
];
