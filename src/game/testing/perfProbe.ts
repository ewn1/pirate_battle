/**
 * [PERF PROBE]
 * Optional frame-time recorder, enabled with `?perf=1`.
 * Exposes `window.__PIRATE_PERF__` so the profiling script can read:
 *   - average FPS, 95th/99th percentile frame time, worst frame
 *   - number of entities (ships + projectiles + effects)
 *   - JS heap size (Chromium only)
 */
export interface PerfReport {
  frames: number;
  durationMs: number;
  avgFps: number;
  avgFrameMs: number;
  p95FrameMs: number;
  p99FrameMs: number;
  maxFrameMs: number;
  framesOver20ms: number;
  entities: { avg: number; max: number };
  usedJSHeapMB: number | null;
}

export interface PerfApi {
  reset(): void;
  getReport(): PerfReport;
}

const MAX_SAMPLES = 60000;

export class PerfProbe {
  private frameTimes: number[] = [];
  private entityCounts: number[] = [];

  public record(frameMs: number, entities: number) {
    if (this.frameTimes.length >= MAX_SAMPLES) return;
    this.frameTimes.push(frameMs);
    this.entityCounts.push(entities);
  }

  public reset() {
    this.frameTimes = [];
    this.entityCounts = [];
  }

  public report(): PerfReport {
    const n = this.frameTimes.length;
    if (n === 0) {
      return {
        frames: 0,
        durationMs: 0,
        avgFps: 0,
        avgFrameMs: 0,
        p95FrameMs: 0,
        p99FrameMs: 0,
        maxFrameMs: 0,
        framesOver20ms: 0,
        entities: { avg: 0, max: 0 },
        usedJSHeapMB: this.heapMB(),
      };
    }
    const sorted = [...this.frameTimes].sort((a, b) => a - b);
    const total = this.frameTimes.reduce((sum, v) => sum + v, 0);
    const percentile = (p: number) =>
      sorted[Math.min(n - 1, Math.floor(p * n))];
    const entitySum = this.entityCounts.reduce((sum, v) => sum + v, 0);

    return {
      frames: n,
      durationMs: Math.round(total),
      avgFps: Number(((n / total) * 1000).toFixed(1)),
      avgFrameMs: Number((total / n).toFixed(2)),
      p95FrameMs: Number(percentile(0.95).toFixed(2)),
      p99FrameMs: Number(percentile(0.99).toFixed(2)),
      maxFrameMs: Number(sorted[n - 1].toFixed(2)),
      framesOver20ms: this.frameTimes.filter((v) => v > 20).length,
      entities: {
        avg: Number((entitySum / n).toFixed(1)),
        max: Math.max(...this.entityCounts),
      },
      usedJSHeapMB: this.heapMB(),
    };
  }

  private heapMB(): number | null {
    const memory = (performance as unknown as { memory?: { usedJSHeapSize: number } })
      .memory;
    return memory ? Number((memory.usedJSHeapSize / 1048576).toFixed(1)) : null;
  }
}
