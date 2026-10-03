/**
 * [CAPTAIN'S LOG]
 * Main-menu area with two tabs: Ranking and Match History.
 * The active tab lives in the URL (`/log?tab=history`). Tab panels unmount when
 * hidden, so showing a tab again always refetches its data.
 */
import { useRef, type KeyboardEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import styled from "styled-components";
import { HistoryTab } from "../components/log/HistoryTab";
import { NetworkScenarioPanel } from "../components/log/NetworkScenarioPanel";
import { RankingTab } from "../components/log/RankingTab";
import { Button, TabButton } from "../components/ui/Button";
import { Page, Panel, PanelTitle } from "../components/ui/Panel";
import { useMatchStore } from "../store/useMatchStore";

type TabId = "ranking" | "history";
const TABS: Array<{ id: TabId; label: string }> = [
  { id: "ranking", label: "Ranking" },
  { id: "history", label: "Match History" },
];

const TabList = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 300px;
`;

const Banner = styled.div`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ffd166;
  border-radius: 8px;
  background: rgba(255, 209, 102, 0.12);
  font-size: 0.85rem;
  text-align: center;
`;

export function CaptainsLog() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab: TabId = params.get("tab") === "history" ? "history" : "ranking";

  const queue = useMatchStore((state) => state.queue);
  const retryNow = useMatchStore((state) => state.retryNow);
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({
    ranking: null,
    history: null,
  });

  const selectTab = (id: TabId) => setParams({ tab: id }, { replace: true });

  // Roving focus between tabs with the arrow keys (WAI-ARIA tabs pattern).
  const onTabKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next: TabId = tab === "ranking" ? "history" : "ranking";
    selectTab(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <Page>
      <Panel $wide aria-labelledby="log-title">
        <PanelTitle id="log-title">Captain&apos;s Log</PanelTitle>

        <TabList role="tablist" aria-label="Captain's Log sections" onKeyDown={onTabKeyDown}>
          {TABS.map((item) => (
            <TabButton
              key={item.id}
              ref={(element: HTMLButtonElement | null) => {
                tabRefs.current[item.id] = element;
              }}
              type="button"
              role="tab"
              id={`tab-${item.id}`}
              aria-selected={tab === item.id}
              aria-controls={`panel-${item.id}`}
              tabIndex={tab === item.id ? 0 : -1}
              $active={tab === item.id}
              onClick={() => selectTab(item.id)}
              data-testid={`tab-${item.id}`}
            >
              {item.label}
            </TabButton>
          ))}
        </TabList>

        {queue.length > 0 && (
          <Banner role="status" data-testid="pending-banner">
            {queue.length === 1
              ? "1 battle is waiting to be saved."
              : `${queue.length} battles are waiting to be saved.`}{" "}
            <Button
              type="button"
              $variant="secondary"
              onClick={() => queue.forEach((entry) => retryNow(entry.record.id))}
              data-testid="pending-retry"
            >
              Retry now
            </Button>
          </Banner>
        )}

        <Content role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
          {tab === "ranking" ? <RankingTab /> : <HistoryTab />}
        </Content>

        <NetworkScenarioPanel />

        <Button
          type="button"
          onClick={() => navigate("/")}
          data-sound="back"
          data-testid="log-main-menu"
        >
          Main menu
        </Button>
      </Panel>
    </Page>
  );
}
