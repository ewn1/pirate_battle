/**
 * [TOUCH CONTROLS]
 * On-screen controls for touch devices, built on Pointer Events so several
 * fingers work at once (sail + fire simultaneously).
 *
 *   left cluster : turn left | forward | turn right
 *   right cluster: broadside left | front cannon | broadside right
 *
 * Presses go straight to the engine's InputManager (no synthetic keyboard
 * events, no React state), so holding a button never re-renders anything.
 */
import styled from "styled-components";
import type { GameAction } from "../../game/utils/InputManager";

interface TouchControlsProps {
  onPress: (action: GameAction, pressed: boolean) => void;
}

const ICONS = "/assets/png/default/ui/controls";

const Wrapper = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 0 max(14px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom))
    max(14px, env(safe-area-inset-left));
  pointer-events: none;
`;

const Cluster = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 10px;
  pointer-events: auto;
`;

const Hold = styled.button<{ $large?: boolean }>`
  width: ${(props) => (props.$large ? "76px" : "62px")};
  height: ${(props) => (props.$large ? "76px" : "62px")};
  border: none;
  background: url("${ICONS}/button_round_normal.png") center / contain no-repeat;
  display: grid;
  place-items: center;
  opacity: 0.88;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  touch-action: none;

  &:active {
    background-image: url("${ICONS}/button_round_pressed.png");
    opacity: 1;
  }

  img {
    width: ${(props) => (props.$large ? "34px" : "28px")};
    pointer-events: none;
  }
`;

interface HoldButtonProps {
  action: GameAction;
  label: string;
  icon: string;
  testId: string;
  large?: boolean;
  onPress: TouchControlsProps["onPress"];
}

function HoldButton({ action, label, icon, testId, large, onPress }: HoldButtonProps) {
  const release = () => onPress(action, false);

  return (
    <Hold
      type="button"
      $large={large}
      tabIndex={-1}
      aria-label={label}
      data-testid={testId}
      data-sound="none"
      onPointerDown={(event) => {
        event.preventDefault();
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          /* synthetic pointers cannot be captured */
        }
        onPress(action, true);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onContextMenu={(event) => event.preventDefault()}
    >
      <img src={`${ICONS}/${icon}.png`} alt="" draggable={false} />
    </Hold>
  );
}

export function TouchControls({ onPress }: TouchControlsProps) {
  return (
    <Wrapper role="group" aria-label="Touch controls" data-testid="touch-controls">
      <Cluster>
        <HoldButton action="left" label="Turn left" icon="icon_turn_left" testId="touch-left" onPress={onPress} />
        <HoldButton action="forward" label="Sail forward" icon="icon_forward" testId="touch-forward" large onPress={onPress} />
        <HoldButton action="right" label="Turn right" icon="icon_turn_right" testId="touch-right" onPress={onPress} />
      </Cluster>
      <Cluster>
        <HoldButton action="fireLeft" label="Fire left broadside" icon="icon_fire_left" testId="touch-fire-left" onPress={onPress} />
        <HoldButton action="fireFront" label="Fire front cannon" icon="icon_fire_front" testId="touch-fire-front" large onPress={onPress} />
        <HoldButton action="fireRight" label="Fire right broadside" icon="icon_fire_right" testId="touch-fire-right" onPress={onPress} />
      </Cluster>
    </Wrapper>
  );
}
