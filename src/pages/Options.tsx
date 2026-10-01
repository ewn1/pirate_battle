import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { useGameStore } from "../store/useGameStore";
import { Panel } from "../components/ui/Panel";
import { Button } from "../components/ui/Button";

const Title = styled.h2`
  font-size: 2rem;
  margin-bottom: 10px;
  text-shadow: 2px 2px 4px #000;
  text-transform: uppercase;
  letter-spacing: 2px;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  margin-bottom: 10px;
`;

const Label = styled.label`
  font-size: 1.1rem;
  font-weight: bold;
  text-shadow: 1px 1px 2px #000;
`;

const Input = styled.input`
  padding: 12px;
  font-size: 1rem;
  border-radius: 6px;
  border: 2px solid #333;
  background: rgba(255, 255, 255, 0.9);
  outline: none;
  font-family: inherit;

  &:focus {
    border-color: #ffcc00;
    box-shadow: 0 0 8px rgba(255, 204, 0, 0.6);
  }
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
`;

export const Options = () => {
  const navigate = useNavigate();
  const { sessionTime, enemySpawnTime, setSessionTime, setEnemySpawnTime } =
    useGameStore();

  const [localSessionTime, setLocalSessionTime] = useState(
    sessionTime.toString(),
  );
  const [localSpawnTime, setLocalSpawnTime] = useState(
    enemySpawnTime.toString(),
  );
  const [error, setError] = useState("");

  const handleSave = () => {
    const parsedSession = parseInt(localSessionTime, 10);
    const parsedSpawn = parseInt(localSpawnTime, 10);

    if (isNaN(parsedSession) || parsedSession < 60 || parsedSession > 180) {
      setError("Match duration must be between 60 and 180 seconds.");
      return;
    }

    if (isNaN(parsedSpawn) || parsedSpawn < 500) {
      setError("Enemy spawn rate must be at least 500ms.");
      return;
    }

    setError("");
    setSessionTime(parsedSession);
    setEnemySpawnTime(parsedSpawn);

    navigate("/");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    }
  };

  return (
    <Panel onKeyDown={handleKeyDown}>
      <Title>Options</Title>

      <InputGroup>
        <Label htmlFor="sessionTime">Match Duration (Seconds)</Label>
        <Input
          id="sessionTime"
          type="number"
          value={localSessionTime}
          onChange={(e) => setLocalSessionTime(e.target.value)}
          min="60"
          max="180"
          tabIndex={1}
          autoFocus
        />
      </InputGroup>

      <InputGroup>
        <Label htmlFor="spawnTime">Enemy Spawn Rate (ms)</Label>
        <Input
          id="spawnTime"
          type="number"
          value={localSpawnTime}
          onChange={(e) => setLocalSpawnTime(e.target.value)}
          min="500"
          step="100"
          tabIndex={2}
        />
      </InputGroup>

      <ErrorMessage>{error}</ErrorMessage>

      <ButtonGroup>
        <Button onClick={() => navigate("/")} tabIndex={4}>
          Back
        </Button>
        <Button onClick={handleSave} tabIndex={3}>
          Save
        </Button>
      </ButtonGroup>
    </Panel>
  );
};
