/**
 * [COLLISION HELPERS]
 * Pure circle-based geometry. Ships, projectiles and islands are circles;
 * this keeps the maths cheap and deterministic.
 */
export interface Circle {
  x: number;
  y: number;
  radius: number;
}

export function circlesOverlap(a: Circle, b: Circle): boolean {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const r = a.radius + b.radius;
  return dx * dx + dy * dy < r * r;
}

/**
 * Pushes `entity` out of `island` when they overlap.
 * Returns true when a correction was applied.
 */
export function resolveIslandCollision(
  entity: Circle,
  island: Circle,
): boolean {
  const dx = entity.x - island.x;
  const dy = entity.y - island.y;
  const distance = Math.hypot(dx, dy);
  const minDistance = entity.radius + island.radius;
  if (distance >= minDistance) return false;

  if (distance === 0) {
    // Perfect overlap: push along +x so we never divide by zero.
    entity.x = island.x + minDistance;
    return true;
  }
  const overlap = minDistance - distance;
  entity.x += (dx / distance) * overlap;
  entity.y += (dy / distance) * overlap;
  return true;
}

/** Wraps an angle into (-PI, PI]. */
export function normalizeAngle(angle: number): number {
  const twoPi = Math.PI * 2;
  return ((((angle + Math.PI) % twoPi) + twoPi) % twoPi) - Math.PI;
}

/**
 * Simple obstacle avoidance: if an island blocks the straight line to the
 * target, steer along its tangent on the side needing the smaller correction.
 */
export function steerAroundIslands(
  x: number,
  y: number,
  desiredAngle: number,
  entityRadius: number,
  targetDistance: number,
  islands: readonly Circle[],
  lookahead = 150,
): number {
  let angle = desiredAngle;
  for (const island of islands) {
    const dx = island.x - x;
    const dy = island.y - y;
    const dist = Math.hypot(dx, dy);
    const clearance = island.radius + entityRadius + 24;

    // Ignore islands that are far away or behind the target.
    if (dist > clearance + lookahead) continue;
    if (dist - island.radius > targetDistance) continue;

    const toIsland = Math.atan2(dy, dx);
    const diff = normalizeAngle(toIsland - angle);
    const halfWidth = Math.asin(
      Math.min(1, clearance / Math.max(dist, clearance + 0.001)),
    );
    const margin = halfWidth + 0.15;

    if (Math.abs(diff) < margin) {
      const side = diff >= 0 ? -1 : 1;
      angle = toIsland + side * margin;
    }
  }
  return angle;
}
