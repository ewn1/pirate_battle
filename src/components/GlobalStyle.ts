/**
 * [GLOBAL STYLES]
 * Reset, base typography, focus ring, screen-reader utility and reduced motion.
 * Fonts: system UI fonts only (no web fonts, so no extra licences or requests).
 */
import { createGlobalStyle } from "styled-components";

export const GlobalStyle = createGlobalStyle`
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html, body, #root {
    min-height: 100%;
  }

  body {
    font-family: "Trebuchet MS", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    background: #0a2a43 url("/assets/ui_scene_background.png") center / cover no-repeat fixed;
    color: #fff;
    overflow-x: hidden;
    -webkit-tap-highlight-color: transparent;
  }

  #root {
    min-height: 100vh;
    min-height: 100dvh;
  }

  button {
    font-family: inherit;
  }

  /* [FOCUS] Visible keyboard focus everywhere. */
  :focus-visible {
    outline: 3px solid #ffd166;
    outline-offset: 3px;
  }

  /* [SCREEN READERS] Visually hidden but available to assistive technology. */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation: none !important;
      transition: none !important;
    }
  }
`;
