import React, { useState } from "react";
import styled from "styled-components";

interface GameOverModalProps {
  score: number;
  survived: boolean;
  timePlayed: number;
  onSubmitResult?: (playerName: string) => void;
  onRestart: () => void;
  onMainMenu: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  score,
  survived,
  timePlayed,
  onSubmitResult,
  onRestart,
  onMainMenu,
}) => {
  const [playerName, setPlayerName] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || isSubmitted) return;
    onSubmitResult?.(playerName.trim());
    setIsSubmitted(true);
  };

  return (
    <OverlayContainer role="dialog" aria-label="Game Over Screen">
      <ModalPanel>
        <Title $survived={survived}>
          {survived ? "VICTORY!" : "SHIP SUNK!"}
        </Title>

        <Subtitle>
          Reason:{" "}
          {survived ? "Time Expired (Survived)" : "Player Health Reached 0"}
        </Subtitle>

        <StatsContainer>
          <StatBox>
            <StatLabel>SCORE</StatLabel>
            <StatValue>{score}</StatValue>
          </StatBox>
          <StatBox>
            <StatLabel>TIME PLAYED</StatLabel>
            <StatValue>{Math.round(timePlayed)}s</StatValue>
          </StatBox>
        </StatsContainer>

        {!isSubmitted ? (
          <Form onSubmit={handleSubmit}>
            <Label htmlFor="captain-name">
              Enter Captain Name for Leaderboard:
            </Label>
            <InputGroup>
              <Input
                id="captain-name"
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Captain Blackbeard"
                maxLength={18}
              />
              <SubmitButton type="submit" disabled={!playerName.trim()}>
                Submit
              </SubmitButton>
            </InputGroup>
          </Form>
        ) : (
          <SuccessMessage>Score submitted successfully!</SuccessMessage>
        )}

        <ButtonGroup>
          <ActionButton onClick={onRestart}>
            <ButtonIcon
              src="/assets/png/default/ui/controls/icon_restart.png"
              alt=""
            />
            Play Again
          </ActionButton>
          <ActionButton onClick={onMainMenu}>
            <ButtonIcon
              src="/assets/png/default/ui/controls/icon_home.png"
              alt=""
            />
            Main Menu
          </ActionButton>
        </ButtonGroup>
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
  background-color: rgba(0, 0, 0, 0.75);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
  backdrop-filter: blur(6px);
`;

const ModalPanel = styled.div`
  background-image: url("/assets/png/default/ui/menu/panel_menu.png");
  background-size: 100% 100%;
  width: 420px;
  padding: 36px 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: #fff;
  border-radius: 8px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.6);
`;

const Title = styled.h2<{ $survived: boolean }>`
  margin: 0;
  font-size: 30px;
  color: ${(props) => (props.$survived ? "#4caf50" : "#f44336")};
  text-shadow: 2px 2px 4px #000;
`;

const Subtitle = styled.p`
  margin: 0;
  font-size: 14px;
  color: #ccc;
`;

const StatsContainer = styled.div`
  width: 100%;
  background-color: rgba(0, 0, 0, 0.4);
  border-radius: 6px;
  padding: 12px;
  display: flex;
  justify-content: space-around;
  border: 1px solid #5a3d28;
`;

const StatBox = styled.div`
  text-align: center;
`;

const StatLabel = styled.span`
  font-size: 12px;
  color: #aaa;
`;

const StatValue = styled.div`
  font-size: 22px;
  color: #f8e3a1;
  font-weight: bold;
`;

const Form = styled.form`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-size: 13px;
  color: #f8e3a1;
`;

const InputGroup = styled.div`
  display: flex;
  gap: 8px;
`;

const Input = styled.input`
  flex: 1;
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid #8b5a2b;
  background-color: #2a180b;
  color: #fff;
  outline: none;

  &:focus {
    border-color: #f8e3a1;
  }
`;

const SubmitButton = styled.button`
  padding: 8px 16px;
  background-color: ${(props) => (props.disabled ? "#4a3525" : "#8b5a2b")};
  border: 1px solid #a8723c;
  color: #fff;
  border-radius: 4px;
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  font-weight: bold;
`;

const SuccessMessage = styled.div`
  color: #81c784;
  font-size: 14px;
  font-weight: bold;
`;

const ButtonGroup = styled.div`
  width: 100%;
  display: flex;
  gap: 12px;
  margin-top: 12px;
`;

const ActionButton = styled.button`
  flex: 1;
  padding: 10px;
  background-color: #3a2312;
  border: 2px solid #8b5a2b;
  border-radius: 6px;
  color: #f8e3a1;
  font-weight: bold;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &:hover {
    background-color: #4a2f18;
  }
`;

const ButtonIcon = styled.img`
  width: 18px;
  height: 18px;
`;
