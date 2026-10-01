import { http, HttpResponse } from "msw";

export interface GameConfigSnapshot {
  gameTime: number;
  spawnTime: number;
}

export interface MatchRecord {
  id: string;
  playerId: string;
  playerName: string;
  score: number;
  duration: number;
  reason: "time_expired" | "player_sunk";
  survived: boolean;
  createdAt: string;
  config: GameConfigSnapshot;
}

const STORAGE_KEY_HISTORY = "pirate_battle_match_history";

const getStoredHistory = (): MatchRecord[] => {
  const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
  if (!saved) {
    const initialHistory: MatchRecord[] = [
      {
        id: "m1",
        playerId: "p1",
        playerName: "The Codefather",
        score: 9999,
        duration: 120,
        reason: "time_expired",
        survived: true,
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
        config: { gameTime: 120, spawnTime: 3 },
      },
      {
        id: "m2",
        playerId: "p2",
        playerName: "Anne Bonny",
        score: 1800,
        duration: 95,
        reason: "time_expired",
        survived: true,
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
        config: { gameTime: 120, spawnTime: 3 },
      },
      {
        id: "m3",
        playerId: "p3",
        playerName: "Calico Jack",
        score: 1500,
        duration: 80,
        reason: "time_expired",
        survived: false,
        createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
        config: { gameTime: 120, spawnTime: 3 },
      },
      {
        id: "m4",
        playerId: "p4",
        playerName: "Captain Morgan",
        score: 1200,
        duration: 95,
        reason: "player_sunk",
        survived: false,
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        config: { gameTime: 120, spawnTime: 3 },
      },
    ];
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(initialHistory));
    return initialHistory;
  }
  return JSON.parse(saved);
};

export const handlers = [
  // GET /api/leaderboard?page=1&limit=5
  http.get("/api/leaderboard", ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") || 1);
    const limit = Number(url.searchParams.get("limit") || 5);

    const history = getStoredHistory();

    // Ordenação por pontuação (maior primeiro) e desempate determinístico por data de criação
    const sorted = [...history].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    const ranked = sorted.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

    const startIndex = (page - 1) * limit;
    const paginated = ranked.slice(startIndex, startIndex + limit);
    const totalPages = Math.ceil(ranked.length / limit) || 1;

    return HttpResponse.json({
      items: paginated,
      total: ranked.length,
      page,
      totalPages,
    });
  }),

  // GET /api/history?page=1&limit=5
  http.get("/api/history", ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") || 1);
    const limit = Number(url.searchParams.get("limit") || 5);

    const history = getStoredHistory();
    // Ordenar histórico por data mais recente
    const sorted = [...history].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const startIndex = (page - 1) * limit;
    const paginated = sorted.slice(startIndex, startIndex + limit);
    const totalPages = Math.ceil(sorted.length / limit) || 1;

    return HttpResponse.json({
      items: paginated,
      total: sorted.length,
      page,
      totalPages,
    });
  }),

  // POST /api/history
  http.post("/api/history", async ({ request }) => {
    const body = (await request.json()) as Partial<MatchRecord>;
    const history = getStoredHistory();

    // Prevenção de duplicatas por ID
    const existingIndex = history.findIndex((h) => h.id === body.id);
    if (existingIndex >= 0) {
      return HttpResponse.json(history[existingIndex], { status: 200 });
    }

    const newRecord: MatchRecord = {
      id: body.id || `m_${Date.now()}`,
      playerId: body.playerId || "player_local",
      playerName: body.playerName || "Captain Anonymous",
      score: body.score ?? 0,
      duration: body.duration ?? 0,
      reason: body.reason || "time_expired",
      survived: body.survived ?? true,
      createdAt: body.createdAt || new Date().toISOString(),
      config: body.config || { gameTime: 120, spawnTime: 3 },
    };

    history.push(newRecord);
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));

    return HttpResponse.json(newRecord, { status: 201 });
  }),
];
