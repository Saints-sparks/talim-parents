/**
 * Chat media kit — records a voice note with MediaRecorder in the best
 * format the browser has (AAC where possible). The microphone is released
 * on stop, cancel, error and unmount.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { MAX_VOICE_SECONDS, MIN_VOICE_SECONDS, extensionForMime, pickRecorderMime } from "./mediaTypes";

export const VOICE_UNSUPPORTED_ERROR = "Voice notes aren't supported in this browser";
export const VOICE_PERMISSION_ERROR = "Allow microphone access to record voice notes";
export const VOICE_TOO_SHORT_ERROR = "Hold longer to record";
export const VOICE_FAILED_ERROR = "Couldn't record a voice note. Try again.";
export const VOICE_NO_MIC_ERROR = "No microphone found";

/**
 * @typedef {object} VoiceRecording
 * @property {File} file
 * @property {number} duration Whole seconds, at least 1.
 */

/**
 * @typedef {object} UseVoiceRecorderOptions
 * @property {number} [maxDurationSeconds] Auto-stop after this many seconds (default 5 minutes).
 * @property {(recording: VoiceRecording | null) => void} [onAutoStop] Called with the recording when the time limit stops it.
 */

/**
 * @typedef {object} UseVoiceRecorderReturn
 * @property {() => Promise<boolean>} start Asks for the microphone and starts. Resolves false when it couldn't start (see `error`).
 * @property {() => Promise<VoiceRecording | null>} stop Stops and returns the note, or null when it was shorter than a second.
 * @property {() => void} cancel Stops and throws the recording away.
 * @property {boolean} isRecording
 * @property {number} elapsed Whole seconds recorded so far.
 * @property {string | null} error
 * @property {() => void} clearError
 */

/**
 * @typedef {object} Session
 * @property {MediaStream} stream
 * @property {MediaRecorder} recorder
 * @property {Blob[]} chunks
 * @property {string} mime
 * @property {number} startedAt
 * @property {boolean} discard
 * @property {(recording: VoiceRecording | null) => void} [resolveStop]
 * @property {Promise<VoiceRecording | null>} [stopped]
 */

/** @param {MediaStream | null | undefined} stream */
function stopTracks(stream) {
  stream?.getTracks().forEach((track) => {
    try {
      track.stop();
    } catch {
      // Already stopped.
    }
  });
}

/** @returns {boolean} */
function isSupported() {
  return (
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof window !== "undefined" &&
    typeof window.MediaRecorder !== "undefined"
  );
}

/**
 * @param {UseVoiceRecorderOptions} [options]
 * @returns {UseVoiceRecorderReturn}
 */
