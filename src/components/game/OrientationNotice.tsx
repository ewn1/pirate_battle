/**
 * [ORIENTATION NOTICE]
 * Supported mobile orientation: LANDSCAPE. In portrait on a touch device this
 * full-screen notice covers the game (GameView also pauses the match).
 */
import styled from "styled-components";

const Notice = styled.div`
  position: fixed;
  inset: 0;
  z-index: 300;
  display: grid;
  place-items: center;
  gap: 8px;
  padding: 24px;
  text-align: center;
  background: #06192b;
  color: #fff;
`;

const Phone = styled.div`
  width: 44px;
  height: 76px;
  margin: 0 auto 12px;
  border: 4px solid #ffd166;
  border-radius: 10px;
  animation: rotate-hint 2s ease-in-out infinite;

  @keyframes rotate-hint {
    0%, 20% { transform: rotate(0deg); }
    60%, 100% { transform: rotate(-90deg); }
  }
`;

export function OrientationNotice() {
  return (
    <Notice role="alert" data-testid="orientation-notice">
      <div>
        <Phone aria-hidden="true" />
        <h2>Rotate your device</h2>
        <p>Pirate Battle is played in landscape. The match is paused.</p>
      </div>
    </Notice>
  );
}
