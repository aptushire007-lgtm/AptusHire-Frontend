import { useCallback, useEffect, useRef } from "react";
import api from "../api/client.js";
import { authHeader } from "./portalAuth.js";

/**
 * Full-session interview recording, captured in this browser.
 *
 * Replaces LiveKit Egress (docs/INTERVIEW-RECORDING-MEDIARECORDER-PLAN.md). Egress recorded
 * server-side and could only be completed by LiveKit Cloud calling a webhook we do not control,
 * so recordings sat at "recording" forever while being billed as output-minutes on top of the
 * room-minutes already paid for. Here the browser records, uploads a timeslice at a time, and the
 * server closes the row out itself.
 *
 * WHY THIS IS ITS OWN HOOK RATHER THAN A THIRD LANE INSIDE useProctoring
 *
 * The plan says "extend useProctoring, don't duplicate it", and this does not duplicate it — it
 * consumes `getStream()`, the getter useProctoring already exposes for exactly this purpose (its
 * own comment names the LiveKit video publish as "the one other consumer allowed to touch it";
 * this is the second). What it deliberately does not share is the LIFECYCLE. Proctoring starts at
 * setup and runs while the room is open; recording must start only once the interview is actually
 * underway and must stop and FLUSH at a precise moment. Folding a differently-lived recorder into
 * that hook's start/stop would have meant either recording the pre-check or leaking the final
 * chunk, and the evidence lanes' `shared` budget object has nothing to say about this one.
 *
 * WHAT THIS HOOK REFUSES TO DO
 *
 *   - It never opens a camera. It records the stream proctoring already holds, or it does not run.
 *     A second getUserMedia video request fails outright on some browsers/OSes, and more to the
 *     point: if the candidate did not grant a camera for monitoring, they have not granted one to
 *     be filmed.
 *   - It never starts without `consented` AND `enabled`. Both come from the server; the browser
 *     never opts itself in. The chunk endpoint re-checks consent anyway (defence in depth).
 *   - It never blocks or slows the interview. Every upload is fire-and-forget with no retry, the
 *     same posture as answer-audio upload: a failed chunk means that stretch is missing from the
 *     review copy, never that the candidate is held up or shown an error about it.
 *   - It never holds the interview in memory. `timeslice` means each chunk is handed over and
 *     released as it is produced; nothing accumulates across the session.
 */

// One chunk every 45 seconds. Long enough that a 40-minute interview is ~53 requests rather than
// hundreds; short enough that the worst case of a browser crash — the unflushed chunk — is under a
// minute of the interview rather than the whole thing.
const TIMESLICE_MS = 45_000;

// ~200 kbps video. Evidence clips use 400 kbps because they are seconds long and a reviewer is
// looking for a second face at the edge of frame. This is a whole session and the bar is
// "reviewable": a talking head, legible, next to the transcript. At this rate 40 minutes is ~60MB.
const VIDEO_BITS_PER_SECOND = 200_000;
const AUDIO_BITS_PER_SECOND = 32_000;

// Matches MAX_CHUNKS_PER_SESSION in services/interviewRecordingService.js. The server is the
// enforcer; this exists so a runaway client stops producing rather than spending the candidate's
// CPU and uplink on requests it already knows will be refused.
const MAX_CHUNKS = 240;

function pickMimeType() {
  const candidates = [
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=vp9,opus",
    "video/webm",
    "video/mp4", // Safari; ingested but not concatenable — the row lands "partial", see the service
  ];
  for (const type of candidates) {
    if (window.MediaRecorder?.isTypeSupported?.(type)) return type;
  }
  return null;
}

