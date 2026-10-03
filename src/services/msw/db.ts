/**
 * [MOCK DATABASE]
 * Records confirmed by the mock server are persisted in localStorage so they
 * survive refreshes (and are shared by the Ranking and History queries, which
 * keeps both tabs consistent). Fixtures are static and never stored.
 */
import { compareRanking, type MatchRecord } from "../api/contracts";
import { MOCK_DB_STORAGE_KEY } from "../mockControl";
import { FIXTURE_RECORDS } from "./fixtures";

function readStored(): MatchRecord[] {
  try {
    const raw = localStorage.getItem(MOCK_DB_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MatchRecord[]) : [];
  } catch {
    return [];
  }
}

function writeStored(records: MatchRecord[]): void {
  try {
    localStorage.setItem(MOCK_DB_STORAGE_KEY, JSON.stringify(records));
  } catch {
    /* storage unavailable: records live only for this request */
  }
}

/** Fixtures + records submitted by the local player. */
export function allRecords(): MatchRecord[] {
  return [...FIXTURE_RECORDS, ...readStored()];
}

export function findRecord(id: string): MatchRecord | undefined {
  return allRecords().find((record) => record.id === id);
}

/** Inserts a record unless the id already exists. Returns what is stored. */
export function insertRecord(record: MatchRecord): {
  record: MatchRecord;
  inserted: boolean;
} {
  const existing = findRecord(record.id);
  if (existing) return { record: existing, inserted: false };
  writeStored([...readStored(), record]);
  return { record, inserted: true };
}

export function rankRecords(records: MatchRecord[]): MatchRecord[] {
  return [...records].sort(compareRanking);
}

/** Newest first, ties broken by id so pagination is stable. */
export function sortHistory(records: MatchRecord[]): MatchRecord[] {
  return [...records].sort((a, b) => {
    const byDate = Date.parse(b.playedAt) - Date.parse(a.playedAt);
    if (byDate !== 0) return byDate;
    return a.id < b.id ? -1 : 1;
  });
}
