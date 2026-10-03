/**
 * [OVERLAY]
 * Full-screen dimmed backdrop used by modal dialogs (pause, result, notices).
 */
import styled from "styled-components";

export const Overlay = styled.div`
  position: absolute;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 12px;
  overflow-y: auto;
  background: rgba(4, 16, 28, 0.72);
  backdrop-filter: blur(3px);
`;
