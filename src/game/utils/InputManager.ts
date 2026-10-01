export class InputManager {
  private keys: Record<string, boolean> = {};

  constructor() {
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    this.keys[e.code] = true;
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
  };

  public getActions() {
    return {
      forward: this.keys["KeyW"] || this.keys["ArrowUp"] || false,
      backward: this.keys["KeyS"] || this.keys["ArrowDown"] || false,
      left: this.keys["KeyA"] || this.keys["ArrowLeft"] || false,
      right: this.keys["KeyD"] || this.keys["ArrowRight"] || false,
      fireFrontal: this.keys["Space"] || false,
      fireBroadsideLeft: this.keys["KeyQ"] || false,
      fireBroadsideRight: this.keys["KeyE"] || false,
    };
  }

  public destroy() {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
  }
}
