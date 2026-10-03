/**
 * [SOUND TOGGLE]
 * Mute / unmute button (persisted by the SoundManager).
 */
import { useState } from "react";
import { soundManager } from "../services/audio/SoundManager";
import { Button } from "./ui/Button";

export function SoundToggle() {
  const [muted, setMuted] = useState(() => soundManager.isMuted());

  return (
    <Button
      type="button"
      $variant="secondary"
      aria-pressed={muted}
      onClick={() => setMuted(soundManager.toggleMute())}
      data-testid="sound-toggle"
    >
      {muted ? "Sound: off" : "Sound: on"}
    </Button>
  );
}
