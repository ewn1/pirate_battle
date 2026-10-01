import React from "react";
import styled from "styled-components";

interface PauseOverlayProps {
  onResume: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
}

export const PauseOverlay: React.FC<PauseOverlayProps> = ({
  onResume,
  onRestart,
  onMainMenu,
}) => {
  return (
    <OverlayContainer role="dialog" aria-label="Pause Menu">
      <ModalPanel>
        <Title>GAME PAUSED</Title>
        <Subtitle>Simulation, timers, and cooldowns are suspended.</Subtitle>

        <MenuButton onClick={onResume} aria-label="Resume Game">
          <ButtonIcon
            src="/assets/png/default/ui/controls/icon_play.png"
            alt=""
          />
          RESUME
        </MenuButton>

        <MenuButton onClick={onRestart} aria-label="Restart Match">
          <ButtonIcon
            src="/assets/png/default/ui/controls/icon_restart.png"
            alt=""
          />
          RESTART
        </MenuButton>

        <MenuButton onClick={onMainMenu} aria-label="Return to Main Menu">
          <ButtonIcon
            src="/assets/png/default/ui/controls/icon_home.png"
            alt=""
          />
          MAIN MENU
        </MenuButton>
      </ModalPanel>
    </OverlayContainer>
  );
};

const OverlayContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.65);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
  backdrop-filter: blur(4px);
`;

const ModalPanel = styled.div`
  background-image: url("/assets/png/default/ui/menu/panel_menu.png");
  background-size: 100% 100%;
  width: 360px;
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: #fff;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
  border-radius: 8px;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 28px;
  color: #f8e3a1;
  text-shadow: 2px 2px 4px #000;
`;

const Subtitle = styled.p`
  margin: 4px 0 16px 0;
  font-size: 14px;
  color: #ddd;
  text-align: center;
`;

const MenuButton = styled.button`
  width: 80%;
  padding: 12px 16px;
  background-color: #3a2312;
  border: 2px solid #8b5a2b;
  border-radius: 6px;
  color: #f8e3a1;
  font-weight: bold;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  text-shadow: 1px 1px 2px #000;
  transition:
    transform 0.1s,
    background-color 0.2s;

  &:hover {
    background-color: #4a2f18;
    transform: scale(1.02);
  }

  &:active {
    transform: scale(0.98);
  }
`;

const ButtonIcon = styled.img`
  width: 20px;
  height: 20px;
`;
