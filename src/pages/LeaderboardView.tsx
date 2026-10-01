import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { useLeaderboard } from "../hooks/useLeaderboard";

export const LeaderboardView: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useLeaderboard(page, 5);

  const items = data?.items || [];
  const totalPages = data?.totalPages || 1;

  return (
    <Container>
      <Panel>
        <Header>
          <Title>CAPTAINS LEADERBOARD</Title>
          <BackButton onClick={() => navigate("/")}>
            <ButtonIcon
              src="/assets/png/default/ui/controls/icon_home.png"
              alt=""
            />
            Menu
          </BackButton>
        </Header>

        {isLoading && <StatusText>Loading hall of fame...</StatusText>}
        {isError && (
          <StatusText $error>Error fetching leaderboard data.</StatusText>
        )}

        {!isLoading && !isError && (
          <>
            <TableContainer>
              <Table>
                <thead>
                  <tr>
                    <Th>Rank</Th>
                    <Th>Captain</Th>
                    <Th>Score</Th>
                    <Th>Time</Th>
                    <Th>Outcome</Th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((entry) => (
                    <tr key={entry.id}>
                      <Td $highlight={entry.rank <= 3}>#{entry.rank}</Td>
                      <Td>{entry.playerName}</Td>
                      <Td>{entry.score}</Td>
                      <Td>{entry.duration}s</Td>
                      <Td $survived={entry.survived}>
                        {entry.survived ? "Survived" : "Sunk"}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableContainer>

            <PaginationContainer>
              <PageButton
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </PageButton>
              <PageInfo>
                {page} / {totalPages}
              </PageInfo>
              <PageButton
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </PageButton>
            </PaginationContainer>
          </>
        )}
      </Panel>
    </Container>
  );
};

const Container = styled.div`
  width: 100vw;
  height: 100vh;
  background-image: url("/assets/ui_scene_background.png");
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16px;
  box-sizing: border-box;
`;

const Panel = styled.div`
  background-image: url("/assets/png/default/ui/menu/panel_menu.png");
  background-size: 100% 100%;
  background-repeat: no-repeat;
  width: 100%;
  max-width: 620px;
  max-height: 90vh;
  padding: 40px 44px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  color: #fff;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7);
  overflow: hidden;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 20px;
  color: #f8e3a1;
  text-shadow: 2px 2px 4px #000;
`;

const BackButton = styled.button`
  padding: 6px 12px;
  background-color: #3a2312;
  border: 2px solid #8b5a2b;
  border-radius: 6px;
  color: #f8e3a1;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: bold;
  font-size: 13px;

  &:hover {
    background-color: #4a2f18;
  }
`;

const ButtonIcon = styled.img`
  width: 14px;
  height: 14px;
`;

const TableContainer = styled.div`
  width: 100%;
  max-height: 260px;
  overflow-y: auto;
  margin-bottom: 12px;
  border-radius: 6px;
  background-color: rgba(0, 0, 0, 0.4);

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: #8b5a2b;
    border-radius: 3px;
  }
  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Th = styled.th`
  padding: 10px 12px;
  text-align: left;
  border-bottom: 2px solid #8b5a2b;
  color: #f8e3a1;
  font-size: 13px;
  position: sticky;
  top: 0;
  background-color: #1a110a;
`;

const Td = styled.td<{ $highlight?: boolean; $survived?: boolean }>`
  padding: 8px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 13px;
  color: ${(props) =>
    props.$highlight
      ? "#f8e3a1"
      : props.$survived !== undefined
        ? props.$survived
          ? "#81c784"
          : "#e57373"
        : "#fff"};
  font-weight: ${(props) => (props.$highlight ? "bold" : "normal")};
`;

const PaginationContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  margin-top: auto;
`;

const PageButton = styled.button`
  padding: 4px 10px;
  background-color: #3a2312;
  border: 1px solid #8b5a2b;
  border-radius: 4px;
  color: #f8e3a1;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PageInfo = styled.span`
  font-size: 12px;
  color: #f8e3a1;
`;

const StatusText = styled.p<{ $error?: boolean }>`
  text-align: center;
  padding: 24px;
  color: ${(props) => (props.$error ? "#f44336" : "#aaa")};
  font-size: 14px;
`;
