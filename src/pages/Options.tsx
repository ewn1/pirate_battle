import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { useGameStore } from "../store/useGameStore";
import { Panel } from "../components/ui/Panel";
import { Button } from "../components/ui/Button";

const Title = styled.h2`
  font-size: 2rem;
  margin-bottom: 20px;
  text-shadow: 2px 2px 4px #000;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: #fff;
  text-align: center;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 100%;
  margin-bottom: 20px;
`;

const Label = styled.label`
  font-size: 1.1rem;
  font-weight: bold;
  text-shadow: 1px 1px 2px #000;
  color: #fff;
  text-align: center;
`;

const StepperContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  width: 100%;
`;

const RoundButton = styled.button`
  width: 48px;
  height: 48px;
  border: none;
  background: transparent
    url("/assets/png/default/ui/controls/button_round_normal.png") no-repeat
    center / contain;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  outline: none;
  transition:
    transform 0.1s ease,
    filter 0.1s ease;

  &:hover:not(:disabled) {
    background-image: url("/assets/png/default/ui/controls/button_round_hover.png");
  }

  &:active:not(:disabled) {
    background-image: url("/assets/png/default/ui/controls/button_round_pressed.png");
    transform: scale(0.95);
  }

  &:focus-visible {
    filter: drop-shadow(0 0 4px #ffcc00);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const ButtonIcon = styled.img`
  width: 20px;
  height: 20px;
  user-select: none;
  pointer-events: none;
`;

const ValueBox = styled.div`
  background: rgba(0, 0, 0, 0.5);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 8px 16px;
  min-width: 120px;
  text-align: center;
  font-size: 1.25rem;
  font-weight: bold;
  color: #ffcc00;
  text-shadow: 1px 1px 2px #000;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.6);
`;

const ErrorMessage = styled.span`
  color: #ff4d4d;
  font-size: 0.95rem;
  font-weight: bold;
  text-shadow: 1px 1px 2px #000;
  text-align: center;
  min-height: 20px;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 20px;
  margin-top: 15px;
  justify-content: center;
`;

export const Options = () => {
  const navigate = useNavigate();
  const { sessionTime, enemySpawnTime, setSessionTime, setEnemySpawnTime } =
    useGameStore();

  const [localSessionTime, setLocalSessionTime] = useState<number>(sessionTime);
  const [localSpawnTime, setLocalSpawnTime] = useState<number>(enemySpawnTime);
  const [error, setError] = useState<string>("");

  const MIN_SESSION_TIME = 60;
  const MAX_SESSION_TIME = 180;
  const SESSION_STEP = 10;

  const MIN_SPAWN_TIME = 500;
  const SPAWN_STEP = 100;

  const handleSessionChange = (delta: number) => {
    setLocalSessionTime((prev) => {
      const next = prev + delta;
      if (next < MIN_SESSION_TIME) return MIN_SESSION_TIME;
      if (next > MAX_SESSION_TIME) return MAX_SESSION_TIME;
      return next;
    });
  };

  const handleSpawnChange = (delta: number) => {
    setLocalSpawnTime((prev) => {
      const next = prev + delta;
      if (next < MIN_SPAWN_TIME) return MIN_SPAWN_TIME;
      return next;
    });
  };

  const handleSave = () => {
    if (
      localSessionTime < MIN_SESSION_TIME ||
      localSessionTime > MAX_SESSION_TIME
    ) {
      setError(
        `Match duration must be between ${MIN_SESSION_TIME} and ${MAX_SESSION_TIME} seconds.`,
      );
      return;
    }

    if (localSpawnTime < MIN_SPAWN_TIME) {
      setError(`Enemy spawn rate must be at least ${MIN_SPAWN_TIME}ms.`);
      return;
    }

    setError("");
    setSessionTime(localSessionTime);
    setEnemySpawnTime(localSpawnTime);

    navigate("/");
  };

  return (
    <Panel>
      <Title>Options</Title>

      <InputGroup>
        <Label>Match Duration</Label>
        <StepperContainer>
          <RoundButton
            type="button"
            onClick={() => handleSessionChange(-SESSION_STEP)}
            disabled={localSessionTime <= MIN_SESSION_TIME}
            aria-label="Decrease match duration"
          >
            <ButtonIcon
              src="/assets/png/default/ui/controls/icon_minus.png"
              alt="Minus"
            />
          </RoundButton>

          <ValueBox>{localSessionTime}s</ValueBox>

          <RoundButton
            type="button"
            onClick={() => handleSessionChange(SESSION_STEP)}
            disabled={localSessionTime >= MAX_SESSION_TIME}
            aria-label="Increase match duration"
          >
            <ButtonIcon
              src="/assets/png/default/ui/controls/icon_plus.png"
              alt="Plus"
            />
          </RoundButton>
        </StepperContainer>
      </InputGroup>

      <InputGroup>
        <Label>Enemy Spawn Rate</Label>
        <StepperContainer>
          <RoundButton
            type="button"
            onClick={() => handleSpawnChange(-SPAWN_STEP)}
            disabled={localSpawnTime <= MIN_SPAWN_TIME}
            aria-label="Decrease enemy spawn rate"
          >
            <ButtonIcon
              src="/assets/png/default/ui/controls/icon_minus.png"
              alt="Minus"
            />
          </RoundButton>

          <ValueBox>{localSpawnTime}ms</ValueBox>

          <RoundButton
            type="button"
            onClick={() => handleSpawnChange(SPAWN_STEP)}
            aria-label="Increase enemy spawn rate"
          >
            <ButtonIcon
              src="/assets/png/default/ui/controls/icon_plus.png"
              alt="Plus"
            />
          </RoundButton>
        </StepperContainer>
      </InputGroup>

      <ErrorMessage>{error}</ErrorMessage>

      <ButtonGroup>
        <Button onClick={() => navigate("/")} tabIndex={2}>
          Back
        </Button>
        <Button onClick={handleSave} tabIndex={1}>
          Save
        </Button>
      </ButtonGroup>
    </Panel>
  );
};
