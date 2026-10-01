import type { EnemyType } from "../entities/Enemy";

export class EnemySpawner {
  private spawnTimer: number = 0;
  private spawnInterval: number;

  constructor(spawnIntervalMs: number) {
    this.spawnInterval = spawnIntervalMs;
  }

  public update(
    delta: number,
    screenWidth: number,
    screenHeight: number,
    onSpawn: (
      x: number,
      y: number,
      type: EnemyType,
      textureAlias: string,
    ) => void,
  ) {
    const msElapsed = (delta / 60) * 1000;
    this.spawnTimer += msElapsed;

    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnEnemyAtRandomBorder(screenWidth, screenHeight, onSpawn);
    }
  }

  private spawnEnemyAtRandomBorder(
    screenWidth: number,
    screenHeight: number,
    onSpawn: (
      x: number,
      y: number,
      type: EnemyType,
      textureAlias: string,
    ) => void,
  ) {
    let x = 0;
    let y = 0;
    const side = Math.floor(Math.random() * 4);

    switch (side) {
      case 0: // Topo
        x = Math.random() * screenWidth;
        y = -50;
        break;
      case 1: // Direita
        x = screenWidth + 50;
        y = Math.random() * screenHeight;
        break;
      case 2: // Baixo
        x = Math.random() * screenWidth;
        y = screenHeight + 50;
        break;
      case 3: // Esquerda
        x = -50;
        y = Math.random() * screenHeight;
        break;
    }

    // Alterna o tipo de inimigo e associa aos assets oficiais do projeto
    const isChaser = Math.random() > 0.4;
    const type: EnemyType = isChaser ? "chaser" : "shooter";

    // Chaser utiliza ship_2 ou ship_3 / Shooter utiliza ship_4 ou ship_5
    const textureAlias = isChaser
      ? Math.random() > 0.5
        ? "ship_2"
        : "ship_3"
      : Math.random() > 0.5
        ? "ship_4"
        : "ship_5";

    onSpawn(x, y, type, textureAlias);
  }
}
