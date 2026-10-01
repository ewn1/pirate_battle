import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiService } from "../services/api";
import type { MatchRecord } from "../services/msw/handlers";

export const LEADERBOARD_KEY = ["leaderboard"];
export const HISTORY_KEY = ["matchHistory"];

export const useLeaderboard = (page = 1, limit = 5) => {
  return useQuery({
    queryKey: [...LEADERBOARD_KEY, page, limit],
    queryFn: () => apiService.getLeaderboard(page, limit),
    staleTime: 1000 * 60,
  });
};

export const useMatchHistory = (page = 1, limit = 5) => {
  return useQuery({
    queryKey: [...HISTORY_KEY, page, limit],
    queryFn: () => apiService.getMatchHistory(page, limit),
    staleTime: 1000 * 60,
  });
};

export const useSubmitMatchResult = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Omit<MatchRecord, "createdAt">) =>
      apiService.submitMatchResult(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEADERBOARD_KEY });
      queryClient.invalidateQueries({ queryKey: HISTORY_KEY });
    },
  });
};

// Exportando alias para retrocompatibilidade com o GameView
export const useSubmitScore = useSubmitMatchResult;
