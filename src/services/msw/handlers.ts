import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("/api/ranking", () => {
    return HttpResponse.json([
      { id: 1, name: "The Codefather", score: 25000 },
      { id: 2, name: "Blackbeard", score: 4500 },
      { id: 3, name: "Anne Bonny", score: 3800 },
      { id: 4, name: "Calico Jack", score: 2900 },
    ]);
  }),

  http.get("/api/history", () => {
    return HttpResponse.json([
      {
        id: 1,
        date: new Date().toISOString(),
        score: 1200,
        enemiesDefeated: 12,
        duration: 90,
      },
    ]);
  }),

  http.post("/api/score", async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, record: body }, { status: 201 });
  }),
];
