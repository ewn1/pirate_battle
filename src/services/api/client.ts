import axios from "axios";
import { QueryClient } from "@tanstack/react-query";

// Instância padronizada do Axios
export const api = axios.create({
  baseURL: "/api",
});

// Instância global do gerenciador de estado assíncrono
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Evita refetch desnecessário ao mudar de aba
      staleTime: 1000 * 60 * 5, // Mantém o dado em cache por 5 minutos
    },
  },
});
