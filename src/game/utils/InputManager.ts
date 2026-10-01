export class InputManager {
  private keys: { [key: string]: boolean } = {};
  private isMouseDown: boolean = false;

  constructor() {
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("mousedown", this.handleMouseDown);
    window.addEventListener("mouseup", this.handleMouseUp);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    this.keys[e.code] = true;
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
  };

  private handleMouseDown = () => {
    this.isMouseDown = true;
  };

  private handleMouseUp = () => {
    this.isMouseDown = false;
  };

  public getActions() {
    return {
      forward: !!(this.keys["KeyW"] || this.keys["ArrowUp"]),
      left: !!(this.keys["KeyA"] || this.keys["ArrowLeft"]),
      right: !!(this.keys["KeyD"] || this.keys["ArrowRight"]),
      fire: !!(this.keys["Space"] || this.isMouseDown),
    };
  }

  public destroy() {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("mousedown", this.handleMouseDown);
    window.removeEventListener("mouseup", this.handleMouseUp);
  }
}
