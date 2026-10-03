/**
 * [NETWORK SCENARIO PANEL]
 * Selects the mock API scenario (success, empty, slow, timeout, 4xx/5xx, ...)
 * and restores the initial state. Changing the scenario refetches the queries
 * and immediately retries any queued match registration.
 */
import { useSyncExternalStore } from "react";
import styled from "styled-components";
import { queryClient } from "../../services/queryClient";
import {
  getScenario,
  isScenarioId,
  resetMockData,
  SCENARIO_EVENT,
  SCENARIOS,
  setScenario,
} from "../../services/mockControl";
import { useMatchStore } from "../../store/useMatchStore";
import { Button } from "../ui/Button";

const Details = styled.details`
  width: 100%;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.28);
  font-size: 0.85rem;

  summary {
    cursor: pointer;
    font-weight: 700;
    color: #ffd166;
  }
`;

const Body = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  margin-top: 10px;
`;

const Select = styled.select`
  width: 100%;
  min-height: 44px;
  padding: 0 10px;
  border: 2px solid #4b6f91;
  border-radius: 8px;
  background: #0b2238;
  color: #fff;
  font: inherit;
`;

const subscribe = (onChange: () => void) => {
  window.addEventListener(SCENARIO_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(SCENARIO_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
};

export function NetworkScenarioPanel() {
  const scenario = useSyncExternalStore(subscribe, getScenario, () => "success" as const);
  const description = SCENARIOS.find((item) => item.id === scenario)?.description ?? "";

  const handleChange = (value: string) => {
    if (!isScenarioId(value)) return;
    setScenario(value);
    // Refetch active queries so the new scenario is visible right away.
    void queryClient.invalidateQueries();
  };

  const handleReset = () => {
    resetMockData();
    useMatchStore.getState().clearAll();
    void queryClient.resetQueries();
  };

  return (
    <Details data-testid="network-panel">
      <summary>Network simulation (mock API)</summary>
      <Body>
        <label htmlFor="scenario-select">Scenario</label>
        <Select
          id="scenario-select"
          value={scenario}
          onChange={(event) => handleChange(event.target.value)}
          aria-describedby="scenario-description"
          data-testid="scenario-select"
        >
          {SCENARIOS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </Select>
        <p id="scenario-description">{description}</p>
        <Button
          type="button"
          $variant="secondary"
          onClick={handleReset}
          data-testid="reset-mocks"
        >
          Reset mock data
        </Button>
        <p>Reset removes stored matches, pending registrations and the scenario.</p>
      </Body>
    </Details>
  );
}
