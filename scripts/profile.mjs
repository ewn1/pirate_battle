/**
 * [PROFILING SCRIPT]
 * Measures FPS / frame times for a long match and checks memory growth across
 * repeated start -> play -> exit cycles.
 *
 *   npm run build
 *   npm run profile                       # 180 s FPS run + 5 memory cycles
 *   npm run profile:quick                 # 30 s FPS run + 5 cycles
 *   node scripts/profile.mjs --headed --url=https://your-app.vercel.app
 *
 * Flags: --seconds=180  --cycles=5  --cycleSeconds=10  --headed  --url=<base>
 * Output: docs/reports/profile-<timestamp>.json and .md
 *
 * NOTE: numbers depend on the machine; the report records hardware, browser,
 * resolution and config so results can be compared fairly.
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import { chromium } from "@playwright/test";

/* ------------------------------ [ARGUMENTS] ------------------------------ */
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  }),
);
const SECONDS = Number(args.seconds ?? 180);
const CYCLES = Number(args.cycles ?? 5);
const CYCLE_SECONDS = Number(args.cycleSeconds ?? 10);
const HEADED = Boolean(args.headed);
const VIEWPORT = { width: 1280, height: 720 };
const CONFIG = { sessionTimeSec: 180, spawnIntervalMs: 1000 }; // stress: fastest spawn

/* ------------------------------ [SERVER] --------------------------------- */
async function reachable(url) {
  try {
    return (await fetch(url)).ok;
  } catch {
    return false;
  }
}

async function ensureServer() {
  if (args.url) return { base: String(args.url).replace(/\/$/, ""), stop() {} };
  const base = "http://localhost:4173";
  if (await reachable(base)) return { base, stop() {} };
  console.log("Starting `vite preview` (run `npm run build` first)...");
  const child = spawn("npx", ["vite", "preview", "--port", "4173", "--strictPort"], {
    stdio: "ignore",
    shell: process.platform === "win32",
  });
  for (let i = 0; i < 50; i++) {
    if (await reachable(base)) return { base, stop: () => child.kill() };
    await new Promise((r) => setTimeout(r, 300));
  }
  child.kill();
  throw new Error("Could not start the preview server. Run `npm run build` first.");
}

/* ------------------------------ [HELPERS] -------------------------------- */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function newPage(browser, base, flags) {
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();
  await page.addInitScript(
    ([key, value]) => localStorage.setItem(key, JSON.stringify({ state: { playerId: "perf", playerName: "Perf", ...value }, version: 1 })),
    ["pirate-battle:options:v1", CONFIG],
  );
  await page.goto(`${base}/?e2e=1&latencyScale=0&${flags}`);
  return { context, page };
}

async function startMatch(page) {
  await page.getByTestId("play-button").click();
  await page.waitForFunction(() => window.__PIRATE_TEST__?.getSnapshot().status === "running", null, { timeout: 30000 });
}

/** Simulates a player: steers, fires, and keeps the ship alive. */
async function playFor(page, seconds, onTick) {
  const end = Date.now() + seconds * 1000;
  const keys = ["KeyW", "KeyA", "KeyD", "Space", "KeyQ", "KeyE"];
  let tick = 0;
  await page.keyboard.down("KeyW");
  while (Date.now() < end) {
    const key = keys[tick % keys.length];
    if (key !== "KeyW") {
      await page.keyboard.down(key);
      await sleep(120);
      await page.keyboard.up(key);
    } else await sleep(200);
    tick++;
    const state = await page.evaluate(() => {
      const t = window.__PIRATE_TEST__;
      const s = t.getSnapshot();
      if (s.status === "running" && s.player.health < 50) t.setPlayerHealth(s.player.maxHealth); // keep the stress test running
      return s.status;
    });
    if (state === "over") {
      await page.keyboard.up("KeyW");
      await page.getByTestId("play-again").click();
      await page.waitForFunction(() => window.__PIRATE_TEST__?.getSnapshot().status === "running");
      await page.keyboard.down("KeyW");
    }
    onTick?.();
  }
  await page.keyboard.up("KeyW");
}

async function metrics(cdp) {
  const { metrics: list } = await cdp.send("Performance.getMetrics");
  const m = Object.fromEntries(list.map((x) => [x.name, x.value]));
  return {
    jsHeapMB: Number((m.JSHeapUsedSize / 1048576).toFixed(2)),
    domNodes: m.Nodes,
    jsEventListeners: m.JSEventListeners,
  };
}

/* ------------------------------ [FPS RUN] -------------------------------- */
async function fpsRun(browser, base) {
  const { context, page } = await newPage(browser, base, "perf=1");
  await startMatch(page);
  await page.evaluate(() => window.__PIRATE_PERF__.reset());
  await playFor(page, SECONDS);
  const report = await page.evaluate(() => window.__PIRATE_PERF__.getReport());
  await context.close();
  return report;
}

