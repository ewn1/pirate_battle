import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { GameEngine, type GameCallbacks } from "../game/core/GameEngine";
import { PauseOverlay } from "../components/game/PauseOverlay";
import { GameOverModal } from "../components/game/GameOverModal";
import { TouchControls } from "../components/game/TouchControls";
import { useSubmitScore } from "../hooks/useLeaderboard";

export const GameView: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  const [health, setHealth] = useState(100);
  const [maxHealth, setMaxHealth] = useState(100);
  const [score, setScore] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(120);
  const [survived, setSurvived] = useState(false);

  const [isMobile, setIsMobile] = useState(false);

  // Hook de mutação via TanStack Query
  const submitScoreMutation = useSubmitScore();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || "ontouchstart" in window);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const callbacks: GameCallbacks = {
      onHealthChange: (hp, maxHp) => {
        setHealth(hp);
        setMaxHealth(maxHp);
      },
      onScoreChange: (s) => setScore(s),
      onTimeChange: (t) => setTimeRemaining(t),
      onPauseChange: (p) => setIsPaused(p),
      onGameOver: (finalScore, isWin) => {
        setScore(finalScore);
        setSurvived(isWin);
        setIsGameOver(true);
      },
    };

    const engine = new GameEngine(undefined, callbacks);
    engineRef.current = engine;

    engine.init(containerRef.current).then(() => {
      setIsLoading(false);
    });

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  const handleTogglePause = () => {
    engineRef.current?.togglePause();
  };

  const handleRestart = () => {
    window.location.reload();
  };

  const handleMainMenu = () => {
    navigate("/");
  };

  const handleSubmitResult = (playerName: string) => {
    submitScoreMutation.mutate({
      playerName,
      score,
      timePlayed: 120 - timeRemaining,
      survived,
    });
  };

  return (
    <GameContainer>
      <PixiCanvasContainer ref={containerRef} />

      {isLoading && (
        <LoadingScreen>
          <LoadingTitle>Loading Battleground...</LoadingTitle>
          <LoadingText>Preparing textures and audio assets...</LoadingText>
        </LoadingScreen>
      )}

      {!isLoading && (
        <HudContainer>
          <HudGroup>
            <CounterBox>
              <HudIcon
                src="/assets/png/default/ui/hud/icon_heart.png"
                alt="HP"
              />
              <span>
                {health} / {maxHealth}
              </span>
            </CounterBox>
            <CounterBox>
              <HudIcon
                src="/assets/png/default/ui/hud/icon_score.png"
                alt="Score"
              />
              <span>{score}</span>
            </CounterBox>
          </HudGroup>

          <HudGroup $interactive>
            <CounterBox>
              <HudIcon
                src="/assets/png/default/ui/hud/icon_time.png"
                alt="Time"
              />
              <span>{timeRemaining}s</span>
            </CounterBox>
            <PauseButton onClick={handleTogglePause} aria-label="Pause Game">
              <HudIcon
                src="/assets/png/default/ui/controls/icon_pause.png"
                alt=""
              />
            </PauseButton>
          </HudGroup>
        </HudContainer>
      )}

      {!isLoading && !isPaused && !isGameOver && isMobile && <TouchControls />}

      {isPaused && !isGameOver && (
        <PauseOverlay
          onResume={handleTogglePause}
          onRestart={handleRestart}
          onMainMenu={handleMainMenu}
        />
      )}

      {isGameOver && (
        <GameOverModal
          score={score}
          survived={survived}
          timePlayed={120 - timeRemaining}
          onSubmitResult={handleSubmitResult}
          onRestart={handleRestart}
          onMainMenu={handleMainMenu}
        />
      )}
    </GameContainer>
  );
};

const GameContainer = styled.div`
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-color: #1099bb;
`;

const PixiCanvasContainer = styled.div`
  width: 100%;
  height: 100%;
`;

const LoadingScreen = styled.div`
  position: absolute;
  inset: 0;
  background-color: #0d1b2a;
  color: #f8e3a1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 200;
`;

const LoadingTitle = styled.h2`
  margin: 0 0 8px 0;
  font-size: 24px;
`;

const LoadingText = styled.p`
  color: #aaa;
  font-size: 14px;
  margin: 0;
`;

const HudContainer = styled.div`
  position: absolute;
  top: 16px;
  left: 16px;
  right: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  pointer-events: none;
  z-index: 40;
`;

const HudGroup = styled.div<{ $interactive?: boolean }>`
  display: flex;
  gap: 16px;
  align-items: center;
  pointer-events: ${(props) => (props.$interactive ? "auto" : "none")};
`;

const CounterBox = styled.div`
  background-image: url("/assets/png/default/ui/hud/counter_panel.png");
  background-size: 100% 100%;
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fff;
  font-weight: bold;
`;

const HudIcon = styled.img`
  width: 20px;
  height: auto;
`;

const PauseButton = styled.button`
  width: 44px;
  height: 44px;
  background-image: url("/assets/png/default/ui/controls/button_round_normal.png");
  background-size: cover;
  border: none;
  background-color: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:active {
    background-image: url("/assets/png/default/ui/controls/button_round_pressed.png");
  }
`;
