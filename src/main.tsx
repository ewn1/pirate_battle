import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

async function enableMocking() {
  if (import.meta.env.MODE === "production" || import.meta.env.DEV) {
    const { worker } = await import("./services/msw/browser");
    return worker.start();
  }
}

enableMocking().then(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
