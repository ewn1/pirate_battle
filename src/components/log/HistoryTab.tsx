/**
 * [MATCH HISTORY TAB]
 * Paginated list of the current player's completed matches.
 */
import { useState } from "react";
import { useHistoryQuery } from "../../hooks/useMatchQueries";
import { toApiError } from "../../services/api/errors";
import { useGameStore } from "../../store/useGameStore";
import { endReasonLabel, formatClock, formatDateTime } from "../../utils/format";
import { EmptyState, ErrorState, LoadingState, Pagination, RefreshNote } from "./LogStates";
import { Table, TableWrap } from "./LogTable";
import { PanelText } from "../ui/Panel";

export function HistoryTab() {
  const playerId = useGameStore((state) => state.playerId);
  const playerName = useGameStore((state) => state.playerName);

  const [page, setPage] = useState(1);
  const query = useHistoryQuery(playerId, page);
  const data = query.data;

  if (data && page > data.totalPages) setPage(data.totalPages);

  const refreshing = query.isFetching && !query.isPending;

  return (
    <>
      <PanelText>{playerName} · your recent battles</PanelText>

      {query.isPending && <LoadingState label="Loading your battles…" />}

      {query.isError && (
        <ErrorState
          compact={data !== undefined}
          message={
            data
              ? "Could not refresh your history. Showing the last data received."
              : `Could not load your history. ${toApiError(query.error).message}`
          }
          onRetry={() => void query.refetch()}
        />
      )}

      {data && data.items.length === 0 && !query.isError && (
        <EmptyState message="You have no completed battles yet. Set sail and make history!" />
      )}

      {data && data.items.length > 0 && (
        <TableWrap>
          <Table data-testid="history-table">
            <caption className="sr-only">Match history, page {data.page}</caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Points</th>
                <th scope="col">Duration</th>
                <th scope="col">Result</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((entry) => (
                <tr key={entry.id} data-testid="history-row">
                  <td>{formatDateTime(entry.playedAt)}</td>
                  <td>{entry.score}</td>
                  <td>{formatClock(entry.durationSeconds)}</td>
                  <td>{endReasonLabel(entry.reason)}</td>
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
