import { useCallback, useEffect, useRef, useState } from "react";
import { ConnectionQuality, Room, RoomEvent, Track } from "livekit-client";
import api from "../api/client.js";
import { authHeader } from "./portalAuth.js";

// LiveKit realtime interview client (LIVEKIT-REALTIME-PLAN.md LK-4).
//
// Compare this file to useVoiceInterview.js: the turn-based client owns turn-taking, audio
// plumbing, and intent phrases; this one owns none of it. The worker (agent-worker/) holds the
// keys, captures the evidence, and feeds the guardrail server-side — what is left here is a
// WebRTC join, a speaker, live captions, and two endpoints. (A middle step, the Deepgram-agent
// client that relayed audio and transcripts through the browser, was retired in favour of this.)
//
// WHAT THIS FILE MUST NOT DO: decide anything about the interview, or hold anything sensitive.
// The session endpoint returns a join-only room token — no model keys, no Settings block, no
// prompt — and everything that advances the interview happens between the worker and the engine.
//
// Surface: { available, phase, activity, youSpeaking, error, haltMessage, halted, captions, caption,
// personaName, connect, disconnect, checkAvailable }.

// The agent's own turn-taking state, published by livekit-agents' AgentSession as a participant
// attribute on every transition (see agent-worker/agent.py's build_session — this comes free with
// AgentSession, the worker sets nothing). It is the ONLY place the browser can learn whether the
// interviewer is listening, composing a reply, or talking: `phase` above tracks the SOCKET, and a
// socket is "live" for the whole interview. Without this the room could only ever say "connected",
// which is why a candidate sat watching a static tile through every pause.
//
// Values are livekit-agents' own AgentState literals: initializing | idle | listening | thinking |
// speaking. Treated as opaque strings and passed through — an unknown future value falls back to
// the generic "in conversation" copy rather than blanking the indicator.
const AGENT_STATE_ATTR = "lk.agent.state";

// If the interviewer has not joined this long after WE joined, something is wrong on our side
// (worker down, dispatch failed). Tear down and mark the pipeline unavailable — the room's mode
// flags then fall back to the next pipeline automatically. A candidate never sits in an empty
// room listening to silence.
const AGENT_JOIN_TIMEOUT_MS = 10_000;

// How long the candidate is offered a way back after a drop before the interview is treated as
// over. Kept slightly under the worker's AGENT_REJOIN_GRACE_SECONDS (90s) so the offer expires
// before the room actually disappears — an accepted "rejoin" that lands on a deleted room is a
// worse experience than the offer quietly lapsing.
const REJOIN_WINDOW_MS = 80_000;

// Weak, low-weight proctoring proxy (see backend/utils/proctoring.js): sustained poor connection
// quality with no intervening reconnect can correlate with concurrent heavy upstream usage (e.g.
// screen-sharing to someone else eating the same uplink) — but home wifi/ISP variance explains most
// of it, so this fires at most once per room and only after a long, uninterrupted "poor" streak.
const BANDWIDTH_ANOMALY_MS = 20_000;

