/**
 * [GAME HUD]
 * Top bar above the arena: hull, score, remaining time and the pause button.
 *
 * Values arrive as props from GameView, which only updates them on discrete
 * engine events (score change, new whole second, damage) - never per frame.
 * The numeric counters are hidden from assistive technology because the
 * MatchStatusRegion exposes the same data semantically.
 */
import styled from "styled-components";
import { formatClock } from "../../utils/format";

interface GameHudProps {
  health: number;
  maxHealth: number;
  score: number;
  timeRemaining: number;
  /** Pause button is only usable while the match is actually running. */
  canPause: boolean;
  onPause: () => void;
}

const HUD = "/assets/png/default/ui/hud";

const Bar = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: max(6px, env(safe-area-inset-top)) max(10px, env(safe-area-inset-right))
    6px max(10px, env(safe-area-inset-left));
  background: rgba(4, 16, 28, 0.85);
`;

const Group = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Counter = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 96px;
  height: 38px;
  padding: 0 12px;
  background: url("${HUD}/counter_panel.png") center / 100% 100% no-repeat;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 2px 0 #000;
`;

const Icon = styled.img`
  width: 22px;
  height: 22px;
`;

const PauseButton = styled.button`
  width: 44px;
  height: 44px;
  border: none;
  background: url("/assets/png/default/ui/controls/button_round_normal.png") center / contain
    no-repeat;
  display: grid;
  place-items: center;
  cursor: pointer;
  touch-action: manipulation;

  &:active:not(:disabled) {
    background-image: url("/assets/png/default/ui/controls/button_round_pressed.png");
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export function GameHud({
  health,
  maxHealth,
  score,
  timeRemaining,
  canPause,
  onPause,
}: GameHudProps) {
  return (
    <Bar>
      <Group aria-hidden="true">
        <Counter>
          <Icon src={`${HUD}/icon_heart.png`} alt="" />
          <span data-testid="hud-health">
            {health}/{maxHealth}
          </span>
        </Counter>
        <Counter>
          <Icon src={`${HUD}/icon_score.png`} alt="" />
          <span data-testid="hud-score">{score}</span>
        </Counter>
      </Group>

      <Group>
        <Counter aria-hidden="true">
          <Icon src={`${HUD}/icon_time.png`} alt="" />
          <span data-testid="hud-time">{formatClock(timeRemaining)}</span>
        </Counter>
        <PauseButton
          type="button"
          onClick={(event) => {
            onPause();
            // Keep Space/Enter from re-triggering the button during play.
            event.currentTarget.blur();
          }}
          disabled={!canPause}
          aria-label="Pause game"
          data-testid="pause-button"
        >
          <img
            src="/assets/png/default/ui/controls/icon_pause.png"
            alt=""
            width={22}
            height={22}
          />
        </PauseButton>
      </Group>
    </Bar>
  );
}
