import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { Panel } from "../components/ui/Panel";
import { Button } from "../components/ui/Button";

const TitleImage = styled.img`
  width: 100%;
  max-width: 400px;
  margin-bottom: 20px;
  filter: drop-shadow(0px 10px 10px rgba(0, 0, 0, 0.5));
`;

export const MainMenu = () => {
  const navigate = useNavigate();

  return (
    <Panel>
      <TitleImage
        src="/assets/png/default/ui/menu/title_pirate_battle.png"
        alt="Pirate Battle"
      />

      <Button onClick={() => navigate("/game")} tabIndex={1}>
        Jogar
      </Button>
      <Button onClick={() => navigate("/options")} tabIndex={2}>
        Opções
      </Button>
      <Button onClick={() => navigate("/ranking")} tabIndex={3}>
        Ranking
      </Button>
      <Button onClick={() => navigate("/history")} tabIndex={4}>
        Histórico
      </Button>
    </Panel>
  );
};
