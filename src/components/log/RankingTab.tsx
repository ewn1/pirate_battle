/**
 * [RANKING TAB]
 * Paginated ranking of matches played with the SAME configuration as the
 * player's current options (only comparable matches are ranked together).
 */
import { useMemo, useState } from "react";
import { useRankingQuery } from "../../hooks/useMatchQueries";
import { toApiError } from "../../services/api/errors";
import { useGameStore } from "../../store/useGameStore";
import { formatDateTime, formatSeconds } from "../../utils/format";
import { EmptyState, ErrorState, LoadingState, Pagination, RefreshNote } from "./LogStates";
import { Table, TableWrap, YouBadge } from "./LogTable";
import { PanelText } from "../ui/Panel";

export function RankingTab() {
  const sessionTimeSec = useGameStore((state) => state.sessionTimeSec);
  const spawnIntervalMs = useGameStore((state) => state.spawnIntervalMs);
  const playerId = useGameStore((state) => state.playerId);

  const config = useMemo(
    () => ({ sessionTimeSec, spawnIntervalMs }),
    [sessionTimeSec, spawnIntervalMs],
  );
  const [page, setPage] = useState(1);
  const query = useRankingQuery(config, page);
  const data = query.data;

  // The ranking shrank (e.g. after a reset): move to the last existing page.
  if (data && page > data.totalPages) setPage(data.totalPages);

  const refreshing = query.isFetching && !query.isPending;

  return (
    <>
      <PanelText data-testid="ranking-subtitle">
        {sessionTimeSec} second battles · {formatSeconds(spawnIntervalMs)} second spawn interval
      </PanelText>

      {query.isPending && <LoadingState label="Loading the ranking…" />}

      {query.isError && (
        <ErrorState
          compact={data !== undefined}
          message={
            data
              ? "Could not refresh the ranking. Showing the last data received."
              : `Could not load the ranking. ${toApiError(query.error).message}`
          }
          onRetry={() => void query.refetch()}
        />
      )}

      {data && data.items.length === 0 && !query.isError && (
        <EmptyState message="No battles with these settings yet. Be the first captain on the board!" />
      )}

      {data && data.items.length > 0 && (
        <TableWrap>
          <Table data-testid="ranking-table">
            <caption className="sr-only">Ranking, page {data.page}</caption>
            <thead>
              <tr>
                <th scope="col">Rank</th>
                <th scope="col">Captain</th>
                <th scope="col">Points</th>
                <th scope="col">Played</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((entry) => (
                <tr
                  key={entry.id}
                  data-testid="ranking-row"
                  data-mine={entry.playerId === playerId}
                >
                  <td>{String(entry.rank).padStart(2, "0")}</td>
                  <td>
                    {entry.playerName}
                    {entry.playerId === playerId && <YouBadge>You</YouBadge>}
                  </td>
                  <td>{entry.score}</td>
                  <td>{formatDateTime(entry.playedAt)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}

      <RefreshNote role="status">{refreshing ? "Refreshing…" : ""}</RefreshNote>

      {data && (
        <Pagination
          page={Math.min(page, data.totalPages)}
          totalPages={data.totalPages}
          disabled={query.isPlaceholderData}
          onChange={setPage}
        />
      )}
    </>
  );
}
