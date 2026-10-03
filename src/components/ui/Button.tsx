/**
 * [BUTTON]
 * Sprite-based button from the UI atlas.
 *   $variant="primary"   large gold button (menu actions)
 *   $variant="secondary" compact dark button (tabs, pagination, small actions)
 * Hover is applied only on devices that really hover (no sticky hover on touch).
 */
import styled, { css } from "styled-components";

const MENU = "/assets/png/default/ui/menu";

interface ButtonProps {
  $variant?: "primary" | "secondary";
}

const primary = css`
  width: min(240px, 100%);
  aspect-ratio: 256 / 88;
  background-image: url("${MENU}/button_primary_normal.png");
  font-size: 1.05rem;

  @media (hover: hover) {
    &:hover:not(:disabled) {
      background-image: url("${MENU}/button_primary_hover.png");
    }
  }
  &:active:not(:disabled) {
    background-image: url("${MENU}/button_primary_pressed.png");
  }
  &:disabled {
    background-image: url("${MENU}/button_primary_disabled.png");
    cursor: not-allowed;
  }
`;

const secondary = css`
  min-width: 132px;
  height: 48px;
  padding: 0 18px;
  background-image: url("${MENU}/button_secondary_normal.png");
  font-size: 0.85rem;

  @media (hover: hover) {
    &:hover:not(:disabled) {
      filter: brightness(1.25);
    }
  }
  &:active:not(:disabled) {
    background-image: url("${MENU}/button_secondary_pressed.png");
  }
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

export const Button = styled.button<ButtonProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  background-color: transparent;
  background-repeat: no-repeat;
  background-size: 100% 100%;
  color: #fff;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  text-shadow: 0 2px 0 rgba(0, 0, 0, 0.75);
  cursor: pointer;
  user-select: none;
  touch-action: manipulation;

  ${(props) => (props.$variant === "secondary" ? secondary : primary)}
`;

/** Tab-style secondary button; the active tab is rendered highlighted. */
export const TabButton = styled(Button).attrs({ $variant: "secondary" })<{
  $active?: boolean;
}>`
  ${(props) =>
    props.$active &&
    css`
      background-image: url("${MENU}/button_primary_normal.png");
      color: #fff;
    `}
`;
