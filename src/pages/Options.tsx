/**
 * [OPTIONS]
 * "Game session time" (60-180 s) and "Enemy spawn time" (0.5-10 s) with
 * validation, explicit saving and persistence (localStorage via the store).
 *
 * Each input is a labelled text field with +/- steppers. Errors are
 * announced (role="alert") and linked with aria-describedby / aria-invalid.
 * Saved values apply to the NEXT match only.
 */
import { useRef, useState, type FormEvent, type Ref } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { Button } from "../components/ui/Button";
import { Page, Panel, PanelText, PanelTitle } from "../components/ui/Panel";
import { LIMITS } from "../game/config/GameConfig";
import { useGameStore } from "../store/useGameStore";
import { formatSeconds } from "../utils/format";

/* -------------------------------------------------------------------------- */
/* [VALIDATION]                                                               */
/* -------------------------------------------------------------------------- */

const SESSION = LIMITS.sessionTimeSec;
const SPAWN_SEC = {
  min: LIMITS.spawnIntervalMs.min / 1000,
  max: LIMITS.spawnIntervalMs.max / 1000,
};
const SESSION_STEP = 10;
const SPAWN_STEP = 0.5;

function parseNumber(raw: string): number | null {
  const text = raw.trim().replace(",", ".");
  if (text === "") return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

function validateSessionTime(raw: string): string | null {
  const value = parseNumber(raw);
  if (value === null) return "Enter the game session time in seconds.";
  if (!Number.isInteger(value)) return "Game session time must be a whole number of seconds.";
  if (value < SESSION.min || value > SESSION.max) {
    return `Game session time must be between ${SESSION.min} and ${SESSION.max} seconds.`;
  }
  return null;
}

function validateSpawnTime(raw: string): string | null {
  const value = parseNumber(raw);
  if (value === null) return "Enter the enemy spawn time in seconds.";
  if (value <= 0) return "Enemy spawn time must be greater than zero.";
  if (value < SPAWN_SEC.min || value > SPAWN_SEC.max) {
    return `Enemy spawn time must be between ${SPAWN_SEC.min} and ${SPAWN_SEC.max} seconds.`;
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* [STYLES]                                                                   */
/* -------------------------------------------------------------------------- */

const Form = styled.form`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  width: 100%;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 100%;
`;

const Label = styled.label`
  font-size: 1rem;
  font-weight: 700;
  text-shadow: 0 2px 0 #000;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Round = styled.button`
  width: 48px;
  height: 48px;
  border: none;
  background: url("/assets/png/default/ui/controls/button_round_normal.png") center / contain
    no-repeat;
  display: grid;
  place-items: center;
  cursor: pointer;
  touch-action: manipulation;

  &:active:not(:disabled) {
    background-image: url("/assets/png/default/ui/controls/button_round_pressed.png");
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  img {
    width: 20px;
    height: 20px;
  }
`;

const Input = styled.input`
  width: 120px;
  height: 44px;
  padding: 0 8px;
  border: 2px solid #4b6f91;
  border-radius: 8px;
  background: #0b2238;
  color: #ffd166;
  font: inherit;
  font-size: 1.2rem;
  font-weight: 800;
  text-align: center;

  &[aria-invalid="true"] {
    border-color: #ff6b6b;
  }
`;

const Hint = styled.p`
  font-size: 0.8rem;
  color: #c4d4e3;
`;

const ErrorText = styled.p`
  min-height: 1.2em;
  font-size: 0.85rem;
  font-weight: 700;
  text-align: center;
  color: #ff9b9b;
`;

const Saved = styled.p`
  min-height: 1.2em;
  font-weight: 700;
  color: #8de0a0;
`;

/* -------------------------------------------------------------------------- */
/* [STEPPER FIELD]                                                            */
/* -------------------------------------------------------------------------- */

interface NumberFieldProps {
  id: string;
  label: string;
  unit: string;
  hint: string;
  value: string;
  error: string | null;
  onChange: (value: string) => void;
  onStep: (direction: -1 | 1) => void;
  inputRef: Ref<HTMLInputElement>;
}

function NumberField({
  id,
  label,
  unit,
  hint,
  value,
  error,
  onChange,
  onStep,
  inputRef,
}: NumberFieldProps) {
  return (
    <Field>
      <Label htmlFor={id}>
        {label} ({unit})
      </Label>
      <Row>
        <Round
          type="button"
          onClick={() => onStep(-1)}
          aria-label={`Decrease ${label.toLowerCase()}`}
          data-testid={`${id}-minus`}
        >
          <img src="/assets/png/default/ui/controls/icon_minus.png" alt="" />
        </Round>
        <Input
          id={id}
          ref={inputRef}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error !== null}
          aria-describedby={`${id}-hint ${id}-error`}
        />
        <Round
          type="button"
          onClick={() => onStep(1)}
          aria-label={`Increase ${label.toLowerCase()}`}
          data-testid={`${id}-plus`}
        >
          <img src="/assets/png/default/ui/controls/icon_plus.png" alt="" />
        </Round>
      </Row>
      <Hint id={`${id}-hint`}>{hint}</Hint>
      <ErrorText id={`${id}-error`} role="alert">
        {error}
      </ErrorText>
    </Field>
  );
}

/* -------------------------------------------------------------------------- */
/* [PAGE]                                                                     */
/* -------------------------------------------------------------------------- */

export function Options() {
  const navigate = useNavigate();
  const sessionTimeSec = useGameStore((state) => state.sessionTimeSec);
  const spawnIntervalMs = useGameStore((state) => state.spawnIntervalMs);
  const setOptions = useGameStore((state) => state.setOptions);

  const [sessionRaw, setSessionRaw] = useState(String(sessionTimeSec));
  const [spawnRaw, setSpawnRaw] = useState(formatSeconds(spawnIntervalMs));
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [spawnError, setSpawnError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const sessionInput = useRef<HTMLInputElement>(null);
  const spawnInput = useRef<HTMLInputElement>(null);

  const edit = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setSaved(false);
  };

  const stepSession = (direction: -1 | 1) => {
    const current = parseNumber(sessionRaw) ?? sessionTimeSec;
    const next = Math.min(SESSION.max, Math.max(SESSION.min, Math.round(current) + direction * SESSION_STEP));
    setSessionRaw(String(next));
    setSessionError(null);
    setSaved(false);
  };

  const stepSpawn = (direction: -1 | 1) => {
    const current = parseNumber(spawnRaw) ?? spawnIntervalMs / 1000;
    const next = Math.min(SPAWN_SEC.max, Math.max(SPAWN_SEC.min, current + direction * SPAWN_STEP));
    setSpawnRaw(String(Number(next.toFixed(2))));
    setSpawnError(null);
    setSaved(false);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const sessionProblem = validateSessionTime(sessionRaw);
    const spawnProblem = validateSpawnTime(spawnRaw);
    setSessionError(sessionProblem);
    setSpawnError(spawnProblem);

    if (sessionProblem) return sessionInput.current?.focus();
    if (spawnProblem) return spawnInput.current?.focus();

    const sessionValue = parseNumber(sessionRaw) as number;
    const spawnValue = parseNumber(spawnRaw) as number;
    setOptions({
      sessionTimeSec: sessionValue,
      spawnIntervalMs: Math.round(spawnValue * 1000),
    });
    setSessionRaw(String(sessionValue));
    setSpawnRaw(String(Number(spawnValue.toFixed(2))));
    setSaved(true);
  };

  return (
    <Page>
      <Panel aria-labelledby="options-title">
        <PanelTitle id="options-title">Options</PanelTitle>
        <PanelText>Changes apply to your next match.</PanelText>

        <Form onSubmit={handleSubmit} noValidate>
          <NumberField
            id="session-time"
            label="Game session time"
            unit="seconds"
            hint={`Between ${SESSION.min} and ${SESSION.max} seconds.`}
            value={sessionRaw}
            error={sessionError}
            onChange={edit(setSessionRaw)}
            onStep={stepSession}
            inputRef={sessionInput}
          />
          <NumberField
            id="spawn-time"
            label="Enemy spawn time"
            unit="seconds"
            hint={`Between ${SPAWN_SEC.min} and ${SPAWN_SEC.max} seconds.`}
            value={spawnRaw}
            error={spawnError}
            onChange={edit(setSpawnRaw)}
            onStep={stepSpawn}
            inputRef={spawnInput}
          />

          <Saved role="status" data-testid="options-saved">
            {saved ? "Options saved." : ""}
          </Saved>

          <Button type="submit" data-testid="save-options">
            Save
          </Button>
          <Button
            type="button"
            $variant="secondary"
            onClick={() => navigate("/")}
            data-sound="back"
            data-testid="options-back"
          >
            Main menu
          </Button>
        </Form>
      </Panel>
    </Page>
  );
}
