export interface GameConfig {
  gameDuration: number;
  enemySpawnInterval: number; // Intervalo real em segundos entre spawns
  maxEnemies: number; // Limite máximo de inimigos vivos na tela
  playerMaxHealth: number;
  frontalCooldown: number;
  broadsideCooldown: number;
  chaserHealth: number;
  chaserDamage: number;
  shooterHealth: number;
  shooterDamage: number;
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
  gameDuration: 90,

  // [AJUSTE DE SPAWN] Intervalo de 3.5 segundos e limite de no máximo 12 inimigos na tela
  enemySpawnInterval: 3.5,
  maxEnemies: 12,

  playerMaxHealth: 100,
  frontalCooldown: 600,
  broadsideCooldown: 1500,

  chaserHealth: 30,
  chaserDamage: 25,
  shooterHealth: 50,
  shooterDamage: 15,
};
