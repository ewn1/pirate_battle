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

  const {
    data: historyData,
    isLoading,
    isError,
  } = useQuery<HistoryEntry[]>({
    queryKey: ["history"],
    queryFn: async () => {
      const response = await api.get("/history");
      return response.data;
    },
  });

  return (
    <Panel>
      <Title>Match History</Title>

      {isLoading && <p>Loading battle log...</p>}
      {isError && <p>Failed to load match history.</p>}

      {!isLoading && !isError && historyData && (
        <Table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Duration</th>
              <th>Enemies</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {historyData.map((entry) => (
              <tr key={entry.id}>
                <td>{new Date(entry.date).toLocaleDateString("en-US")}</td>
                <td>{entry.duration}s</td>
                <td>{entry.enemiesDefeated}</td>
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
