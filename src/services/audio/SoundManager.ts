/**
 * [SOUND MANAGER]
 * WebAudio based playback of the WAV files in /assets/sounds.
 *
 * - Every sound name below is the exact file name (without `.wav`).
 * - Buffers are decoded once and reused; each play() creates a cheap source
 *   node, so overlapping shots never cut each other off.
 * - Loops (ocean ambience, ship sailing) fade in/out.
 * - Audio is never critical: any failure is swallowed so it can never block
 *   the menu or the match.
 * - Browsers only allow audio after a user gesture: call `unlock()` from the
 *   first pointer/keyboard event (done in main.tsx).
 */

export const SOUND_NAMES = [
  "cannon_broadside",
  "cannon_fire_1",
  "cannon_fire_2",
  "cannon_fire_3",
  "cannonball_water_hit_1",
  "cannonball_water_hit_2",
  "game_complete",
  "game_over",
  "game_pause",
  "game_resume",
  "game_start",
  "health_low",
  "ocean_ambience_loop",
  "score_point",
  "ship_collision",
  "ship_explosion_1",
  "ship_explosion_2",
  "ship_sailing_loop",
  "ship_sinking",
  "ship_wood_hit_1",
  "ship_wood_hit_2",
  "time_warning",
  "ui_back",
  "ui_click",
  "ui_close",
  "ui_hover",
  "ui_open",
] as const;

export type SoundName = (typeof SOUND_NAMES)[number];

const SOUND_BASE_URL = "/assets/sounds";
const MUTE_STORAGE_KEY = "pirate-battle:muted";

interface PlayOptions {
  volume?: number;
  /** Playback rate (pitch). */
  rate?: number;
  /** Ignore the call if the same sound played less than this many ms ago. */
  throttleMs?: number;
}

interface ActiveLoop {
  source: AudioBufferSourceNode;
  gain: GainNode;
}

type AudioContextCtor = typeof AudioContext;

class SoundManager {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private buffers = new Map<SoundName, AudioBuffer>();
  private loops = new Map<SoundName, ActiveLoop>();
  private lastPlayed = new Map<SoundName, number>();
  private preloadPromise: Promise<number> | null = null;
  private muted = this.readMuted();

  /* ------------------------------------------------------------------ */
  /* [SETUP]                                                             */
  /* ------------------------------------------------------------------ */

  /** Creates (if needed) and resumes the AudioContext. Safe to call often. */
  public unlock(): void {
    const context = this.ensureContext();
    if (context && context.state === "suspended") {
      context.resume().catch(() => undefined);
    }
  }

  /**
   * Fetches and decodes every sound. Never rejects: resolves with the number
   * of sounds that were loaded so the caller can decide what to do.
   */
  public preload(onProgress?: (ratio: number) => void): Promise<number> {
    if (this.preloadPromise) return this.preloadPromise;

    this.preloadPromise = (async () => {
      const context = this.ensureContext();
      if (!context) return 0;

      let done = 0;
      await Promise.all(
        SOUND_NAMES.map(async (name) => {
          try {
            const response = await fetch(`${SOUND_BASE_URL}/${name}.wav`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.arrayBuffer();
            this.buffers.set(name, await context.decodeAudioData(data));
          } catch (error) {
            console.warn(`[audio] could not load "${name}"`, error);
          } finally {
            done++;
            onProgress?.(done / SOUND_NAMES.length);
          }
        }),
      );
      return this.buffers.size;
    })();

    return this.preloadPromise;
  }

  /* ------------------------------------------------------------------ */
  /* [ONE-SHOT SOUNDS]                                                   */
  /* ------------------------------------------------------------------ */

  public play(name: SoundName, options: PlayOptions = {}): void {
    const context = this.context;
    const master = this.master;
    const buffer = this.buffers.get(name);
    if (!context || !master || !buffer || this.muted) return;

    const now = performance.now();
    const last = this.lastPlayed.get(name) ?? -Infinity;
    if (options.throttleMs && now - last < options.throttleMs) return;
    this.lastPlayed.set(name, now);

    try {
      const source = context.createBufferSource();
      source.buffer = buffer;
      if (options.rate) source.playbackRate.value = options.rate;

      const gain = context.createGain();
      gain.gain.value = options.volume ?? 0.7;

      source.connect(gain).connect(master);
      source.start();
    } catch {
      /* audio is optional */
    }
  }

  /** Plays one randomly chosen sound of the list (sound variations). */
  public playRandom(names: readonly SoundName[], options: PlayOptions = {}): void {
    this.play(names[Math.floor(Math.random() * names.length)], options);
  }

  /* ------------------------------------------------------------------ */
  /* [LOOPS]                                                             */
  /* ------------------------------------------------------------------ */

  /** Starts a looping sound (or just updates its volume if already running). */
  public startLoop(name: SoundName, volume = 0.4): void {
    const existing = this.loops.get(name);
    if (existing) {
      this.setLoopVolume(name, volume);
      return;
    }

    const context = this.context;
    const master = this.master;
    const buffer = this.buffers.get(name);
    if (!context || !master || !buffer) return;

    try {
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const gain = context.createGain();
      gain.gain.value = 0;
      gain.gain.setTargetAtTime(volume, context.currentTime, 0.2);

      source.connect(gain).connect(master);
      source.start();
      this.loops.set(name, { source, gain });
    } catch {
      /* audio is optional */
    }
  }

  public setLoopVolume(name: SoundName, volume: number): void {
    const loop = this.loops.get(name);
    if (!loop || !this.context) return;
    loop.gain.gain.setTargetAtTime(volume, this.context.currentTime, 0.15);
  }

  public stopLoop(name: SoundName): void {
    const loop = this.loops.get(name);
    const context = this.context;
    if (!loop || !context) return;
    this.loops.delete(name);
    try {
      loop.gain.gain.setTargetAtTime(0, context.currentTime, 0.08);
      loop.source.stop(context.currentTime + 0.4);
    } catch {
      /* already stopped */
    }
  }

  public stopAllLoops(): void {
    for (const name of [...this.loops.keys()]) this.stopLoop(name);
  }

  /* ------------------------------------------------------------------ */
  /* [MUTE]                                                              */
  /* ------------------------------------------------------------------ */

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    try {
      localStorage.setItem(MUTE_STORAGE_KEY, muted ? "1" : "0");
    } catch {
      /* storage unavailable */
    }
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(muted ? 0 : 1, this.context.currentTime, 0.05);
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  /* ------------------------------------------------------------------ */
  /* [INTERNALS]                                                         */
  /* ------------------------------------------------------------------ */

  private ensureContext(): AudioContext | null {
    if (this.context) return this.context;
    try {
      const Ctor: AudioContextCtor | undefined =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
      if (!Ctor) return null;
      this.context = new Ctor();
      this.master = this.context.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      this.master.connect(this.context.destination);
      return this.context;
    } catch {
      return null;
    }
  }

  private readMuted(): boolean {
    try {
      return localStorage.getItem(MUTE_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  }
}

export const soundManager = new SoundManager();