/* ------------------------------ [MEMORY CYCLES] -------------------------- */
async function memoryCycles(browser, base) {
  const { context, page } = await newPage(browser, base, "");
  const cdp = await context.newCDPSession(page);
  await cdp.send("Performance.enable");
  const samples = [];

  const sample = async (label) => {
    await cdp.send("HeapProfiler.enable");
    await cdp.send("HeapProfiler.collectGarbage");
    await sleep(300);
    samples.push({ label, ...(await metrics(cdp)) });
  };

  await sample("baseline (menu)");
  for (let i = 1; i <= CYCLES; i++) {
    await startMatch(page);
    await playFor(page, CYCLE_SECONDS);
    await page.getByTestId("pause-button").click();
    await page.getByTestId("menu-button").click();
    await page.getByTestId("play-button").waitFor();
    await sample(`after cycle ${i}`);
  }
  const canvases = await page.locator("canvas").count();
  await context.close();
  return { samples, canvasesLeftOnMenu: canvases };
}

/* ------------------------------ [REPORT] --------------------------------- */
function toMarkdown(data) {
  const f = data.fps;
  const rows = data.memory.samples
    .map((s) => `| ${s.label} | ${s.jsHeapMB} | ${s.domNodes} | ${s.jsEventListeners} |`)
    .join("\n");
  const first = data.memory.samples[0];
  const last = data.memory.samples.at(-1);
  return `# Performance report

Generated: ${data.generatedAt}

## Environment
- Hardware: ${data.environment.cpu} (${data.environment.cores} cores), ${data.environment.memoryGB} GB RAM
- OS: ${data.environment.platform}
- Browser: ${data.environment.browser}${data.environment.headless ? " (headless)" : ""}
- Resolution: ${data.environment.viewport.width}x${data.environment.viewport.height}
- Target: ${data.environment.base}
- Match config: ${data.config.sessionTimeSec}s session, spawn every ${data.config.spawnIntervalMs} ms (stress)

## FPS (${data.fpsSeconds}s of play)
| Metric | Value |
|---|---|
| Average FPS | ${f.avgFps} |
| Average frame time | ${f.avgFrameMs} ms |
| p95 / p99 frame time | ${f.p95FrameMs} / ${f.p99FrameMs} ms |
| Worst frame | ${f.maxFrameMs} ms |
| Frames over 20 ms | ${f.framesOver20ms} of ${f.frames} |
| Entities (avg / max) | ${f.entities.avg} / ${f.entities.max} |

## Memory over ${data.cycles} start -> play -> exit cycles (after forced GC)
| Sample | JS heap (MB) | DOM nodes | JS listeners |
|---|---|---|---|
${rows}

Heap growth baseline -> last: ${(last.jsHeapMB - first.jsHeapMB).toFixed(2)} MB. Canvases left on the menu: ${data.memory.canvasesLeftOnMenu}.

## Limitations
- Headless/software rendering can be slower than a real GPU; compare like with like.
- The ship is auto-healed during the run so the match keeps its stress level.
- One machine, one run: repeat on other hardware before drawing conclusions.
`;
}

/* ------------------------------ [MAIN] ----------------------------------- */
const server = await ensureServer();
const browser = await chromium.launch({
  headless: !HEADED,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required", "--js-flags=--expose-gc"],
});
try {
  console.log(`FPS run: ${SECONDS}s ...`);
  const fps = await fpsRun(browser, server.base);
  console.log(`Memory cycles: ${CYCLES} x ${CYCLE_SECONDS}s ...`);
  const memory = await memoryCycles(browser, server.base);

  const data = {
    generatedAt: new Date().toISOString(),
    environment: {
      cpu: os.cpus()[0]?.model ?? "unknown",
      cores: os.cpus().length,
      memoryGB: Number((os.totalmem() / 1073741824).toFixed(1)),
      platform: `${os.type()} ${os.release()}`,
      browser: `Chromium ${browser.version()}`,
      headless: !HEADED,
      viewport: VIEWPORT,
      base: server.base,
    },
    config: CONFIG,
    fpsSeconds: SECONDS,
    cycles: CYCLES,
    fps,
    memory,
  };
  mkdirSync("docs/reports", { recursive: true });
  const stamp = data.generatedAt.replace(/[:.]/g, "-");
  writeFileSync(`docs/reports/profile-${stamp}.json`, JSON.stringify(data, null, 2));
  writeFileSync(`docs/reports/profile-${stamp}.md`, toMarkdown(data));
  console.log(toMarkdown(data));
  console.log(`Saved to docs/reports/profile-${stamp}.{json,md}`);
} finally {
  await browser.close();
  server.stop();
}
