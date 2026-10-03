/**
 * [APP]
 * Providers, global behaviours and routes.
 *
 *   /              main menu
 *   /options       options
 *   /log           Captain's Log (?tab=ranking | history)
 *   /game          match
 *   /game/result   result of the last completed match (survives a refresh)
 */
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { GlobalStyle } from "./components/GlobalStyle";
import { SyncManager } from "./components/SyncManager";
import { UiSounds } from "./components/UiSounds";
import { CaptainsLog } from "./pages/CaptainsLog";
import { GameView } from "./pages/GameView";
import { MainMenu } from "./pages/MainMenu";
import { Options } from "./pages/Options";
import { queryClient } from "./services/queryClient";

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GlobalStyle />
      <UiSounds />
      <SyncManager />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainMenu />} />
          <Route path="/options" element={<Options />} />
          <Route path="/log" element={<CaptainsLog />} />
          <Route path="/ranking" element={<Navigate to="/log?tab=ranking" replace />} />
          <Route path="/history" element={<Navigate to="/log?tab=history" replace />} />
          <Route path="/game" element={<GameView />}>
            <Route path="result" element={null} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
