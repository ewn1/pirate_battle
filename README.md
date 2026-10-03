# Pirate Battle

A 2D top-down naval shooter. Sink Chasers and Shooters, survive until the timer ends, and climb the ranking.

Stack: React 19 · strict TypeScript · PixiJS 8 · TanStack Query · Axios · MSW (mock API) · Zustand · styled-components · Playwright.

- Architecture: [ARCHITECTURE.md](./ARCHITECTURE.md)
- Performance method and results: [docs/PERFORMANCE.md](./docs/PERFORMANCE.md)
- Asset and font credits: [CREDITS.md](./CREDITS.md)

## Live demo

Deploy URL: `https://<your-project>.vercel.app` _(fill in after deploying, see "Deploy")_

## Setup

Requirements: Node 20+.

```bash
npm install
npm run dev            # http://localhost:5173
```

Production build / preview:

```bash
npm run build          # tsc -b && vite build
npm run preview        # http://localhost:4173
```

### Environment variables

See `.env.example`.

| Variable | Default | Purpose |
|---|---|---|
| `VITE_ENABLE_MOCKS` | enabled | Set to `false` to disable the MSW mock API. |

The mock API runs in the browser (MSW service worker), in development **and** in the published build, so the deployed app works without a backend. `public/mockServiceWorker.js` must exist; if it is missing run `npm run mocks:init`.

## How to play

| Action | Keys |
|---|---|
| Move forward / reverse | `W` `S` or `↑` `↓` |
| Turn | `A` `D` or `←` `→` |
| Frontal cannon | `Space` |
| Left / right broadside (3 shots) | `Q` / `E` |
| Pause / resume | `Esc` or `P` |

On touch devices on-screen controls appear (landscape only; portrait shows a notice and pauses). Force them on desktop with `?touch=1`.

The match pauses automatically when the window loses focus or the tab is hidden.

- **Chaser**: chases you and explodes on contact.
- **Shooter**: approaches, keeps its distance and fires at you.
- **Score**: 1 point per enemy destroyed by your attacks.
- **End**: the timer reaches zero, or your ship sinks.

## Options

Options screen: match duration (60–180 s) and enemy spawn interval (1–10 s). Press **Save**; values apply to the next match. Choices persist in `localStorage`.

## Captain's Log (Ranking and History)

Reachable from the main menu. Two tabs:

- **Ranking**: players ranked for the *currently configured* duration + spawn interval, 5 per page.
- **Match History**: the matches of this browser's player, 5 per page.

Every finished match is registered through `POST /api/history`. If registration fails it is kept in a persisted queue and retried (see ARCHITECTURE.md).

### Network simulation

Open **Network simulation (mock API)** at the bottom of the Captain's Log:

- Pick a **scenario** to reproduce failures and slow networks (success, empty lists, many pages, slow, variable latency, out-of-order, timeout, connection failure, HTTP 4xx, HTTP 5xx, ranking fails, history fails, timeout after registering, registration unavailable).
- **Reset mock data** clears stored matches, pending registrations and the scenario.

The scenario can also be set by URL: `/log?scenario=timeout`, or in the console: `localStorage.setItem("pirate-battle:scenario", "http-5xx")`.

Reproducing common failures:

| Goal | Steps |
|---|---|
| Ranking error + retry | Captain's Log → scenario *HTTP 5xx* → error with **Try again** → scenario *Success* → **Try again** |
| Registration that must recover | Scenario *Registration unavailable* → play a match → "Could not save yet" → switch to *Success* → **Retry now** (or wait for the automatic retry) |
| Slow loading state | Scenario *Slow network* |
| Late responses overwriting newer pages | Scenario *Out-of-order responses*, then change page quickly |

## Tests

```bash
npm run playwright:install   # once: downloads Chromium
npm run test:e2e             # all projects (desktop, mobile, visual)
npm run test:e2e:ui          # interactive runner
npm run test:e2e:report      # open the HTML report
npm run report:save          # copy the report to docs/reports/playwright
```

Visual regression baselines are **not** committed until generated on your machine:

```bash
npm run test:e2e:update      # creates/updates the screenshots (visual project)
```

Review the generated images, then commit `tests_e2e/__screenshots__/`.

Projects: `desktop` (Chrome 1280×720), `mobile` (Pixel 7 landscape, runs the touch spec), `visual` (desktop only).

Tests are deterministic: they use a seeded RNG and a **manual simulation clock** (`?manual=1&seed=7`) and drive time through the test hook `window.__PIRATE_TEST__` (observe state, advance time, place entities). Inputs are still real keyboard / pointer events. The failing-texture test uses the test-only flag `localStorage["pirate-battle:fail-assets"] = "1"`.

### URL flags (testing / profiling)

`?e2e=1` expose the test hook · `&manual=1` manual clock · `&seed=` simulation seed · `&mockSeed=` mock RNG seed · `&latencyScale=0` remove mock latency · `&apiTimeout=` Axios timeout (ms) · `&retryDelay=` query retry delay (ms) · `&perf=1` frame metrics · `&touch=1` force touch controls · `&scenario=` mock scenario · `?e2e=0` clears stored flags.

## Profiling

```bash
npm run build
npm run profile          # 180 s FPS run + 5 start→play→exit memory cycles
npm run profile:quick    # 30 s FPS run
```

Writes `docs/reports/profile-<timestamp>.{json,md}`. See [docs/PERFORMANCE.md](./docs/PERFORMANCE.md).

## Deploy

**Vercel** (config in `vercel.json`): import the repository, framework *Vite*, build `npm run build`, output `dist`. SPA rewrites and service-worker headers are already configured.

**Netlify / Cloudflare Pages**: build `npm run build`, publish `dist`. `public/_redirects` provides the SPA fallback.

After deploying, check: reload on `/log` and `/game/result` (no 404), Captain's Log loads (service worker active), and a finished match shows up in both tabs.

## Scripts

`dev` · `build` · `preview` · `lint` · `typecheck` · `test:e2e` · `test:e2e:ui` · `test:e2e:update` · `test:e2e:report` · `playwright:install` · `profile` · `profile:quick` · `report:save` · `mocks:init`
