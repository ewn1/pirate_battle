/**
 * [PANEL]
 * Framed menu panel. The frame uses CSS `border-image` with the 9-slice
 * borders from ui_sheet.json (left 32, top 40, right 32, bottom 40), so the
 * ornate corners are never stretched whatever the panel size.
 */
import styled from "styled-components";

const FRAME = "/assets/png/default/ui/menu/panel_menu.png";

export const Panel = styled.section<{ $wide?: boolean }>`
  width: min(100%, ${(props) => (props.$wide ? "940px" : "460px")});
  border-style: solid;
  border-width: 40px 32px;
  border-image: url("${FRAME}") 40 32 40 32 fill / 40px 32px / 0 stretch;
  padding: 0 8px 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  color: #fff;
  filter: drop-shadow(0 10px 24px rgba(0, 0, 0, 0.55));
`;

/** Full-height centring wrapper used by every menu screen. */
export const Page = styled.main`
  min-height: 100vh;
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 12px;
`;

export const PanelTitle = styled.h1`
  font-size: clamp(1.4rem, 4vw, 1.9rem);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-align: center;
  color: #fff;
  text-shadow: 0 2px 0 #000;
`;

export const PanelText = styled.p`
  font-size: 0.95rem;
  line-height: 1.4;
  color: #dbe7f3;
  text-align: center;
`;
