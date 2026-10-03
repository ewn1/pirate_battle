/**
 * [INPUT MANAGER]
 * Merges keyboard and on-screen (touch) controls into a single action state.
 *
 * - Keys are only captured (and `preventDefault`-ed) while `enabled` is true,
 *   i.e. while the gameplay context is active and not paused.
 * - Held state is cleared on disable / window blur so nothing "sticks" or
 *   accumulates while the game is paused.
 */
export type GameAction =
  | "forward"
  | "backward"
  | "left"
  | "right"
  | "fireFront"
  | "fireLeft"
  | "fireRight";

export type ActionState = Record<GameAction, boolean>;

/** KeyboardEvent.code -> action. */
const KEY_MAP: Record<string, GameAction> = {
  KeyW: "forward",
  ArrowUp: "forward",
  KeyS: "backward",
  ArrowDown: "backward",
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
  Space: "fireFront",
  KeyQ: "fireLeft",
  KeyE: "fireRight",
};

const ALL_ACTIONS: GameAction[] = [
  "forward",
  "backward",
  "left",
  "right",
  "fireFront",
  "fireLeft",
  "fireRight",
];

export class InputManager {
  private heldKeys = new Set<string>();
  private virtualHeld = new Set<GameAction>();
  private enabled = false;

  constructor() {
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("blur", this.reset);
  }

  /** Enables/disables capture. Disabling also clears every held input. */
  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) this.reset();
  }

  /** Called by the touch controls (pointer down/up). */
  public setVirtual(action: GameAction, pressed: boolean) {
    if (!this.enabled) {
      this.virtualHeld.delete(action);
      return;
    }
    if (pressed) this.virtualHeld.add(action);
    else this.virtualHeld.delete(action);
  }

  public getActions(): ActionState {
    const state = {} as ActionState;
    for (const action of ALL_ACTIONS) state[action] = false;
    for (const code of this.heldKeys) {
      const action = KEY_MAP[code];
      if (action) state[action] = true;
    }
    for (const action of this.virtualHeld) state[action] = true;
    return state;
  }

  /** Clears every held key/button. */
  public reset = () => {
    this.heldKeys.clear();
    this.virtualHeld.clear();
  };

  public destroy() {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("blur", this.reset);
    this.reset();
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    if (!this.enabled) return;
    if (!(event.code in KEY_MAP)) return;
    // Prevent page scroll / focused-button activation with Space and arrows.
    event.preventDefault();
    this.heldKeys.add(event.code);
  };

  private handleKeyUp = (event: KeyboardEvent) => {
    // Space on a focused button activates it on keyup: block it during play.
    if (this.enabled && event.code in KEY_MAP) event.preventDefault();
    // Always release, even when disabled, to avoid stuck keys.
    this.heldKeys.delete(event.code);
  };
}
