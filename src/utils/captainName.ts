/**
 * [CAPTAIN NAME]
 * Deterministic friendly name derived from the anonymous player id, so the
 * same browser always appears with the same name in ranking and history.
 */
const ADJECTIVES = ["Scarlet", "Salty", "Crimson", "Rusty", "Stormy", "Jolly"];
const NOUNS = ["Parrot", "Anchor", "Cutlass", "Kraken", "Compass", "Barnacle"];

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function captainNameFor(playerId: string): string {
  const h = hash(playerId);
  return `${ADJECTIVES[h % ADJECTIVES.length]} ${NOUNS[Math.floor(h / 7) % NOUNS.length]}`;
}
