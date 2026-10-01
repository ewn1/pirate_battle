import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainMenu } from "./pages/MainMenu";
import { Options } from "./pages/Options";
import { Ranking } from "./pages/Ranking";
import { MatchHistory } from "./pages/MatchHistory";
import { GameView } from "./pages/GameView";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainMenu />} />
        <Route path="/options" element={<Options />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/history" element={<MatchHistory />} />
        <Route path="/game" element={<GameView />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
