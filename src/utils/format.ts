/**
 * [FORMAT HELPERS]
 * Presentation helpers shared by the HUD, result, ranking and history views.
 */

/** 75 -> "1:15" */
export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** "07 Sep, 14:32" (uses the viewer's locale and timezone). */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** 3000 -> "3" ; 500 -> "0.5" */
export function formatSeconds(ms: number): string {
  return String(Number((ms / 1000).toFixed(2)));
}

export function endReasonLabel(reason: "time_expired" | "player_sunk"): string {
  return reason === "time_expired" ? "Time up" : "Defeated";
}
