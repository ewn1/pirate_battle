import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { GlobalStyle } from "./components/GlobalStyle";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./services/api/client";

// Função para iniciar o MSW em ambiente de desenvolvimento
async function enableMocking() {
  // Forma correta de checar ambiente de desenvolvimento no Vite (sem usar 'process')
  if (!import.meta.env.DEV) {
    return;
  }
  const { worker } = await import("./services/msw/browser");
  // Iniciamos o worker sem opções extras para evitar conflitos de tipagem do TypeScript
  return worker.start();
}

enableMocking().then(() => {
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <GlobalStyle />
        <App />
      </QueryClientProvider>
    </React.StrictMode>,
  );
});
