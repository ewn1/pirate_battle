/**
 * [PAUSE OVERLAY]
 * Modal dialog shown while the match is paused (manually, or automatically
 * when the window loses focus / the tab is hidden). The match only continues
 * after an explicit player action (Resume).
 */
import { useRef } from "react";
import styled from "styled-components";
import type { PauseReason } from "../../game/core/types";
import { useDialogFocus } from "../../hooks/useDialogFocus";
import { Button } from "../ui/Button";
import { Overlay } from "../ui/Overlay";
import { Panel, PanelText, PanelTitle } from "../ui/Panel";

interface PauseOverlayProps {
  reason: PauseReason | null;
  onResume: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
}

const REASON_TEXT: Record<PauseReason, string> = {
  manual: "Ready when you are, captain.",
  blur: "Paused automatically: the window lost focus.",
  hidden: "Paused automatically: the tab was hidden.",
};

const Buttons = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 100%;
`;

export function PauseOverlay({
  reason,
  onResume,
  onRestart,
  onMainMenu,
}: PauseOverlayProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(dialogRef);

  return (
    <Overlay>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pause-title"
        aria-describedby="pause-text"
        style={{ width: "min(94vw, 400px)" }}
        data-testid="pause-dialog"
      >
        <Panel>
          <PanelTitle id="pause-title" as="h2">
            Paused
          </PanelTitle>
          <PanelText id="pause-text">
            {REASON_TEXT[reason ?? "manual"]} Timers, cooldowns and enemies are
            frozen.
          </PanelText>
          <Buttons>
            <Button type="button" onClick={onResume} data-autofocus data-testid="resume-button">
              Resume
            </Button>
            <Button type="button" onClick={onRestart} data-testid="restart-button">
              Restart
            </Button>
            <Button type="button" onClick={onMainMenu} data-sound="back" data-testid="menu-button">
              Main menu
            </Button>
          </Buttons>
        </Panel>
      </div>
    </Overlay>
  );
}
