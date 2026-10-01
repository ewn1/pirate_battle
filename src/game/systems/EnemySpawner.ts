export class EnemySpawner {
  private spawnTimer: number = 0;
  private spawnInterval: number; // Em milissegundos

  constructor(spawnIntervalMs: number) {
    this.spawnInterval = spawnIntervalMs;
  }

  public update(
    delta: number,
    screenWidth: number,
    screenHeight: number,
    onSpawn: (x: number, y: number) => void,
  ) {
    // Converte delta de frames para milissegundos (considerando ~60fps)
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
    onSpawn: (x: number, y: number) => void,
  ) {
    let x = 0;
    let y = 0;
    const side = Math.floor(Math.random() * 4);

    // Sorteia uma das 4 bordas da tela para o inimigo nascer
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

    onSpawn(x, y);
  }
}
