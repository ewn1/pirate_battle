import { http, passthrough } from "msw";
import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

const passthroughFallback = http.all("*", () => passthrough());

export const worker = setupWorker(...handlers, passthroughFallback);

export function startMockWorker() {
  return worker.start({
    quiet: true,
    serviceWorker: { url: "/mockServiceWorker.js" },
  });
}
