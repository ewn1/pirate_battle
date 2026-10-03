/**
 * [LOG TABLE]
 * Styled data table shared by Ranking and Match History.
 */
import styled from "styled-components";

export const TableWrap = styled.div`
  width: 100%;
  overflow-x: auto;
`;

export const Table = styled.table`
  width: 100%;
  min-width: 420px;
  border-collapse: separate;
  border-spacing: 0 4px;
  font-size: 0.9rem;

  th {
    padding: 4px 10px;
    text-align: left;
    font-size: 0.7rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #9fb7cf;
  }

  td {
    padding: 9px 10px;
    background: rgba(255, 255, 255, 0.06);
    font-variant-numeric: tabular-nums;
  }
  td:first-child {
    border-radius: 6px 0 0 6px;
  }
  td:last-child {
    border-radius: 0 6px 6px 0;
  }

  tr[data-mine="true"] td {
    background: rgba(255, 209, 102, 0.2);
  }
`;

export const YouBadge = styled.span`
  margin-left: 8px;
  padding: 1px 6px;
  border-radius: 4px;
  background: #ffd166;
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #1b1200;
`;
