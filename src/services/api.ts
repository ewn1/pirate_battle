import { apiClient } from "./api/client";
import type { MatchRecord } from "./msw/handlers";

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface LeaderboardEntry extends MatchRecord {
  rank: number;
}

export const apiService = {
  getLeaderboard: async (
    page = 1,
    limit = 5,
  ): Promise<PaginatedResponse<LeaderboardEntry>> => {
    const response = await apiClient.get<PaginatedResponse<LeaderboardEntry>>(
      `/leaderboard?page=${page}&limit=${limit}`,
    );
    return response.data;
  },

  getMatchHistory: async (
    page = 1,
    limit = 5,
  ): Promise<PaginatedResponse<MatchRecord>> => {
    const response = await apiClient.get<PaginatedResponse<MatchRecord>>(
      `/history?page=${page}&limit=${limit}`,
    );
    return response.data;
  },

  submitMatchResult: async (
    payload: Omit<MatchRecord, "createdAt">,
  ): Promise<MatchRecord> => {
    const response = await apiClient.post<MatchRecord>("/history", payload);
    return response.data;
  },
};
