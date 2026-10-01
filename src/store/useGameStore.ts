import { create } from "zustand";
import { persist } from "zustand/middleware";

interface GameState {
  // Configurações da partida
  sessionTime: number; // Em segundos (limites: 60 a 180)
  enemySpawnTime: number; // Em milissegundos

  // Ações
  setSessionTime: (time: number) => void;
  setEnemySpawnTime: (time: number) => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      // Valores padrão de inicialização
      sessionTime: 60,
      enemySpawnTime: 1000,

      // Funções para atualizar o estado
      setSessionTime: (time) => set({ sessionTime: time }),
      setEnemySpawnTime: (time) => set({ enemySpawnTime: time }),
    }),
    {
      name: "pirate-battle-config", // Nome da chave que ficará salva no localStorage
    },
  ),
);
