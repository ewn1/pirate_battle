/**
 * [LOADING SCREEN]
 * Shown while textures and sounds load (with visible progress) and when
 * loading fails (accessible error + retry), always BEFORE combat starts.
 */
import styled from "styled-components";
import { Button } from "../ui/Button";
import { Panel, PanelText, PanelTitle } from "../ui/Panel";

interface LoadingScreenProps {
  /** 0..1 */
  progress: number;
  error: string | null;
  onRetry: () => void;
  onMainMenu: () => void;
}

const Screen = styled.div`
  position: absolute;
  inset: 0;
  z-index: 90;
  display: grid;
  place-items: center;
  padding: 12px;
  background: #06192b;
`;

const Track = styled.div`
  width: min(100%, 320px);
  height: 14px;
  overflow: hidden;
  border: 2px solid #ffd166;
  border-radius: 8px;
  background: #0d2a44;
`;

const Fill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #f4a300, #ffd166);
  transition: width 0.15s linear;
`;

export function LoadingScreen({ progress, error, onRetry, onMainMenu }: LoadingScreenProps) {
  const percent = Math.round(progress * 100);

  return (
    <Screen data-testid="loading-screen">
      <Panel>
        {error ? (
          <>
            <PanelTitle as="h2">Could not load</PanelTitle>
            <PanelText role="alert" data-testid="loading-error">
              The game assets failed to load. Check your connection and try
              again.
            </PanelText>
            <Button type="button" onClick={onRetry} data-autofocus data-testid="retry-load">
              Try again
            </Button>
            <Button type="button" $variant="secondary" onClick={onMainMenu} data-sound="back">
              Main menu
            </Button>
          </>
        ) : (
          <>
            <PanelTitle as="h2">Loading battle…</PanelTitle>
            <Track
              role="progressbar"
              aria-label="Loading game assets"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
            >
              <Fill style={{ width: `${percent}%` }} />
            </Track>
            <PanelText>Preparing ships, islands and sounds… {percent}%</PanelText>
          </>
        )}
      </Panel>
    </Screen>
  );
}
