import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api/client";
import { Panel } from "../components/ui/Panel";
import { Button } from "../components/ui/Button";

const Title = styled.h2`
  font-size: 2rem;
  margin-bottom: 20px;
  text-shadow: 2px 2px 4px #000;
  text-transform: uppercase;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 8px;

  th,
  td {
    padding: 10px;
    text-align: center;
    border-bottom: 1px solid #444;
  }

  th {
    color: #ffcc00;
  }
`;

interface HistoryEntry {
  id: number;
  date: string;
  score: number;
  enemiesDefeated: number;
  duration: number;
}

export const MatchHistory = () => {
  const navigate = useNavigate();

  const { data: historyData, isLoading } = useQuery<HistoryEntry[]>({
    queryKey: ["history"],
    queryFn: async () => {
      const response = await api.get("/history");
      return response.data;
    },
  });

  return (
    <Panel>
      <Title>Histórico de Partidas</Title>

      {isLoading ? (
        <p>Carregando registro de batalhas...</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Duração</th>
              <th>Inimigos</th>
              <th>Pontuação</th>
            </tr>
          </thead>
          <tbody>
            {historyData?.map((entry) => (
              <tr key={entry.id}>
                <td>{new Date(entry.date).toLocaleDateString("pt-BR")}</td>
                <td>{entry.duration}s</td>
                <td>{entry.enemiesDefeated}</td>
                <td>{entry.score}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Button onClick={() => navigate("/")}>Voltar</Button>
    </Panel>
  );
};
