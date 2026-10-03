/**
 * [GAME VIEW]
 * React shell around one GameEngine. Routes:
 *   /game         -> a match (loading -> playing <-> paused -> over)
 *   /game/result  -> same component; after a refresh it shows the persisted
 *                    result of the last completed match (no engine is started)
 *
 * Division of work:
 *   - the engine owns ALL continuous state (positions, cooldowns, timers);
 *   - React only receives discrete callbacks (score changed, new whole second,
 *     damage taken, paused, game over) and never re-renders per frame;
 *   - the engine is created/destroyed by ONE effect keyed on `runKey`, which
 *     is Strict-Mode safe (cleanup runs between the double mount).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useMatch, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { GameEngine } from "../game/core/GameEngine";
import type { PauseReason } from "../game/core/types";
import { createGameConfig } from "../game/config/GameConfig";
import type { GameAction } from "../game/utils/InputManager";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { runtimeParams } from "../services/runtimeParams";
import { useGameStore } from "../store/useGameStore";
import { useMatchStore } from "../store/useMatchStore";
import type { MatchRecord } from "../services/api/contracts";
import { GameHud } from "../components/game/GameHud";
import { LoadingScreen } from "../components/game/LoadingScreen";
import { MatchStatusRegion, type MatchPhase } from "../components/game/MatchStatusRegion";
import { OrientationNotice } from "../components/game/OrientationNotice";
import { PauseOverlay } from "../components/game/PauseOverlay";
import { ResultPanel } from "../components/game/ResultPanel";
import { TouchControls } from "../components/game/TouchControls";

/* -------------------------------------------------------------------------- */
/* [STYLES]                                                                   */
/* -------------------------------------------------------------------------- */

const Stage = styled.main<{ $static: boolean }>`
  position: fixed;
  inset: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  overflow: hidden;
  background: ${(props) => (props.$static ? "transparent" : "#06192b")};
`;

const Host = styled.div`
  position: relative;
  min-height: 0;
  overflow: hidden;
`;

/* -------------------------------------------------------------------------- */
/* [COMPONENT]                                                                */
/* -------------------------------------------------------------------------- */

