/* eslint-disable react/prop-types */
/**
 * Chat media kit — voice note player: play/pause, a seek bar you can click
 * or drag, and elapsed / total. Only one voice note plays at a time.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Pause, Play } from "lucide-react";
import { formatDuration } from "./mediaTypes";
import { activePlayerController } from "./activePlayer";

export const VOICE_PLAY_ERROR = "Can't play this voice note";

/**
 * @typedef {object} VoicePlayerProps
 * @property {string} [url] The uploaded file.
 * @property {string} [playbackUrl] MP3 rendition from the server; preferred over `url` when present.
 * @property {number} [duration] Length in seconds from the message, used when the file doesn't report one (WebM).
 * @property {"default" | "inverted"} [tone] `inverted` for light-on-dark bubbles (your own messages).
 * @property {boolean} [pending] Shows a spinner instead of the play button (still uploading).
 * @property {string} [className]
 * @property {(message: string) => void} [onError] Called with a user-facing message when playback fails.
 */

const SEEK_STEP_SECONDS = 5;

/**
 * @param {number} value
 * @returns {number}
 */
function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

/** @param {VoicePlayerProps} props */
export function VoicePlayer({
  url,
  playbackUrl,
  duration,
  tone = "default",
  pending = false,
  className = "",
  onError,
}) {
  const src = playbackUrl || url || "";
  /** @type {import("react").MutableRefObject<HTMLAudioElement | null>} */
  const audioRef = useRef(null);
  /** @type {import("react").MutableRefObject<HTMLDivElement | null>} */
  const barRef = useRef(null);
  const playRequestedRef = useRef(false);
  const draggingRef = useRef(false);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  });

  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [mediaDuration, setMediaDuration] = useState(0);
  const [error, setError] = useState(/** @type {string | null} */ (null));

  const total = mediaDuration > 0 ? mediaDuration : typeof duration === "number" && duration > 0 ? duration : 0;

  // A stable handle the controller can pause.
  /** @type {import("./activePlayer").PausablePlayer} */
  const handle = useMemo(() => ({ pause: () => audioRef.current?.pause() }), []);

  // New source: start over.
  useEffect(() => {
    setPlaying(false);
    setCurrent(0);
    setMediaDuration(0);
    setError(null);
    playRequestedRef.current = false;
  }, [src]);

  // A detached <audio> keeps playing, so pause it as it leaves the page.
  const setAudioElement = useCallback((el) => {
    if (!el) audioRef.current?.pause();
    audioRef.current = el;
  }, []);

  // Give up the "active" slot when the player goes away.
  useEffect(() => () => activePlayerController.release(handle), [handle]);

  const fail = useCallback(() => {
    const audio = audioRef.current;
    playRequestedRef.current = false;
    setPlaying(false);
    setCurrent(0);
    if (audio) {
      audio.pause();
      try {
        audio.currentTime = 0;
      } catch {
        // Not seekable yet.
      }
    }
    activePlayerController.release(handle);
    setError(VOICE_PLAY_ERROR);
    onErrorRef.current?.(VOICE_PLAY_ERROR);
  }, [handle]);

  const toggle = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !src || pending) return;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    setError(null);
    playRequestedRef.current = true;
    activePlayerController.activate(handle);
    try {
      await audio.play();
    } catch (err) {
      // play() interrupted by pause() (another player started) isn't a failure.
      if (err && typeof err === "object" && err.name === "AbortError") return;
      fail();
    }
  }, [src, pending, handle, fail]);

  const readMediaDuration = () => {
    const d = audioRef.current?.duration;
    if (typeof d === "number" && Number.isFinite(d) && d > 0) setMediaDuration(d);
  };

  /**
   * @param {number} clientX
   * @returns {number}
   */
  const ratioAt = (clientX) => {
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return 0;
    return clamp01((clientX - rect.left) / rect.width);
  };

  /** @param {number} seconds */
  const seekTo = (seconds) => {
    const audio = audioRef.current;
    if (!audio || total <= 0) return;
    const next = Math.min(total, Math.max(0, seconds));
    setCurrent(next);
    try {
      audio.currentTime = next;
    } catch {
      // Not seekable (metadata not loaded yet).
    }
  };

  /** @param {import("react").PointerEvent<HTMLDivElement>} e */
  const onPointerDown = (e) => {
    if (!src || total <= 0) return;
    draggingRef.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setCurrent(ratioAt(e.clientX) * total);
  };

  /** @param {import("react").PointerEvent<HTMLDivElement>} e */
  const onPointerMove = (e) => {
    if (!draggingRef.current) return;
    setCurrent(ratioAt(e.clientX) * total);
  };

  /** @param {import("react").PointerEvent<HTMLDivElement>} e */
  const onPointerUp = (e) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    seekTo(ratioAt(e.clientX) * total);
  };

  /** @param {import("react").KeyboardEvent<HTMLDivElement>} e */
  const onKeyDown = (e) => {
    if (total <= 0) return;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") seekTo(current + SEEK_STEP_SECONDS);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") seekTo(current - SEEK_STEP_SECONDS);
    else if (e.key === "Home") seekTo(0);
    else if (e.key === "End") seekTo(total);
    else return;
    e.preventDefault();
  };

  const inverted = tone === "inverted";
  const progress = total > 0 ? clamp01(current / total) : 0;
  const disabled = !src || pending;

  return (
    <div className={`flex w-full min-w-[200px] max-w-[280px] flex-col gap-1 ${className}`}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void toggle()}
          disabled={disabled}
          aria-label={playing ? "Pause voice note" : "Play voice note"}
          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
            inverted ? "bg-white/20 text-white hover:bg-white/30" : "bg-gray-900/10 text-gray-900 hover:bg-gray-900/15"
          }`}
        >
          {pending ? (
            <Loader2 size={16} className="animate-spin" aria-hidden />
          ) : playing ? (
            <Pause size={16} fill="currentColor" aria-hidden />
          ) : (
            <Play size={16} fill="currentColor" className="ml-0.5" aria-hidden />
          )}
        </button>

        <div
          ref={barRef}
          role="slider"
          tabIndex={disabled || total <= 0 ? -1 : 0}
          aria-label="Seek voice note"
          aria-valuemin={0}
          aria-valuemax={Math.round(total)}
          aria-valuenow={Math.round(current)}
          aria-valuetext={`${formatDuration(current)} of ${formatDuration(total)}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (draggingRef.current = false)}
          onKeyDown={onKeyDown}
          className={`relative flex h-6 flex-1 touch-none items-center ${disabled || total <= 0 ? "" : "cursor-pointer"}`}
        >
          <div className={`h-1 w-full overflow-hidden rounded-full ${inverted ? "bg-white/30" : "bg-gray-900/15"}`}>
            <div
              className={`h-full rounded-full ${inverted ? "bg-white" : "bg-gray-900/70"}`}
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <div
            className={`absolute h-3 w-3 -translate-x-1/2 rounded-full shadow ${inverted ? "bg-white" : "bg-gray-900/80"}`}
            style={{ left: `${progress * 100}%` }}
            aria-hidden
          />
        </div>

        <span className={`flex-shrink-0 text-xs tabular-nums ${inverted ? "text-white/80" : "text-gray-600"}`}>
          {playing || current > 0 ? `${formatDuration(current)} / ${formatDuration(total)}` : formatDuration(total)}
        </span>
      </div>

      {error && (
        <p role="alert" className={`text-xs ${inverted ? "text-white/90" : "text-red-600"}`}>
          {error}
        </p>
      )}

      {src && (
        <audio
          ref={setAudioElement}
          src={src}
          preload="metadata"
          onLoadedMetadata={readMediaDuration}
          onDurationChange={readMediaDuration}
          onTimeUpdate={() => {
            if (!draggingRef.current && audioRef.current) setCurrent(audioRef.current.currentTime);
          }}
          onPlay={() => {
            setPlaying(true);
            activePlayerController.activate(handle);
          }}
          onPause={() => {
            setPlaying(false);
            activePlayerController.release(handle);
          }}
          onEnded={() => {
            playRequestedRef.current = false;
            setPlaying(false);
            setCurrent(0);
            activePlayerController.release(handle);
          }}
          onError={() => {
            if (playRequestedRef.current) fail();
          }}
        />
      )}
    </div>
  );
}
