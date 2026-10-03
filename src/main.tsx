/**
 * [ENTRY POINT]
 * Starts the MSW service worker BEFORE rendering, in development and in the
 * published build, so the first ranking/history request is already mocked.
 * Set VITE_ENABLE_MOCKS=false to disable the mocks (see .env.example).
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { applyScenarioFromUrl } from "./services/mockControl";

async function enableMocking(): Promise<void> {
  if (import.meta.env.VITE_ENABLE_MOCKS === "false") return;

  applyScenarioFromUrl();
  try {
    const { startMockWorker } = await import("./services/msw/browser");
    await startMockWorker();
  } catch (error) {
    // The game must stay usable even if service workers are unavailable.
    console.warn("[mocks] could not start the mock service worker", error);
  }
}

void enableMocking().then(() => {
  const root = document.getElementById("root");
  if (!root) throw new Error("Root element #root not found");
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
