/**
 * [UI SOUNDS]
 * Invisible component that adds menu sounds with ONE delegated listener per
 * event type (no per-button wiring):
 *   - first user gesture: unlocks audio and preloads every sound;
 *   - hovering a button: ui_hover;
 *   - clicking a button: ui_click (or ui_back with data-sound="back",
 *     ui_open with data-sound="open", nothing with data-sound="none").
 */
import { useEffect } from "react";
import { soundManager } from "../services/audio/SoundManager";

export function UiSounds() {
  useEffect(() => {
    let started = false;
    let lastHovered: Element | null = null;

    const start = () => {
      if (started) return;
      started = true;
      soundManager.unlock();
      void soundManager.preload();
    };

    const findButton = (target: EventTarget | null): HTMLElement | null => {
      if (!(target instanceof Element)) return null;
      const button = target.closest<HTMLElement>("button, a[href]");
      if (!button || button.hasAttribute("disabled")) return null;
      if (button.dataset.sound === "none") return null;
      return button;
    };

    const onPointerDown = () => start();
    const onKeyDown = () => start();

    const onPointerOver = (event: PointerEvent) => {
      const button = findButton(event.target);
      if (!button || button === lastHovered) return;
      lastHovered = button;
      soundManager.play("ui_hover", { volume: 0.25, throttleMs: 60 });
    };
    const onPointerOut = () => {
      lastHovered = null;
    };

    const onClick = (event: MouseEvent) => {
      const button = findButton(event.target);
      if (!button) return;
      const kind = button.dataset.sound;
      soundManager.play(
        kind === "back" ? "ui_back" : kind === "open" ? "ui_open" : "ui_click",
        { volume: 0.5 },
      );
    };

    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("pointerover", onPointerOver);
    document.addEventListener("pointerout", onPointerOut);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("pointerout", onPointerOut);
      document.removeEventListener("click", onClick);
    };
  }, []);

  return null;
}
