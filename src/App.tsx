import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MainMenu } from "./pages/MainMenu";
import { Options } from "./pages/Options";
import { GameView } from "./pages/GameView";
import { Ranking } from "./pages/Ranking";
import { MatchHistory } from "./pages/MatchHistory";
import { LeaderboardView } from "./pages/LeaderboardView";
import { GlobalStyle } from "./components/GlobalStyle";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <GlobalStyle />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainMenu />} />
          <Route path="/options" element={<Options />} />
          <Route path="/game" element={<GameView />} />
          <Route path="/ranking" element={<Ranking />} />
          <Route path="/history" element={<MatchHistory />} />
          <Route path="/leaderboard" element={<LeaderboardView />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