export function useSessionRecorder({ getStream, enabled, consented }) {
  const recorderRef = useRef(null);
  const seqRef = useRef(0);
  const startedAtRef = useRef(null);
  const lastChunkAtRef = useRef(0);
  const finalizedRef = useRef(false);
  const runningRef = useRef(false);
  // The circuit breaker. A server that said no — recording disabled, consent missing, cap reached
  // — means capture itself must stop, not just uploads: encoding video nobody will accept spends
  // exactly the CPU and battery the interview needs. Same reasoning as `shared.exhausted` in the
  // evidence pipeline.
  const stoppedByServerRef = useRef(false);

  const uploadChunk = useCallback(
    (blob, seq, durationMs) => {
      const form = new FormData();
      form.append("chunk", blob, seq === 0 ? "chunk0.webm" : `chunk${seq}.webm`);
      form.append("seq", String(seq));
      form.append("durationMs", String(Math.round(durationMs)));
      // Only honoured for the first chunk, and clamped server-side against the session's own
      // start time. This is the capture clock the admin report needs to line a transcript turn up
      // with a moment in the video — without it the player can only guess from when the INTERVIEW
      // began, which is wrong by however long the camera and the recorder took to come up.
      if (seq === 0 && startedAtRef.current) form.append("startedAt", new Date(startedAtRef.current).toISOString());

      api
        .post("/interview-portal/recording/chunk", form, {
          headers: { ...authHeader(), "Content-Type": "multipart/form-data" },
        })
        .catch((err) => {
          const status = err?.response?.status;
          // 409 is a duplicate sequence — harmless and expected if a request was retried by the
          // browser after it had actually succeeded. Everything else in this class means the
          // server will not take chunks from us at all.
          if (status && status !== 409 && [400, 403, 404, 413, 429].includes(status)) {
            stoppedByServerRef.current = true;
          }
          // Otherwise: swallowed on purpose. A transient network failure costs this timeslice and
          // nothing else — the next one is 45 seconds away and the interview never sees it.
        });
    },
    []
  );

  const start = useCallback(() => {
    if (runningRef.current || stoppedByServerRef.current) return;
    if (!enabled || !consented) return;
    if (!window.MediaRecorder) return;
    const stream = getStream?.();
    // No camera, no recording. Never acquire one here — see the header.
    if (!stream || !stream.getVideoTracks?.().length) return;

    const mimeType = pickMimeType();
    if (!mimeType) return;

    let recorder;
    try {
      recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: VIDEO_BITS_PER_SECOND,
        audioBitsPerSecond: AUDIO_BITS_PER_SECOND,
      });
    } catch {
      return; // unsupported combination → this feature simply never runs for this candidate
    }

    startedAtRef.current = Date.now();
    lastChunkAtRef.current = startedAtRef.current;
    seqRef.current = 0;
    finalizedRef.current = false;

    recorder.ondataavailable = (e) => {
      if (!e.data || e.data.size === 0) return;
      if (stoppedByServerRef.current || seqRef.current >= MAX_CHUNKS) return;
      const now = Date.now();
      const durationMs = now - lastChunkAtRef.current;
      lastChunkAtRef.current = now;
      uploadChunk(e.data, seqRef.current, durationMs);
      seqRef.current += 1;
    };
    recorder.onerror = () => {
      // The recorder died (track ended, encoder fault). Stop cleanly rather than leave an object
      // that will never emit again — the chunks already uploaded still assemble into a partial
      // recording, and the transcript is the record regardless.
      runningRef.current = false;
    };

    try {
      recorder.start(TIMESLICE_MS);
    } catch {
      return;
    }
    recorderRef.current = recorder;
    runningRef.current = true;
  }, [enabled, consented, getStream, uploadChunk]);

  // Stop capture and close the recording out. `beacon` is for page teardown, where an axios
  // request will not survive: sendBeacon is queued by the browser and outlives the document.
  //
  // Idempotent on both sides — `finalizedRef` here, and the server's completed-check — because
  // three callers can race: the interview completing, the tab closing, and a candidate reloading.
  const stop = useCallback(
    ({ beacon = false } = {}) => {
      const recorder = recorderRef.current;
      runningRef.current = false;
      if (recorder && recorder.state !== "inactive") {
        try {
          // requestData BEFORE stop: it flushes the partial timeslice as its own ondataavailable,
          // so the final stretch of the interview is uploaded instead of discarded. This is the
          // difference between losing the last 45 seconds of every recording and losing none.
          recorder.requestData();
          recorder.stop();
        } catch {
          /* already stopped — nothing to flush */
        }
      }
      recorderRef.current = null;
      if (finalizedRef.current || stoppedByServerRef.current || !startedAtRef.current) return;
      finalizedRef.current = true;

      const durationMs = Date.now() - startedAtRef.current;
      if (beacon) {
        // No auth header is possible on a beacon, so this is best-effort and expected to fail on
        // a token-guarded route. It is kept because when the tab simply closes there is nothing
        // else to try, and the server's own state (chunks present, no finalize) is already the
        // honest one: "recording", which now means what it says rather than a permanently stuck row.
        try {
          navigator.sendBeacon?.("/api/interview-portal/recording/finalize");
        } catch {
          /* best effort */
        }
        return;
      }
      api
        .post("/interview-portal/recording/finalize", { durationMs }, { headers: authHeader() })
        .catch(() => {
          /* The chunks are uploaded and intact; an unfinalized row is retryable, not lost. */
        });
    },
    []
  );

  // Page teardown: flush what we have. `pagehide` fires on mobile every time the page is
  // backgrounded (an incoming call, the lock screen), so a plain flush here would end the
  // recording of a candidate who is about to come straight back — the same trap
  // useLiveKitInterview.js documents for its metering beacon. `persisted` means the page is going
  // into the back/forward cache and may return, so it is left alone.
  useEffect(() => {
    if (!enabled || !consented) return undefined;
    const onPageHide = (e) => {
      if (e.persisted) return;
      stop({ beacon: true });
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, [enabled, consented, stop]);

  // Unmount: the camera is going away with the component, so capture ends here whether or not the
  // interview reached its end cleanly.
  useEffect(() => {
    return () => {
      if (runningRef.current) stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { start, stop, recording: runningRef };
}
