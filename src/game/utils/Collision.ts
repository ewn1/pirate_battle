export interface Positionable {
  x: number;
  y: number;
  radius?: number;
}

export interface IslandObstacle {
  x: number;
  y: number;
  radius: number;
}

/**
 * Colisão circular simples por distância.
 */
export function checkCollision(
  objA: Positionable,
  objB: Positionable,
  threshold?: number,
): boolean {
  const effectiveThreshold =
    threshold ?? (objA.radius || 20) + (objB.radius || 20);
  const dx = objA.x - objB.x;
  const dy = objA.y - objB.y;
  return dx * dx + dy * dy < effectiveThreshold * effectiveThreshold;
}

/**
 * Resolve colisão entre um navio/entidade e uma ilha circular.
 * Se houver intersecção, empurra o objeto para fora da ilha.
 */
export function resolveIslandCollision(
  entity: { x: number; y: number; radius: number },
  island: IslandObstacle,
): boolean {
  const dx = entity.x - island.x;
  const dy = entity.y - island.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const minDistance = entity.radius + island.radius;

  if (distance < minDistance && distance > 0) {
    const overlap = minDistance - distance;
    const normalX = dx / distance;
    const normalY = dy / distance;

    entity.x += normalX * overlap;
    entity.y += normalY * overlap;
    return true;
  }
  return false;
}

/**
 * Verifica se um projétil colidiu com uma ilha.
 */
export function isPointInsideIsland(
  point: Positionable,
  island: IslandObstacle,
): boolean {
  const dx = point.x - island.x;
  const dy = point.y - island.y;
  return dx * dx + dy * dy < island.radius * island.radius;
}
