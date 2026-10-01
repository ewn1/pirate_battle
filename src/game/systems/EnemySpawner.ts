export class EnemySpawner {
  private spawnInterval: number;
  private timer: number = 0;

  constructor(spawnInterval: number) {
    this.spawnInterval = spawnInterval;
  }

  public update(
    deltaSeconds: number,
    screenWidth: number,
    screenHeight: number,
    currentEnemyCount: number,
    maxEnemies: number,
    onSpawn: (x: number, y: number) => void,
  ) {
    // Não gera novos inimigos se atingiu o limite na tela
    if (currentEnemyCount >= maxEnemies) return;

    this.timer += deltaSeconds;

    if (this.timer >= this.spawnInterval) {
      this.timer = 0;

      // Declaração sem atribuição inútil para satisfazer o ESLint
      let x: number;
      let y: number;
      const padding = 60;
      const side = Math.floor(Math.random() * 4);

      if (side === 0) {
        // Topo
        x = Math.random() * screenWidth;
        y = -padding;
      } else if (side === 1) {
        // Direita
        x = screenWidth + padding;
        y = Math.random() * screenHeight;
      } else if (side === 2) {
        // Baixo
        x = Math.random() * screenWidth;
        y = screenHeight + padding;
      } else {
        // Esquerda
        x = -padding;
        y = Math.random() * screenHeight;
      }

      onSpawn(x, y);
    }
  }
}
