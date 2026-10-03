/**
 * [MATCH STATUS REGION]
 * Semantic (screen-reader) view of the match:
 *   - a definition list with score, time and hull, always current but NOT
 *     live, so it is never announced every second;
 *   - one polite live region that only receives discrete announcements
 *     (match start, pause/resume, every 10 s, low hull, match end).
 */
export type MatchPhase = "loading" | "error" | "playing" | "paused" | "over";

interface MatchStatusRegionProps {
  phase: MatchPhase;
  score: number;
  timeRemaining: number;
  health: number;
  maxHealth: number;
  announcement: string;
}

const PHASE_LABEL: Record<MatchPhase, string> = {
  loading: "Loading",
  error: "Loading failed",
  playing: "Playing",
  paused: "Paused",
  over: "Match over",
};

export function MatchStatusRegion({
  phase,
  score,
  timeRemaining,
  health,
  maxHealth,
  announcement,
}: MatchStatusRegionProps) {
  return (
    <section className="sr-only" aria-label="Match status" data-testid="match-status">
      <dl>
        <dt>State</dt>
        <dd>{PHASE_LABEL[phase]}</dd>
        <dt>Score</dt>
        <dd>{score}</dd>
        <dt>Time remaining</dt>
        <dd>{timeRemaining} seconds</dd>
        <dt>Hull</dt>
        <dd>
          {health} of {maxHealth}
        </dd>
      </dl>
      <p role="status" aria-live="polite">
        {announcement}
      </p>
    </section>
  );
}