export function useLiveKitInterview({ onEnded, getVideoStream } = {}) {
  const [available, setAvailable] = useState(null);
  // idle → connecting → waiting_agent → live → ended | failed | dropped
  // `dropped` is recoverable: the worker holds the room open for a grace period, so the candidate
  // can rejoin the interview they were part-way through instead of losing it.
  const [phase, setPhase] = useState("idle");
  // The interviewer's recent lines, newest last. A LIST, not one replaced string: during a live
  // conversation these captions are the only text the candidate gets (the turn log loads once at
  // entry and does not refresh mid-interview), and they are the accessibility path — a deaf or
  // hard-of-hearing candidate must be able to still SEE the open question after the interviewer
  // says "got it, thank you" or "one moment". A single replaced string wiped the question off the
  // screen on every acknowledgement, and a barge-in fragment ("So,") could replace the full
  // question with three letters. Fragments are absorbed: a caption that extends the previous one
  // replaces it, a shorter prefix of it is ignored.
  const [captions, setCaptions] = useState([]);
  const CAPTION_LOG_LENGTH = 4;
  const [error, setError] = useState("");
  const [personaName, setPersonaName] = useState("");
  // See AGENT_STATE_ATTR. "" until the agent has published anything — the room reads that as
  // "no granularity available" and shows its generic live copy, never a wrong state.
  const [activity, setActivity] = useState("");
  // Whether the CANDIDATE is currently being heard. Straight from the SFU's own speaker detection
  // (audio level + a hold), so it reflects what the interviewer actually receives rather than what
  // this tab thinks it is sending — a muted-by-the-OS mic reads as silent here, which is the whole
  // point of showing it.
  const [youSpeaking, setYouSpeaking] = useState(false);

  const roomRef = useRef(null);
  const connectingRef = useRef(false);
  const watchdogRef = useRef(null);
  const wasLiveRef = useRef(false);
  const audioElsRef = useRef([]);
  const poorSinceRef = useRef(null);
  const poorTimerRef = useRef(null);
  const bandwidthAnomalyFiredRef = useRef(false);
  const onEndedRef = useRef(onEnded);
  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  const checkAvailable = useCallback(async () => {
    try {
      const res = await api.get("/interview-portal/livekit/available", { headers: authHeader() });
      const enabled = Boolean(res.data?.enabled);
      setAvailable(enabled);
      return enabled;
    } catch {
      // 404/failure just means "not this pipeline" — the interview every candidate gets today is
      // unaffected.
      setAvailable(false);
      return false;
    }
  }, []);

  const teardownMedia = useCallback(() => {
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
    for (const el of audioElsRef.current) {
      try {
        el.remove();
      } catch {
        /* already gone */
      }
    }
    audioElsRef.current = [];
    if (poorTimerRef.current) {
      clearTimeout(poorTimerRef.current);
      poorTimerRef.current = null;
    }
    poorSinceRef.current = null;
    bandwidthAnomalyFiredRef.current = false;
    // The agent is gone; anything it last told us about itself is now a lie. Clearing rather than
    // leaving the last value is what stops a dropped connection from rendering a cheerfully
    // "Listening" interviewer that cannot hear a word.
    setActivity("");
    setYouSpeaking(false);
  }, []);

  const disconnect = useCallback(async () => {
    teardownMedia();
    const room = roomRef.current;
    roomRef.current = null;
    connectingRef.current = false;
    if (room) {
      try {
        await room.disconnect();
      } catch {
        /* closing anyway */
      }
    }
    // Close the billing window. Idempotent server-side; in production the room_finished webhook
    // is the backstop for the cases where this request never lands.
    try {
      await api.post("/interview-portal/livekit/end", {}, { headers: authHeader() });
    } catch {
      /* webhook backstop */
    }
    setPhase((p) => (p === "failed" ? p : "ended"));
  }, [teardownMedia]);

  const connect = useCallback(async () => {
    // Idempotent — the consent button and the room's enforcement effect race this deliberately,
    // same lesson as the Deepgram pipeline's connectingRef.
    if (connectingRef.current || roomRef.current) return;
    connectingRef.current = true;
    setError("");
    setPhase("connecting");

    try {
      const res = await api.post("/interview-portal/livekit/session", {}, { headers: authHeader() });
      const { url, token, persona, videoEnabled } = res.data || {};
      if (persona?.name) setPersonaName(persona.name);

      const room = new Room();
      roomRef.current = room;

      // Only the agent publishes lk.agent.state, so presence of the attribute IS the identity
      // check — no assumption about how the worker names itself.
      const readAgentState = (participant) => {
        const next = participant?.attributes?.[AGENT_STATE_ATTR];
        if (next) setActivity(next);
      };

      room.on(RoomEvent.ParticipantConnected, (participant) => {
        // The interviewer arrived. From here on, everything is just talking.
        if (watchdogRef.current) {
          clearTimeout(watchdogRef.current);
          watchdogRef.current = null;
        }
        wasLiveRef.current = true;
        setPhase("live");
        // Attributes set BEFORE we subscribed arrive with the participant, not as a change event.
        readAgentState(participant);
      });

      room.on(RoomEvent.ParticipantAttributesChanged, (_changed, participant) => {
        readAgentState(participant);
      });

      room.on(RoomEvent.ParticipantDisconnected, () => {
        // Same reasoning as teardownMedia: an interviewer who has left is not "listening".
        setActivity("");
      });

      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        setYouSpeaking(speakers.some((s) => s.identity === room.localParticipant.identity));
      });

      // Bandwidth-anomaly proctoring signal (see BANDWIDTH_ANOMALY_MS above). Only the LOCAL
      // participant's quality matters here — the interviewer's own connection says nothing about
      // the candidate. A reconnect (quality flips away from "poor" at all, including "unknown"
      // during the handshake) resets the streak rather than counting through it.
      room.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
        if (participant !== room.localParticipant) return;
        if (quality === ConnectionQuality.Poor) {
          if (poorSinceRef.current == null) poorSinceRef.current = Date.now();
          if (!poorTimerRef.current && !bandwidthAnomalyFiredRef.current) {
            poorTimerRef.current = setTimeout(() => {
              poorTimerRef.current = null;
              if (poorSinceRef.current != null && Date.now() - poorSinceRef.current >= BANDWIDTH_ANOMALY_MS) {
                bandwidthAnomalyFiredRef.current = true;
                api
                  .post(
                    "/interview-portal/proctoring/events",
                    { events: [{ type: "bandwidth_anomaly" }] },
                    { headers: authHeader() }
                  )
                  .catch(() => {});
              }
            }, BANDWIDTH_ANOMALY_MS);
          }
        } else {
          poorSinceRef.current = null;
          if (poorTimerRef.current) {
            clearTimeout(poorTimerRef.current);
            poorTimerRef.current = null;
          }
        }
      });

      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Audio) {
          const el = track.attach();
          el.style.display = "none";
          document.body.appendChild(el);
          audioElsRef.current.push(el);
        }
      });

      // Live captions: the worker publishes both sides' transcription. Only the interviewer's
      // lines are shown — watching your own words appear turns a conversation into a dictation
      // exercise (same rule as every other pipeline).
      room.registerTextStreamHandler("lk.transcription", async (reader, participantInfo) => {
        try {
          const text = (await reader.readAll())?.trim();
          const identity = participantInfo?.identity || "";
          if (!text || !identity.startsWith("agent-")) return;
          setCaptions((prev) => {
            const norm = (s) => s.toLowerCase().replace(/\s+/g, " ").trim();
            const last = prev[prev.length - 1];
            if (last) {
              const a = norm(last);
              const b = norm(text);
              if (b === a || a.startsWith(b)) return prev; // repeat, or a fragment of what's shown
              if (b.startsWith(a)) {
                // The completion of a line whose fragment already rendered (a barge-in repaired,
                // or a redelivery) — supersede the fragment instead of stacking both.
                return [...prev.slice(0, -1), text];
              }
            }
            return [...prev, text].slice(-CAPTION_LOG_LENGTH);
          });
        } catch {
          /* caption loss is cosmetic */
        }
      });

      room.on(RoomEvent.Disconnected, () => {
        // The worker deletes the room when the interview closes (complete, withdrawn, or
        // halted); a mid-interview drop also lands here after reconnect attempts run out. The
        // room refetches the interview state either way — the SERVER knows which one happened,
        // and this client never guesses.
        roomRef.current = null;
        teardownMedia();
        if (wasLiveRef.current) {
          // The worker now holds the room open for a grace period after we vanish
          // (AGENT_REJOIN_GRACE_SECONDS in agent-worker/agent.py), so a drop is recoverable and
          // must not be presented as the interview being over. It used to go straight to "ended",
          // which on a phone meant losing the interview to a lock screen. `dropped` is a phase the
          // room can offer a way back from; the server still decides whether there is anything to
          // come back to.
          setPhase("dropped");
        }
      });

      await room.connect(url, token);
      try {
        await room.startAudio(); // called within the consent click's gesture chain (iOS Safari)
      } catch {
        /* playback will start on the next gesture */
      }
      // DTX (discontinuous transmission) is ON by default for mono tracks: it stops sending packets
      // during silence to save bandwidth, and the far end reconstructs the gaps as synthesised
      // comfort noise. On a track whose only consumer is an ASR model that is the wrong trade —
      // what blurs first is the onset of a word after a pause, which is exactly where a candidate
      // resumes an answer. Bandwidth is not the constraint in a one-to-one interview and the
      // transcript is the evidence a score cites, so it is bought back here. RED (redundant
      // encoding) stays ON: it also costs bandwidth, but it buys packet-loss resilience, which
      // makes the transcript better rather than worse.
      await room.localParticipant.setMicrophoneEnabled(true, undefined, { dtx: false, red: true });

      // Video (Phase 7, default-off): the server already decided whether this session gets a
      // camera track — the browser never opts itself in. Reuses the SAME camera stream the
      // proctoring vision pipeline already holds (useProctoring.getStream) rather than acquiring
      // the device a second time, which on some browsers/OSes fails outright with two concurrent
      // getUserMedia video requests. publishTrack, not setCameraEnabled — the latter would open
      // its own independent capture.
      if (videoEnabled && typeof getVideoStream === "function") {
        try {
          const stream = getVideoStream();
          const videoTrack = stream?.getVideoTracks?.()[0];
          if (videoTrack) {
            await room.localParticipant.publishTrack(videoTrack, { source: Track.Source.Camera });
          }
        } catch (err) {
          // Recording is additive to a working interview, never a condition of one — a failed
          // publish must not stop the candidate from proceeding on audio alone.
          console.warn("[livekit] camera publish failed (continuing on audio):", err.message);
        }
      }

      if (room.remoteParticipants && room.remoteParticipants.size > 0) {
        wasLiveRef.current = true;
        setPhase("live");
        // Already in the room when we joined (a rejoin, or a fast worker): ParticipantConnected
        // never fires for these, so their current state has to be read directly.
        for (const participant of room.remoteParticipants.values()) readAgentState(participant);
      } else {
        setPhase("waiting_agent");
        watchdogRef.current = setTimeout(() => {
          // No interviewer. Fault is on our side — fail the PIPELINE, not the candidate:
          // available=false recomputes the room's mode flags and the next pipeline takes over.
          console.error("[livekit] agent did not join in time — falling back");
          setError("Couldn't start the live interview — switching to the standard voice interview.");
          setAvailable(false);
          setPhase("failed");
          void disconnect();
        }, AGENT_JOIN_TIMEOUT_MS);
      }
    } catch (err) {
      roomRef.current = null;
      connectingRef.current = false;
      teardownMedia();
      setAvailable(false); // this pipeline is not happening today; fall back, never dead-end
      setPhase("failed");
      throw err;
    }
    connectingRef.current = false;
  }, [disconnect, teardownMedia]);

  // Tab closed mid-interview: best-effort metering flush that survives page teardown. The
  // room_finished webhook is the authoritative backstop in production.
  //
  // ON A PHONE, `pagehide` IS NOT "THE TAB CLOSED". iOS Safari and Android Chrome fire it every
  // time the page is backgrounded — an incoming call, the lock screen, switching apps to check
  // something. Flushing unconditionally therefore closed the billing window on a candidate who was
  // about to come straight back, and did it at exactly the moment the worker was also tearing the
  // room down. `persisted === true` means the page is going into the back/forward cache and MAY be
  // restored, which is the mobile-backgrounding case; only a non-persisted hide is a real teardown.
  useEffect(() => {
    const flush = (event) => {
      if (event?.persisted) return;
      if (!roomRef.current) return;
      try {
        const base = (api.defaults?.baseURL || "").replace(/\/$/, "");
        void fetch(`${base}/interview-portal/livekit/end`, {
          method: "POST",
          keepalive: true,
          headers: { "Content-Type": "application/json", ...authHeader() },
          body: "{}",
        });
      } catch {
        /* webhook backstop */
      }
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, []);

  // Unmount = leave. Never leave a live room behind a dead component.
  useEffect(() => {
    return () => {
      if (roomRef.current) void disconnect();
    };
  }, [disconnect]);

  // Come back to an interview a connection drop knocked us out of.
  //
  // This is deliberately just `connect()` again: the session endpoint is idempotent for reconnects
  // (livekitRoutes' session limiter allows for exactly this), the worker is still sitting in the
  // room, and the engine state — which question is open, what has been answered — never lived here
  // in the first place. There is nothing to restore, only a socket to re-establish.
  const rejoin = useCallback(async () => {
    if (phase !== "dropped") return;
    setError("");
    setPhase("idle");
    wasLiveRef.current = false;
    try {
      await connect();
    } catch {
      // connect() has already set phase/available; the room falls back to the next pipeline.
    }
  }, [connect, phase]);

  // A drop that is never recovered is an ended interview. The grace window belongs to the worker,
  // so this waits a little longer than it does before giving up — coming back to find the room
  // gone is a worse experience than one extra moment on a "reconnecting" screen.
  useEffect(() => {
    if (phase !== "dropped") return undefined;
    const timer = setTimeout(() => {
      setPhase((current) => {
        if (current !== "dropped") return current;
        onEndedRef.current?.();
        return "ended";
      });
    }, REJOIN_WINDOW_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  return {
    available,
    phase,
    // What the interviewer is doing right now: "" | initializing | idle | listening | thinking |
    // speaking. "" means the worker never told us — show generic live copy, not a guess.
    activity,
    youSpeaking,
    error,
    rejoin,
    // The halt decision and message live server-side; after the worker speaks it and closes the
    // room, the refetched interview state carries `halted` and the room shows that screen.
    haltMessage: "",
    halted: false,
    // Newest last. `caption` (the latest line) is kept for any consumer that only wants one.
    captions,
    caption: captions[captions.length - 1] || "",
    personaName,
    connect,
    disconnect,
    checkAvailable,
  };
}
