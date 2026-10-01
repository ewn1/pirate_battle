interface Positionable {
  x: number;
  y: number;
}

/**
 * Verifica a colisão entre dois elementos baseada em distância (Bounding Circle)
 * Aceita qualquer objeto que possua coordenadas x e y (Sprite, Graphics, etc.)
 */
export function checkCollision(
  objA: Positionable,
  objB: Positionable,
  threshold: number = 30,
): boolean {
  const dx = objA.x - objB.x;
  const dy = objA.y - objB.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Se a distância entre os centros for menor que o limite (threshold), houve colisão
  return distance < threshold;
}
