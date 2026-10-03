# Architecture

## Layers

```
src/
  game/        PixiJS + simulation (no React)
    core/      GameEngine, asset manifest, shared types
    config/    GameConfig (balance numbers, limits)
    entities/  Player, Enemy, Projectile
    systems/   EnemySpawner, EffectsSystem
    ui/        ShipVisual, SpriteHealthBar
    utils/     Collision, InputManager, Random (seeded)
    testing/   test hook + perf probe (opt-in via URL flags)
  services/    api (Axios), msw (mock server), audio, runtimeParams, mockControl
  store/       Zustand: options/identity, matches (result + pending queue)
  hooks/       TanStack Query hooks, small UI hooks
  components/  presentational React (HUD, overlays, log tables, ui kit)
  pages/       routes: MainMenu, Options, CaptainsLog, GameView
```

Rule of thumb: **React owns screens, PixiJS owns the arena.** They only talk through a narrow interface.

## React ↔ PixiJS integration

`GameView` creates a `GameEngine` inside an effect keyed on a `runKey` (restart = new key). The engine receives a `GameCallbacks` object (`onLoadProgress`, `onHealthChange`, `onScoreChange`, `onTimeChange`, `onPauseChange`, `onGameOver`) and the host element. React never reads engine state per frame: the engine pushes **changes only** (health/score changes, time once per second), so React re-renders a few times per second, never 60 times.

Lifecycle is React 19 StrictMode-safe: `destroy()` is idempotent and, if the engine is destroyed while PixiJS is still initialising, initialisation is aborted and resources are released as soon as `Application.init` resolves. The canvas, ticker, listeners, timers, textures and the audio loop are all released on unmount; E2E tests assert a single canvas after repeated navigation and restarts.

## Simulation cycle

Fixed step of 1/60 s with an accumulator; the ticker only feeds elapsed time, so behaviour is frame-rate independent (capped catch-up to avoid a spiral of death after tab stalls). Per step: input → player → enemies (AI) → projectiles → collisions → effects/cleanup → timers/end checks. Rendering reads positions after the step.

In tests the ticker is disconnected (`?manual=1`) and time is advanced with `step(ms)`, which uses the very same `advance` function, so tests exercise real game rules.

## Collisions

Circle–circle checks for ships, projectiles and island blockers (`Collision.ts`). Islands push ships out along the contact normal; projectiles are removed on island contact. Projectile → enemy hits apply damage once (the projectile is consumed in the same step), and a kill increments the score exactly once because the enemy is flagged dead before scoring. A Chaser colliding with the player explodes, damages the player and does **not** score. Spawn points must be inside the arena margins and at least `minDistanceFromPlayer` from the player.

## Resource management

- Assets are loaded through `Assets` bundles (`loadGameAssets`) with progress reporting; a failed load unloads the bundle so **Retry** really refetches.
- Projectiles, effects and health bars are removed and destroyed when finished; no per-frame allocations of textures.
- Audio is WebAudio with decoded buffers cached once; the unlock happens on the first user gesture.
- Profiling checks heap, DOM nodes and listener counts across repeated start/exit cycles (`npm run profile`).

## Pause

States: `running ↔ paused` (reason: `manual | blur | hidden`). While paused the simulation does not advance, timers/cooldowns freeze, input is reset, audio loops stop. `blur` and `visibilitychange` pause automatically; a window blur never auto-resumes.

## Local persistence

| Key | Content |
|---|---|
| `pirate-battle:options:v1` | duration, spawn interval, anonymous `playerId` / `playerName` (clamped on load) |
| `pirate-battle:matches:v1` | last result, pending-registration queue, ids already saved |
| `pirate-battle:muted` | sound mute |
| `pirate-battle:scenario` | active mock scenario |
| `pirate-battle:mock-db:v1` | mock server "database" |
| sessionStorage `pirate-battle:runtime-params` | URL test flags |

## API contracts

Mocked with MSW (browser service worker, also in production).

- `GET /api/ranking?page&pageSize&sessionTimeSec&spawnIntervalMs` → `{ items: RankingEntry[], page, pageSize, total, totalPages }`, ordered by score desc, then shorter duration, then older.
- `GET /api/history?playerId&page&pageSize` → `Page<MatchRecord>`, most recent first.
- `POST /api/history` body `MatchRecord` → `201 { record, duplicate: false }` or `200 { record, duplicate: true }`. **Idempotent by `record.id`.**

Ranking and history read from the same persisted mock DB, so a registered match appears consistently in both. Fixtures are deterministic (seeded) for each supported configuration (12 players → 3 pages).

## Query cache and consistency

TanStack Query keys: `["ranking", config, page]` and `["history", playerId, page]`. A page is part of the key, so a late response for page 1 can never overwrite page 2. Requests receive an `AbortSignal`. Retries: at most 2, only for retryable errors (timeout, network, 5xx); 4xx never retries. Showing a tab refetches it; the pagination controls are disabled while a different page is loading. After a successful registration both queries are invalidated.

## Registration and the pending queue

`completeMatch` stores the result and enqueues a `MatchRecord` (persisted). `SyncManager` sends queued entries with exponential backoff, de-duplicated by `inFlight`. Outcomes:

- success / `duplicate: true` → `saved` (this is how a *timeout after the server stored it* is recovered without duplicates);
- retryable error → stays queued (`pending`), retried automatically, also after a page reload;
- 4xx → `failed`, shown with a manual **Retry now**.

The result screen reflects the status live (`saving → saved | pending | failed`).

## Mobile

Touch controls use pointer events with per-pointer tracking, so movement and fire can be held simultaneously. Landscape is required; portrait shows a notice and pauses the match.

## Accessibility

Dialogs trap focus and restore it; tabs follow the WAI-ARIA pattern with arrow keys; results and errors use `role="status"/"alert"`; a screen-reader region announces score/health/time milestones.

## Balance decisions

All numbers live in `GameConfig.ts` (player 100 HP; frontal 25 dmg / 0.5 s; broadside 3×20 dmg / 1.4 s; Chaser 30 HP, 25 contact damage; Shooter 50 HP, 15 dmg shots / 1.6 s; max 12 enemies alive). Config is deep-frozen per match.

## Known limitations

- Mock API only (no real backend); the "database" is the browser's `localStorage`.
- Test-only flags (`?e2e`, fail-assets) are inert unless explicitly set.
- Visual baselines depend on the rendering stack; generate them on the machine/CI that runs the tests.
- Performance numbers are per-machine (see docs/PERFORMANCE.md).