export function GameView() {
  const navigate = useNavigate();
  const onResultRoute = useMatch("/game/result") !== null;

  // True when the page was opened directly on /game/result (e.g. a refresh).
  const [bootedOnResult] = useState(onResultRoute);
  const [runKey, setRunKey] = useState(bootedOnResult ? -1 : 0);

  const lastResult = useMatchStore((state) => state.lastResult);

  const [phase, setPhase] = useState<MatchPhase>(bootedOnResult ? "over" : "loading");
  const [pauseReason, setPauseReason] = useState<PauseReason | null>(null);
  const [loadProgress, setLoadProgress] = useState(0);
  const [health, setHealth] = useState(0);
  const [maxHealth, setMaxHealth] = useState(0);
  const [score, setScore] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [announcement, setAnnouncement] = useState("");

  const hostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const navigateRef = useRef(navigate);
  useEffect(() => {
    navigateRef.current = navigate;
  });

  /* ---- [ENGINE LIFECYCLE] ----------------------------------------------- */
  useEffect(() => {
    if (runKey < 0) return; // static result screen: nothing to run
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;

    // Snapshot of the options at the moment the match starts.
    const { sessionTimeSec, spawnIntervalMs } = useGameStore.getState();
    const config = createGameConfig({ sessionTimeSec, spawnIntervalMs });
    const seed = runtimeParams.seed ?? Math.floor(Math.random() * 2 ** 31);

    const engine = new GameEngine({
      config,
      seed,
      manualClock: runtimeParams.manualClock,
      callbacks: {
        onLoadProgress: setLoadProgress,
        onHealthChange: (value, max) => {
          setHealth(value);
          setMaxHealth(max);
          if (value > 0 && value / max <= 0.25) {
            setAnnouncement("Warning: hull is critically damaged.");
          }
        },
        onScoreChange: setScore,
        onTimeChange: (seconds) => {
          setTimeRemaining(seconds);
          if (seconds > 0 && seconds % 10 === 0) {
            setAnnouncement(`${seconds} seconds remaining.`);
          }
        },
        onPauseChange: (paused, reason) => {
          setPhase((current) => (current === "over" ? current : paused ? "paused" : "playing"));
          setPauseReason(reason);
          setAnnouncement(paused ? "Game paused." : "Game resumed.");
        },
        onGameOver: (result) => {
          const { playerId, playerName } = useGameStore.getState();
          const record: MatchRecord = {
            id: result.matchId,
            playerId,
            playerName,
            score: result.score,
            durationSeconds: result.durationSeconds,
            reason: result.reason,
            playedAt: result.endedAt,
            config: result.config,
          };
          // Persist the result and queue it for registration (exactly once).
          useMatchStore.getState().completeMatch({ result, record });
          setScore(result.score);
          setPhase("over");
          setAnnouncement(
            result.reason === "time_expired"
              ? `Battle complete. Final score ${result.score}.`
              : `Your ship was sunk. Final score ${result.score}.`,
          );
          navigateRef.current("/game/result", { replace: true });
        },
      },
    });
    engineRef.current = engine;

    engine
      .init(host)
      .then(() => {
        if (cancelled) return;
        setPhase("playing");
        setAnnouncement("Battle started. Sail with the arrow keys, fire with Space, Q and E.");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.warn("[game] asset loading failed", error);
        engine.destroy();
        if (engineRef.current === engine) engineRef.current = null;
        setPhase("error");
      });

    return () => {
      cancelled = true;
      engine.destroy();
      if (engineRef.current === engine) engineRef.current = null;
    };
  }, [runKey]);

  /* ---- [PAUSE KEYS] ------------------------------------------------------ */
  // Only active while the gameplay context (playing / paused) is mounted.
  useEffect(() => {
    if (phase !== "playing" && phase !== "paused") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.code === "Escape" || event.code === "KeyP") {
        event.preventDefault();
        engineRef.current?.togglePause();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase]);

  /* ---- [ORIENTATION] ----------------------------------------------------- */
  const coarsePointer = useMediaQuery("(pointer: coarse)");
  const portrait = useMediaQuery("(orientation: portrait)");
  const showTouchControls = coarsePointer || runtimeParams.forceTouch;
  const needsRotation = coarsePointer && portrait;

  useEffect(() => {
    // Portrait on a touch device: pause; the player resumes after rotating.
    if (needsRotation) engineRef.current?.pause("manual");
  }, [needsRotation]);

  /* ---- [ACTIONS] --------------------------------------------------------- */
  const handleTogglePause = useCallback(() => engineRef.current?.togglePause(), []);
  const handlePress = useCallback(
    (action: GameAction, pressed: boolean) =>
      engineRef.current?.setVirtualInput(action, pressed),
    [],
  );

  /** Starts a brand-new match (new engine, restored life/score/timer). */
  const startNewMatch = useCallback(() => {
    setPhase("loading");
    setPauseReason(null);
    setLoadProgress(0);
    setScore(0);
    setHealth(0);
    setTimeRemaining(0);
    setAnnouncement("");
    setRunKey((key) => (key < 0 ? 0 : key + 1));
    navigate("/game", { replace: true });
  }, [navigate]);

  const goToMenu = useCallback(() => navigate("/"), [navigate]);

  /* ---- [RENDER] ---------------------------------------------------------- */
  // Opened /game/result with nothing stored: there is no result to show.
  if (bootedOnResult && !lastResult && runKey < 0) {
    return <Navigate to="/" replace />;
  }

  const isStatic = runKey < 0;
  const showResult = phase === "over" && lastResult !== null;

  return (
    <Stage $static={isStatic}>
      {isStatic ? (
        <div />
      ) : (
        <GameHud
          health={health}
          maxHealth={maxHealth}
          score={score}
          timeRemaining={timeRemaining}
          canPause={phase === "playing"}
          onPause={handleTogglePause}
        />
      )}

      <Host ref={hostRef}>
        {showTouchControls && phase === "playing" && (
          <TouchControls onPress={handlePress} />
        )}
      </Host>

      {(phase === "loading" || phase === "error") && !isStatic && (
        <LoadingScreen
          progress={loadProgress}
          error={phase === "error" ? "load" : null}
          onRetry={startNewMatch}
          onMainMenu={goToMenu}
        />
      )}

      {phase === "paused" && (
        <PauseOverlay
          reason={pauseReason}
          onResume={handleTogglePause}
          onRestart={startNewMatch}
          onMainMenu={goToMenu}
        />
      )}

      {showResult && (
        <ResultPanel stored={lastResult} onPlayAgain={startNewMatch} onMainMenu={goToMenu} />
      )}

      <MatchStatusRegion
        phase={phase}
        score={score}
        timeRemaining={timeRemaining}
        health={health}
        maxHealth={maxHealth}
        announcement={announcement}
      />

      {needsRotation && <OrientationNotice />}
    </Stage>
  );
}
