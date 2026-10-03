/**
 * [RESULT PANEL]
 * End-of-match screen: total score, time played, end reason, registration
 * status and the Play Again / Main Menu actions.
 *
 * Registration status comes from the persisted match store, so it stays
 * correct after a refresh and updates by itself when a pending match is
 * finally registered. Retrying is safe: the server is idempotent by match id.
 */
import { useRef } from "react";
import styled from "styled-components";
import { useDialogFocus } from "../../hooks/useDialogFocus";
import { selectRegistration, useMatchStore, type StoredResult } from "../../store/useMatchStore";
import { endReasonLabel, formatClock } from "../../utils/format";
import { Button } from "../ui/Button";
import { Overlay } from "../ui/Overlay";
import { Panel, PanelTitle } from "../ui/Panel";

interface ResultPanelProps {
  stored: StoredResult;
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

const Score = styled.div`
  font-size: clamp(2.6rem, 10vw, 3.6rem);
  font-weight: 800;
  line-height: 1;
  color: #ffd166;
  text-shadow: 0 3px 0 #000;
`;

const Summary = styled.p`
  font-size: 0.9rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #dbe7f3;
`;

const Status = styled.div`
  width: 100%;
  min-height: 44px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.3);
  font-size: 0.9rem;
  text-align: center;
  color: #e8f0f8;
`;

const Buttons = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 100%;
`;

export function ResultPanel({ stored, onPlayAgain, onMainMenu }: ResultPanelProps) {
  const { result, record } = stored;
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(dialogRef);

  const status = useMatchStore((state) => selectRegistration(state, record.id));
  const entry = useMatchStore((state) =>
    state.queue.find((item) => item.record.id === record.id),
  );
  const retryNow = useMatchStore((state) => state.retryNow);

  // Before the first attempt finishes the entry is queued with 0 attempts.
  const isFirstAttempt = status === "pending" && entry?.attempts === 0;
  const shownStatus = isFirstAttempt ? "saving" : status;

  const message: Record<typeof shownStatus, string> = {
    saving: "Saving this battle to the Captain's Log…",
    saved: "Battle saved to the Captain's Log.",
    pending: `Could not save yet${entry?.lastError ? ` (${entry.lastError})` : ""}. We will keep trying automatically.`,
    failed: `The server rejected this battle${entry?.lastError ? ` (${entry.lastError})` : ""}.`,
    unknown: "This battle is not registered.",
  };

  const sunk = result.reason === "player_sunk";

  return (
    <Overlay>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-title"
        style={{ width: "min(94vw, 440px)" }}
        data-testid="result-panel"
      >
        <Panel>
          <PanelTitle id="result-title" as="h2">
            {sunk ? "Ship sunk" : "Battle complete"}
          </PanelTitle>
          <Score data-testid="result-score">{result.score}</Score>
          <Summary data-testid="result-summary">
            Points · {formatClock(result.durationSeconds)} ·{" "}
            {endReasonLabel(result.reason)}
          </Summary>

          <Status
            role="status"
            aria-live="polite"
            data-testid="registration-status"
            data-status={shownStatus}
          >
            {message[shownStatus]}
            {(shownStatus === "pending" || shownStatus === "failed") && (
              <div style={{ marginTop: 6 }}>
                <Button
                  type="button"
                  $variant="secondary"
                  onClick={() => retryNow(record.id)}
                  data-testid="retry-registration"
                >
                  Retry now
                </Button>
              </div>
            )}
          </Status>

          <Buttons>
            <Button type="button" onClick={onPlayAgain} data-autofocus data-testid="play-again">
              Play again
            </Button>
            <Button type="button" onClick={onMainMenu} data-sound="back" data-testid="main-menu">
              Main menu
            </Button>
          </Buttons>
        </Panel>
      </div>
    </Overlay>
  );
}
