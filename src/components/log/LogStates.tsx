/**
 * [LOG STATES + PAGINATION]
 * Small presentational pieces shared by the Ranking and Match History tabs:
 * loading, error (accessible, with retry), empty, refreshing and pagination.
 */
import type { ReactNode } from "react";
import styled from "styled-components";
import { Button } from "../ui/Button";

const Box = styled.div`
  width: 100%;
  padding: 18px 12px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.28);
  text-align: center;
  font-size: 0.95rem;
  color: #e8f0f8;
`;

export function LoadingState({ label }: { label: string }) {
  return (
    <Box role="status" data-testid="log-loading">
      {label}
    </Box>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <Box data-testid="log-empty">{message}</Box>;
}

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
  /** Compact variant: used when stale data is still shown below. */
  compact?: boolean;
}

export function ErrorState({ message, onRetry, compact }: ErrorStateProps) {
  return (
    <Box
      role="alert"
      data-testid="log-error"
      style={{ padding: compact ? "8px 12px" : undefined }}
    >
      <p>{message}</p>
      <div style={{ marginTop: 8 }}>
        <Button
          type="button"
          $variant="secondary"
          onClick={onRetry}
          data-testid="log-retry"
        >
          Try again
        </Button>
      </div>
    </Box>
  );
}

const RefreshNoteText = styled.p`
  min-height: 1.2em;
  font-size: 0.8rem;
  color: #c4d4e3;
`;

export function RefreshNote({
  children,
  role,
}: {
  children?: ReactNode;
  role?: string;
}) {
  return <RefreshNoteText role={role}>{children}</RefreshNoteText>;
}

/* -------------------------------------------------------------------------- */
/* [PAGINATION]                                                               */
/* -------------------------------------------------------------------------- */

const Nav = styled.nav`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
`;

const PageLabel = styled.span`
  min-width: 110px;
  text-align: center;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
`;

interface PaginationProps {
  page: number;
  totalPages: number;
  disabled?: boolean;
  onChange: (page: number) => void;
}

export function Pagination({
  page,
  totalPages,
  disabled,
  onChange,
}: PaginationProps) {
  return (
    <Nav aria-label="Pagination">
      <Button
        type="button"
        $variant="secondary"
        onClick={() => onChange(page - 1)}
        disabled={disabled || page <= 1}
        data-testid="page-prev"
      >
        Previous
      </Button>
      <PageLabel aria-live="polite" data-testid="page-indicator">
        Page {page} of {totalPages}
      </PageLabel>
      <Button
        type="button"
        $variant="secondary"
        onClick={() => onChange(page + 1)}
        disabled={disabled || page >= totalPages}
        data-testid="page-next"
      >
        Next
      </Button>
    </Nav>
  );
}
