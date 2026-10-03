/**
 * [MAIN MENU]
 * Play, Options, control instructions and shortcuts to the Ranking and
 * Match History tabs (Captain's Log).
 */
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { ControlsHelp } from "../components/ControlsHelp";
import { SoundToggle } from "../components/SoundToggle";
import { Button } from "../components/ui/Button";
import { Page, Panel, PanelText } from "../components/ui/Panel";

const Title = styled.img`
  width: min(100%, 360px);
  height: auto;
  filter: drop-shadow(0 6px 8px rgba(0, 0, 0, 0.5));
`;

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
`;

export function MainMenu() {
  const navigate = useNavigate();

  return (
    <Page>
      <Panel aria-label="Main menu">
        <h1 style={{ margin: 0 }}>
          <Title
            src="/assets/png/default/ui/menu/title_pirate_battle.png"
            alt="Pirate Battle"
            width={384}
            height={128}
          />
        </h1>
        <PanelText>Set sail. Take command.</PanelText>

        <Button type="button" onClick={() => navigate("/game")} data-testid="play-button">
          Play
        </Button>
        <Button
          type="button"
          onClick={() => navigate("/options")}
          data-sound="open"
          data-testid="options-button"
        >
          Options
        </Button>

        <ControlsHelp />

        <Row role="group" aria-label="Captain's Log">
          <Button
            type="button"
            $variant="secondary"
            onClick={() => navigate("/log?tab=ranking")}
            data-sound="open"
            data-testid="ranking-button"
          >
            Ranking
          </Button>
          <Button
            type="button"
            $variant="secondary"
            onClick={() => navigate("/log?tab=history")}
            data-sound="open"
            data-testid="history-button"
          >
            Match History
          </Button>
          <SoundToggle />
        </Row>
      </Panel>
    </Page>
  );
}
