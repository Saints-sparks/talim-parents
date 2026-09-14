/**
 * Chat media kit — one voice note plays at a time.
 *
 * Every `VoicePlayer` registers here when it starts; the one that was
 * playing before is paused.
 */

/**
 * @typedef {object} PausablePlayer
 * @property {() => void} pause
 */

/**
 * @typedef {object} ActivePlayerController
 * @property {(player: PausablePlayer) => void} activate `player` starts playing: pauses whichever other player was active.
 * @property {(player: PausablePlayer) => void} release `player` stopped (paused, ended, unmounted).
 * @property {() => PausablePlayer | null} current The player playing now, if any.
 */

/** @returns {ActivePlayerController} */
export function createActivePlayerController() {
  /** @type {PausablePlayer | null} */
  let active = null;
  return {
    activate(player) {
      if (active && active !== player) {
        const previous = active;
        active = player;
        try {
          previous.pause();
        } catch {
          // A player that fails to pause must not stop the new one.
        }
        return;
      }
      active = player;
    },
    release(player) {
      if (active === player) active = null;
    },
    current() {
      return active;
    },
  };
}

/** The page-wide controller every `VoicePlayer` uses. */
export const activePlayerController = createActivePlayerController();
