import { http, HttpResponse } from "msw";

export const handlers = [
  // Mock para o Ranking
  http.get("/api/ranking", () => {
    return HttpResponse.json([
      { id: 1, name: "The Codefather", score: 20000 },
      { id: 2, name: "Jack Sparrow", score: 12500 },
      { id: 3, name: "Capitão Gancho", score: 10000 },
      { id: 4, name: "Anne Bonny", score: 8500 },
      { id: 5, name: "Jogador", score: 4200 },
    ]);
  }),

  // Mock para o Histórico de Partidas
  http.get("/api/history", () => {
    return HttpResponse.json([
      {
        id: 101,
        date: "2026-10-01T10:00:00Z",
        score: 4200,
        enemiesDefeated: 21,
        duration: 60,
      },
      {
        id: 102,
        date: "2026-09-30T15:30:00Z",
        score: 8500,
        enemiesDefeated: 40,
        duration: 120,
      },
      {
        id: 103,
        date: "2026-09-28T20:15:00Z",
        score: 1500,
        enemiesDefeated: 8,
        duration: 60,
      },
    ]);
  }),
];
