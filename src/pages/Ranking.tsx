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
    padding: 12px;
    text-align: center;
    border-bottom: 1px solid #444;
  }

  th {
    color: #ffcc00;
    font-weight: bold;
    text-transform: uppercase;
  }

  tr:last-child td {
    border-bottom: none;
  }
`;

interface RankingEntry {
  id: number;
  name: string;
  score: number;
}

export const Ranking = () => {
  const navigate = useNavigate();

  const {
    data: rankingData,
    isLoading,
    isError,
  } = useQuery<RankingEntry[]>({
    queryKey: ["ranking"],
    queryFn: async () => {
      const response = await api.get("/ranking");
      return response.data;
    },
  });

  return (
    <Panel>
      <Title>Leaderboard</Title>

      {isLoading && <p>Loading leaderboard...</p>}
      {isError && <p>Failed to load leaderboard data.</p>}

      {!isLoading && !isError && rankingData && (
        <Table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Pirate</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {rankingData.map((entry, index) => (
              <tr key={entry.id}>
                <td>#{index + 1}</td>
                <td>{entry.name}</td>
                <td>{entry.score}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Button onClick={() => navigate("/")}>Back</Button>
    </Panel>
  );
};
