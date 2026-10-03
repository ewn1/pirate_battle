/**
 * [OPTIONS STORE]
 * Player-editable options + the persistent anonymous player identity.
 * Persisted in localStorage so everything survives a refresh.
 *
 * Match configuration is copied from here ONCE, when a match starts
 * (see GameView), so changing options never affects a running match.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  clampSessionTime,
  clampSpawnInterval,
  DEFAULT_SESSION_TIME_SEC,
  DEFAULT_SPAWN_INTERVAL_MS,
  type ConfigSnapshot,
} from "../game/config/GameConfig";
import { generateId } from "../game/utils/Random";
import { captainNameFor } from "../utils/captainName";

export const OPTIONS_STORAGE_KEY = "pirate-battle:options:v1";

interface OptionsState {
  sessionTimeSec: number;
  spawnIntervalMs: number;
  /** Anonymous, persistent identity of this browser's player. */
  playerId: string;
  playerName: string;
  setOptions: (options: ConfigSnapshot) => void;
}

export const useGameStore = create<OptionsState>()(
  persist(
    (set) => {
      const playerId = generateId();
      return {
        sessionTimeSec: DEFAULT_SESSION_TIME_SEC,
        spawnIntervalMs: DEFAULT_SPAWN_INTERVAL_MS,
        playerId,
        playerName: captainNameFor(playerId),
        setOptions: (options) =>
          set({
            sessionTimeSec: clampSessionTime(options.sessionTimeSec),
            spawnIntervalMs: clampSpawnInterval(options.spawnIntervalMs),
          }),
      };
    },
    {
      name: OPTIONS_STORAGE_KEY,
      version: 1,
      // Only data is persisted, never the action functions.
      partialize: (state) => ({
        sessionTimeSec: state.sessionTimeSec,
        spawnIntervalMs: state.spawnIntervalMs,
        playerId: state.playerId,
        playerName: state.playerName,
      }),
      // Corrupted or hand-edited storage is clamped back into valid limits.
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<OptionsState>;
        return {
          ...current,
          sessionTimeSec: clampSessionTime(
            Number(saved.sessionTimeSec ?? current.sessionTimeSec),
          ),
          spawnIntervalMs: clampSpawnInterval(
            Number(saved.spawnIntervalMs ?? current.spawnIntervalMs),
          ),
          playerId:
            typeof saved.playerId === "string" && saved.playerId
              ? saved.playerId
              : current.playerId,
          playerName:
            typeof saved.playerName === "string" && saved.playerName
              ? saved.playerName
              : current.playerName,
        };
      },
    },
  ),
);

// Write the generated identity immediately so it is stable across refreshes
// even if the player never opens the Options screen.
useGameStore.setState({});
