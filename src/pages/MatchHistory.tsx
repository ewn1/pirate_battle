import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { Panel } from "../components/ui/Panel";
import { Button } from "../components/ui/Button";

const Title = styled.h2`
  font-size: 2rem;
  margin-bottom: 20px;
  text-shadow: 2px 2px 4px #000;
  text-transform: uppercase;
`;

const PlaceholderText = styled.p`
  font-size: 1.2rem;
  margin-bottom: 30px;
  color: #ccc;
`;

export const MatchHistory = () => {
  const navigate = useNavigate();

  return (
    <Panel>
      <Title>Histórico de Partidas</Title>

      <PlaceholderText>Dados da API em breve...</PlaceholderText>

      <Button onClick={() => navigate("/")} tabIndex={1}>
        Voltar
      </Button>
    </Panel>
  );
};
