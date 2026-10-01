class SoundManager {
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private bgm: HTMLAudioElement | null = null;
  private isMuted: boolean = false;

  constructor() {
    this.preloadSound("shoot", "/assets/sounds/cannon_shoot.mp3");
    this.preloadSound("explosion", "/assets/sounds/explosion.mp3");
    this.preloadSound("hit", "/assets/sounds/ship_hit.mp3");
  }

  private preloadSound(key: string, src: string) {
    const audio = new Audio(src);
    audio.preload = "auto";
    this.sounds.set(key, audio);
  }

  public playBGM(src: string = "/assets/sounds/battle_theme.mp3") {
    if (this.bgm) {
      this.bgm.pause();
    }
    this.bgm = new Audio(src);
    this.bgm.loop = true;
    this.bgm.volume = 0.4;
    if (!this.isMuted) {
      this.bgm.play().catch(() => {
        // Trata a política de autoplay dos navegadores
      });
    }
  }

  public stopBGM() {
    if (this.bgm) {
      this.bgm.pause();
      this.bgm.currentTime = 0;
    }
  }

  public playSFX(key: string) {
    if (this.isMuted) return;
    const sound = this.sounds.get(key);
    if (sound) {
      const clone = sound.cloneNode() as HTMLAudioElement;
      clone.volume = 0.7;
      clone.play().catch(() => {});
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.bgm) {
      if (this.isMuted) {
        this.bgm.pause();
      } else {
        this.bgm.play().catch(() => {});
      }
    }
    return this.isMuted;
  }
}

export const soundManager = new SoundManager();
