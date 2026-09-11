import { useCallback, useEffect, useRef } from "react";
import api from "../api/client.js";
import { authHeader } from "./portalAuth.js";
import { MIC_CONSTRAINTS } from "./audioIsolation.js";

/**
 * Full-session interview recording — video AND the candidate's voice — captured in this browser.
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
 *   - It DOES open its own microphone, and that asymmetry is deliberate — see WHY THE MIC IS OURS.
 *     It is opened only under the same enabled+consented gate as everything else here, and the
 *     consent it runs under says "video and audio" in as many words (PreInterviewCheck's recording
 *     clause), so this is the capture that clause promised, not a widening of it.
 *   - It never starts without `consented` AND `enabled`. Both come from the server; the browser
 *     never opts itself in. The chunk endpoint re-checks consent anyway (defence in depth).
 *   - It never blocks or slows the interview. Every upload is fire-and-forget with no retry, the
 *     same posture as answer-audio upload: a failed chunk means that stretch is missing from the
 *     review copy, never that the candidate is held up or shown an error about it.
 *   - It never holds the interview in memory. `timeslice` means each chunk is handed over and
 *     released as it is produced; nothing accumulates across the session.
 */

/*
 * WHY THE MIC IS OURS AND THE CAMERA IS NOT
 *
 * The stream proctoring holds is video-only — its getUserMedia asks for `{ video }` and nothing
 * else, because the voice hooks manage the microphone separately. Recording that stream and
 * setting `audioBitsPerSecond` produced exactly what you would expect and nobody checked: a silent
 * video of every interview. The consent the candidate had ticked said "video and audio of this
 * session being recorded", so the gap was not a missing nice-to-have, it was the product failing a
 * claim it made to the candidate at the door.
 *
 * The fix cannot be "borrow the interview's mic track", because neither owner will lend one that
 * lives long enough:
 *
 *   - the LiveKit path publishes its mic through the SDK, which is free to replace or restart the
 *     underlying track across a reconnect;
 *   - the Deepgram fallback opens a mic per turn and STOPS its tracks between turns.
 *
 * MediaRecorder binds its tracks once at start() — a track that ends mid-recording is silence for
 * the remainder, and a replacement track added to the MediaStream afterwards is ignored. Borrowing
 * would therefore have recorded the first answer and nothing after it, which is worse than silence
 * because it looks like it worked. So this hook opens one microphone of its own and holds it for
 * the whole session, and the recording's lifetime stops depending on how either voice engine
 * happens to manage its own.
 *
 * A second concurrent capture of the same mic is allowed by every browser we support and does not
 * re-prompt (permission was granted at pre-check). Same constraints as the interview's own mic
 * (MIC_CONSTRAINTS) so the review copy sounds like what the transcript was made from, echo
 * cancellation included — which also means the recording is the CANDIDATE's side, with the
 * interviewer's questions carried by the transcript next to it.
 *
 * If the mic cannot be opened, the recording still runs, video-only. A silent recording is a poor
 * review copy; no recording at all is none.
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

// The mic this recording is made from. Opened here rather than borrowed from the interview — see
// WHY THE MIC IS OURS. Resolves to null on any failure (permission revoked mid-session, device
// yanked, browser refusing a second capture); the caller then records video-only rather than not
// at all.
async function openMicTrack() {
  if (!navigator.mediaDevices?.getUserMedia) return null;
  try {
    const stream = await navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS);
    const track = stream.getAudioTracks()[0] || null;
    if (!track) {
      stream.getTracks().forEach((t) => t.stop());
      return null;
    }
    return track;
  } catch {
    return null;
  }
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
  const pendingUploadsRef = useRef(new Set());
  // The microphone track this hook opened, kept so stop() can release the device. Nothing else may
  // stop it: the interview's own voice engines must never find their mic closed by the recorder.
  const micTrackRef = useRef(null);
  // start() is async now (it awaits the mic), and its callers fire it from effects that can run
  // twice. Without this a second call can slip in while the first is still awaiting getUserMedia
  // and open a second recorder on the same stream.
  const startingRef = useRef(false);
  // stop() has been called, so start() must not go on to open a recorder even if it was already
  // in flight. The awaited getUserMedia opened a window that did not exist when start() was
  // synchronous: an interview that ends (or a tab that closes) while the mic dialog is resolving
  // would otherwise come back and begin recording after the session was over.
  const stopRequestedRef = useRef(false);

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

      const reqPromise = api
        .post("/interview-portal/recording/chunk", form, {
          headers: authHeader(),
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
        })
        .finally(() => {
          pendingUploadsRef.current.delete(reqPromise);
        });
      pendingUploadsRef.current.add(reqPromise);
    },
    []
  );

  const start = useCallback(async () => {
    if (runningRef.current || startingRef.current || stoppedByServerRef.current || stopRequestedRef.current) return;
    if (!enabled || !consented) return;
    if (!window.MediaRecorder) return;
    const stream = getStream?.();
    // No camera, no recording. Never acquire one here — see the header.
    if (!stream || !stream.getVideoTracks?.().length) return;

    const mimeType = pickMimeType();
    if (!mimeType) return;

    startingRef.current = true;
    let micTrack = null;
    try {
      micTrack = await openMicTrack();
    } finally {
      startingRef.current = false;
    }

    // Awaiting the mic gave the rest of the app a turn: the interview may have ended, the candidate
    // may have closed the tab, or stop() may have run. Re-check before committing to a recorder,
    // and hand the device straight back if so.
    if (stopRequestedRef.current || stoppedByServerRef.current || runningRef.current || !enabled || !consented) {
      micTrack?.stop();
      return;
    }
    const videoTrack = getStream?.()?.getVideoTracks?.()[0];
    if (!videoTrack) {
      micTrack?.stop();
      return;
    }

    // A stream of our own composition rather than proctoring's: adding our mic to THEIR stream
    // would mutate an object two other consumers (the vision loop, the LiveKit publish) are holding
    // and would outlive this recording. Ours is a view over the same video track plus our audio.
    const recorded = new MediaStream(micTrack ? [videoTrack, micTrack] : [videoTrack]);

    let recorder;
    try {
      recorder = new MediaRecorder(recorded, {
        mimeType,
        videoBitsPerSecond: VIDEO_BITS_PER_SECOND,
        audioBitsPerSecond: AUDIO_BITS_PER_SECOND,
      });
    } catch {
      micTrack?.stop();
      return; // unsupported combination → this feature simply never runs for this candidate
    }
    micTrackRef.current = micTrack;

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
      // Terminal for capture, not just paused. A restart would begin its sequence at 0 again and
      // every chunk would collide with one the server already holds (409, dropped), so the second
      // recorder would burn the candidate's CPU and uplink producing nothing. Closing the door also
      // means the microphone this hook opened is released here rather than held, unused, for the
      // rest of the interview.
      stopRequestedRef.current = true;
      try {
        micTrackRef.current?.stop();
      } catch {
        /* device already gone */
      }
      micTrackRef.current = null;
    };

    try {
      recorder.start(TIMESLICE_MS);
    } catch {
      // Never became a running recorder, so the unmount cleanup (which only fires on
      // `runningRef`) will not release the microphone — do it here or it stays open for the rest
      // of the interview with nothing reading it.
      micTrack?.stop();
      micTrackRef.current = null;
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
    async ({ beacon = false } = {}) => {
      const recorder = recorderRef.current;
      stopRequestedRef.current = true;
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
      // Release our microphone — and ONLY ours. The video track belongs to proctoring, which is
      // still using it and stops it on its own teardown. Left open, this track holds the mic (and
      // the browser's recording indicator) for as long as the tab lives.
      try {
        micTrackRef.current?.stop();
      } catch {
        /* device already gone */
      }
      micTrackRef.current = null;
      if (finalizedRef.current || stoppedByServerRef.current || !startedAtRef.current) return;
      finalizedRef.current = true;

      const durationMs = Date.now() - startedAtRef.current;
      if (beacon) {
        // Authenticated fetch with keepalive: true so the request carries the JWT and outlives document unload
        try {
          const auth = authHeader();
          const baseURL = api.defaults.baseURL || "http://localhost:9000/api";
          if (auth.Authorization) {
            fetch(`${baseURL}/interview-portal/recording/finalize`, {
              method: "POST",
              headers: { ...auth, "Content-Type": "application/json" },
              body: JSON.stringify({ durationMs }),
              keepalive: true,
            }).catch(() => {});
          }
        } catch {
          /* best effort */
        }
        return;
      }

      // Wait for any in-flight chunk uploads (including the requestData flush) before sending finalize
      try {
        if (pendingUploadsRef.current.size > 0) {
          await Promise.allSettled(Array.from(pendingUploadsRef.current));
        }
      } catch {
        /* best effort */
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