export function useVoiceRecorder(options = {}) {
  const maxSeconds = options.maxDurationSeconds ?? MAX_VOICE_SECONDS;
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState(/** @type {string | null} */ (null));

  /** @type {import("react").MutableRefObject<Session | null>} */
  const sessionRef = useRef(null);
  /** Bumped by cancel/unmount so a start still waiting for the mic gives up. */
  const generationRef = useRef(0);
  /** @type {import("react").MutableRefObject<ReturnType<typeof setInterval> | null>} */
  const tickRef = useRef(null);
  const mountedRef = useRef(true);
  const onAutoStopRef = useRef(options.onAutoStop);
  useEffect(() => {
    onAutoStopRef.current = options.onAutoStop;
  });

  const clearTick = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
  };

  const finish = useCallback((/** @type {Session} */ session) => {
    clearTick();
    stopTracks(session.stream);
    if (sessionRef.current === session) sessionRef.current = null;
    if (mountedRef.current) {
      setIsRecording(false);
      setElapsed(0);
    }
  }, []);

  /** @type {() => Promise<VoiceRecording | null>} */
  const stop = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return Promise.resolve(null);
    if (session.stopped) return session.stopped;
    session.stopped = new Promise((resolve) => {
      session.resolveStop = resolve;
    });
    if (session.recorder.state === "inactive") {
      // Already stopped by the browser; onstop has run or will not run again.
      finish(session);
      session.resolveStop?.(null);
    } else {
      try {
        session.recorder.stop();
      } catch {
        finish(session);
        session.resolveStop?.(null);
      }
    }
    return session.stopped;
  }, [finish]);

  const cancel = useCallback(() => {
    generationRef.current++;
    const session = sessionRef.current;
    if (!session) return;
    session.discard = true;
    if (session.recorder.state !== "inactive") {
      try {
        session.recorder.stop();
      } catch {
        // Ignore: tracks are stopped below.
      }
    }
    finish(session);
    session.resolveStop?.(null);
  }, [finish]);

  /** @type {() => Promise<boolean>} */
  const start = useCallback(async () => {
    if (sessionRef.current) return true;
    setError(null);
    if (!isSupported()) {
      setError(VOICE_UNSUPPORTED_ERROR);
      return false;
    }

    const generation = ++generationRef.current;
    /** @type {MediaStream} */
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const name = err && typeof err === "object" ? err.name : "";
      if (mountedRef.current) {
        setError(
          name === "NotAllowedError" || name === "SecurityError" || name === "PermissionDeniedError"
            ? VOICE_PERMISSION_ERROR
            : name === "NotFoundError" || name === "DevicesNotFoundError"
              ? VOICE_NO_MIC_ERROR
              : VOICE_FAILED_ERROR
        );
      }
      return false;
    }
    // Cancelled or unmounted while the permission prompt was open.
    if (generation !== generationRef.current || !mountedRef.current || sessionRef.current) {
      stopTracks(stream);
      return false;
    }

    const preferred = pickRecorderMime();
    /** @type {MediaRecorder} */
    let recorder;
    try {
      recorder = preferred ? new MediaRecorder(stream, { mimeType: preferred }) : new MediaRecorder(stream);
    } catch {
      try {
        recorder = new MediaRecorder(stream);
      } catch {
        stopTracks(stream);
        setError(VOICE_UNSUPPORTED_ERROR);
        return false;
      }
    }

    /** @type {Session} */
    const session = {
      stream,
      recorder,
      chunks: [],
      mime: preferred,
      startedAt: Date.now(),
      discard: false,
    };

    recorder.ondataavailable = (/** @type {BlobEvent} */ e) => {
      if (e.data && e.data.size > 0) session.chunks.push(e.data);
    };

    recorder.onerror = () => {
      session.discard = true;
      finish(session);
      if (mountedRef.current) setError(VOICE_FAILED_ERROR);
      session.resolveStop?.(null);
    };

    recorder.onstop = () => {
      const ms = Date.now() - session.startedAt;
      finish(session);
      if (session.discard) {
        session.resolveStop?.(null);
        return;
      }
      if (ms < MIN_VOICE_SECONDS * 1000 || session.chunks.length === 0) {
        if (mountedRef.current) setError(VOICE_TOO_SHORT_ERROR);
        session.resolveStop?.(null);
        return;
      }
      const rawType = recorder.mimeType || session.chunks[0]?.type || session.mime || "audio/webm";
      const type = rawType.split(";")[0].trim() || "audio/webm";
      const blob = new Blob(session.chunks, { type });
      const file = new File([blob], `voice-note-${Date.now()}.${extensionForMime(type)}`, { type });
      const duration = Math.min(maxSeconds, Math.max(MIN_VOICE_SECONDS, Math.round(ms / 1000)));
      session.resolveStop?.({ file, duration });
    };

    try {
      recorder.start();
    } catch {
      stopTracks(stream);
      setError(VOICE_FAILED_ERROR);
      return false;
    }

    sessionRef.current = session;
    setElapsed(0);
    setIsRecording(true);
    clearTick();
    tickRef.current = setInterval(() => {
      if (sessionRef.current !== session) return;
      const seconds = Math.floor((Date.now() - session.startedAt) / 1000);
      setElapsed(seconds);
      if (seconds >= maxSeconds) {
        clearTick();
        void stop().then((recording) => onAutoStopRef.current?.(recording));
      }
    }, 250);
    return true;
  }, [finish, maxSeconds, stop]);

  const clearError = useCallback(() => setError(null), []);

  // Leaving (unmount) throws the recording away and releases the microphone.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cancel();
    };
  }, [cancel]);

  return { start, stop, cancel, isRecording, elapsed, error, clearError };
}
