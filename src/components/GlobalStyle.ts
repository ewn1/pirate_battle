import { createGlobalStyle } from "styled-components";

export const GlobalStyle = createGlobalStyle`
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: 'Courier New', Courier, monospace;
    background-image: url('/assets/ui_scene_background.png');
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    color: #fff;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
  }

  #root {
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }
`;
