export interface GameConfig {
  gameDuration: number; // Em segundos (60 a 180)
  enemySpawnInterval: number; // Em milissegundos
  playerMaxHealth: number;
  playerSpeed: number;
  playerRotationSpeed: number;

  // Armas
  frontalCooldown: number;
  broadsideCooldown: number;
  projectileSpeed: number;
  projectileLifetime: number;

  // Inimigos
  chaserSpeed: number;
  chaserHealth: number;
  chaserDamage: number;

  shooterSpeed: number;
  shooterHealth: number;
  shooterAttackRange: number;
  shooterCooldown: number;
  shooterDamage: number;
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
  gameDuration: 120,
  enemySpawnInterval: 2500,
  playerMaxHealth: 100,
  playerSpeed: 3.5,
  playerRotationSpeed: 0.05,

  frontalCooldown: 20,
  broadsideCooldown: 40,
  projectileSpeed: 7,
  projectileLifetime: 90,

  chaserSpeed: 2.2,
  chaserHealth: 30,
  chaserDamage: 25,

  shooterSpeed: 1.5,
  shooterHealth: 50,
  shooterAttackRange: 250,
  shooterCooldown: 90,
  shooterDamage: 10,
};
