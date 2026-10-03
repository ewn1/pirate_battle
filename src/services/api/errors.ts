/**
 * [API ERRORS]
 * Normalises everything Axios can throw into one ApiError with a `kind` and
 * a `retryable` flag. TanStack Query retries and the pending-match queue both
 * use `retryable` to decide whether trying again makes sense.
 */
import axios from "axios";

export type ApiErrorKind =
  | "timeout"
  | "network"
  | "client" // 4xx
  | "server" // 5xx
  | "cancelled"
  | "unknown";

export class ApiError extends Error {
  public readonly kind: ApiErrorKind;
  public readonly status: number | null;
  /** Network problems, timeouts and 5xx may succeed later; 4xx will not. */
  public readonly retryable: boolean;

  constructor(
    kind: ApiErrorKind,
    message: string,
    status: number | null = null,
  ) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    this.retryable = kind === "timeout" || kind === "network" || kind === "server";
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (axios.isCancel(error)) {
    return new ApiError("cancelled", "The request was cancelled.");
  }

  if (axios.isAxiosError(error)) {
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      return new ApiError("timeout", "The server took too long to answer.");
    }
    const status = error.response?.status ?? null;
    if (status !== null) {
      const serverMessage = (error.response?.data as { message?: string } | undefined)
        ?.message;
      if (status >= 500) {
        return new ApiError(
          "server",
          serverMessage ?? `The server is unavailable (HTTP ${status}).`,
          status,
        );
      }
      return new ApiError(
        "client",
        serverMessage ?? `The request was rejected (HTTP ${status}).`,
        status,
      );
    }
    return new ApiError("network", "Could not reach the server.");
  }

  return new ApiError(
    "unknown",
    error instanceof Error ? error.message : "Unexpected error.",
  );
}

/** Used by TanStack Query: at most 2 retries, only for retryable errors. */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  return failureCount < 2 && toApiError(error).retryable;
}
