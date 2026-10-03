# Performance

## Summary

| Criterion | Result |
|---|---|
| Average ≥ 55 FPS on desktop with a real GPU | **Met**: 60 FPS, 0 frames over 20 ms |
| No growth trend in DOM nodes / listeners across start → play → exit cycles | **Met**: constant over 20 cycles |
| Heap does not grow without bound across cycles | **Met**: growth flattens (≈0.02 MB/cycle after warm-up) |
| No leftover canvas after leaving a match | **Met**: 0 canvases on the menu |

## Method

1. **FPS with a real GPU** (the representative number): game opened in Chrome with `?perf=1`, spawn interval set to 1 s (the most demanding setting), a match played by hand, frame times read from the in-game probe (`window.__PIRATE_PERF__.getReport()`).
2. **Worst case, software rendering**: `npm run build && npm run profile` runs a scripted player (steering, all three weapons, auto-heal) in headless Chromium **without a GPU**, so the browser draws everything on the CPU.
3. **Memory**: the same script runs repeated start → play → exit cycles, forcing a garbage collection after each one and recording JS heap, DOM nodes and event listeners through the Chrome DevTools Protocol.

The script writes `docs/reports/profile-<timestamp>.{json,md}` with hardware, browser, resolution and configuration.

## 1. FPS with a real GPU

- Hardware: Intel Core i7-10700F, NVIDIA GeForce GTX 1060 6 GB
- Browser: Google Chrome on Windows (desktop) Versão 154.0.8037.93 (Versão oficial) 64 bits
- Config: spawn interval 1 s (stress), match played by hand
- Sample: **38.4 s of play** (2,304 frames)

| Metric | Value |
|---|---|
| Average FPS | **60** |
| Average frame time | 16.67 ms |
| p95 / p99 frame time | 16.8 / 16.8 ms |
| Worst frame | 16.9 ms |
| Frames over 20 ms | **0** of 2,304 |
| Entities (avg / max) | 14.2 / 25 |
| JS heap | 13.7 MB |

60 FPS is the refresh rate of the monitor, so this result shows the game keeps the display's full rate without dropped frames, not its maximum possible rate.

## 2. Worst case: software rendering (no GPU)

Headless Chromium on WSL2 (Intel Core i7-10700F, 1280×720, software rasteriser):

| Run | Average FPS | Frame time avg | Frames > 20 ms | Entities avg / max |
|---|---|---|---|---|
| 180 s, spawn 1 s | 16.5 | 60.5 ms | 2,518 / 2,858 | 24.3 / 36 |
| 10 s, spawn 1 s | 21.8 | 46.0 ms | 173 / 218 | 7.6 / 19 |

This is not the experience of a normal player: the whole scene is rasterised on the CPU and the test script competes with the page for the main thread. The p95/p99/worst values of exactly 100 ms are the PixiJS ticker's frame-time cap. The run is kept as the lower bound for machines without hardware acceleration.

## 3. Memory: 20 start → play → exit cycles (after forced GC)

| Sample | JS heap (MB) | DOM nodes | JS listeners |
|---|---|---|---|
| baseline (menu) | 4.54 | 121 | 167 |
| after cycle 1 | 7.49 | 195 | 221 |
| after cycle 5 | 8.33 | 195 | 221 |
| after cycle 10 | 8.83 | 195 | 221 |
| after cycle 15 | 8.99 | 195 | 221 |
| after cycle 20 | 9.05 | 195 | 221 |

Reading:

- **DOM nodes (195) and listeners (221) are identical after every cycle**: nothing is left attached when a match is abandoned.
- The heap rises 2.95 MB on the first cycle (textures and audio buffers are loaded once and cached, and the game screen's own objects are created), then the growth slows from ~0.15 MB per cycle (cycles 2–5) to **~0.02 MB per cycle** (cycles 10–20: 8.83 → 9.05 MB). A curve that flattens like this is cache warm-up, not a leak, which would keep a constant slope.
- Canvases left on the menu: **0**.
- Not measured: GPU memory (texture memory) and long single sessions beyond 3 minutes.

## Design choices that protect performance

- Fixed-step simulation; rendering only reads the state.
- React receives changes only (health, score, whole seconds), never per frame.
- Display objects are destroyed at the end of their life; enemies capped at 12 alive, effects bounded.
- Textures are loaded once through `Assets`; nothing creates textures per frame.
- The water background is a single `TilingSprite`.
- Engine destruction is idempotent and releases ticker, listeners, textures and audio loops (verified by the E2E suite: a single canvas after repeated navigation and restarts).

## How to reproduce

```bash
npm run build
npm run profile                          # 180 s FPS run + 5 memory cycles (software rendering)
npm run profile -- --seconds=10 --cycles=20   # memory trend
```

For the real-GPU number: open the app in your browser with `?perf=1`, press Play, run `__PIRATE_PERF__.reset()` in the console, play, then `copy(JSON.stringify(__PIRATE_PERF__.getReport(), null, 2))`.

## Limitations

- The real-GPU sample is 38 s long and was played by hand, so the exact entity count and pace vary between runs.
- One machine only: repeat on other hardware (especially integrated graphics and a phone) before drawing wider conclusions.
- Headless software rendering is far slower than any real GPU and is only a lower bound.
- The scripted run auto-heals the ship so the match keeps its stress level.