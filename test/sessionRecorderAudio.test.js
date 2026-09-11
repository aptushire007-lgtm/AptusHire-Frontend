// The session recording is supposed to be "video and audio of this session" — that is the exact
// wording of the consent the candidate ticks in PreInterviewCheck before it may run at all.
//
// It was neither. The recorder recorded the stream `useProctoring` holds, and that stream is
// opened with `{ video }` and nothing else, because the microphone belongs to the voice hooks.
// Setting `audioBitsPerSecond` on a MediaRecorder does not conjure an audio track, so every
// interview ever recorded was a silent video — and nothing failed, logged, or looked wrong, which
// is why it survived. These tests exist so that cannot come back silently either.
//
// The first test is the gate: whatever MediaRecorder is handed MUST contain an audio track.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("../src/api/client.js", () => ({
  default: { post: vi.fn(() => Promise.resolve({ data: {} })), defaults: { baseURL: "http://localhost:9000/api" } },
}));
vi.mock("../src/portal/portalAuth.js", () => ({ authHeader: () => ({ Authorization: "Bearer test" }) }));

import { useSessionRecorder } from "../src/portal/useSessionRecorder.js";

// --- minimal MediaStream / track doubles -----------------------------------------------------
// jsdom implements none of the capture API, so the shapes the hook actually touches are stubbed
// here rather than mocked wholesale: it reads getVideoTracks/getAudioTracks off streams, calls
// stop() on the track it owns, and constructs `new MediaStream([...tracks])`.
function makeTrack(kind) {
  return { kind, stopped: false, stop() { this.stopped = true; } };
}

class FakeMediaStream {
  constructor(tracks = []) {
    this._tracks = tracks;
  }
  getTracks() {
    return this._tracks;
  }
  getVideoTracks() {
    return this._tracks.filter((t) => t.kind === "video");
  }
  getAudioTracks() {
    return this._tracks.filter((t) => t.kind === "audio");
  }
}

let constructedRecorders;

class FakeMediaRecorder {
  static isTypeSupported() {
    return true;
  }
  constructor(stream, options) {
    this.stream = stream;
    this.options = options;
    this.state = "inactive";
    this.started = false;
    constructedRecorders.push(this);
  }
  start() {
    this.state = "recording";
    this.started = true;
  }
  requestData() {}
  stop() {
    this.state = "inactive";
  }
}

let micRequests;
let micTracks;
let grantMic;

beforeEach(() => {
  constructedRecorders = [];
  micRequests = [];
  micTracks = [];
  grantMic = true;

  globalThis.MediaStream = FakeMediaStream;
  globalThis.MediaRecorder = FakeMediaRecorder;
  window.MediaRecorder = FakeMediaRecorder;

  navigator.mediaDevices = {
    getUserMedia: vi.fn(async (constraints) => {
      micRequests.push(constraints);
      if (!grantMic) throw new Error("NotAllowedError");
      const track = makeTrack("audio");
      micTracks.push(track);
      return new FakeMediaStream([track]);
    }),
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

function setup({ enabled = true, consented = true, videoTrack = makeTrack("video") } = {}) {
  const proctorStream = videoTrack ? new FakeMediaStream([videoTrack]) : null;
  const hook = renderHook(() =>
    useSessionRecorder({ getStream: () => proctorStream, enabled, consented })
  );
  return { hook, proctorStream, videoTrack };
}

describe("useSessionRecorder — the recording carries the candidate's voice", () => {
  it("ACCEPTANCE GATE: records a stream containing BOTH a video and an audio track", async () => {
    const { hook } = setup();

    await act(async () => {
      await hook.result.current.start();
    });

    expect(constructedRecorders).toHaveLength(1);
    const recorded = constructedRecorders[0].stream;
    expect(recorded.getVideoTracks()).toHaveLength(1);
    expect(recorded.getAudioTracks()).toHaveLength(1);
  });

  it("opens its own microphone rather than borrowing the interview's", async () => {
    // Neither voice engine holds a track that outlives a reconnect (LiveKit) or a turn (Deepgram),
    // and MediaRecorder binds its tracks once — a borrowed track that ends is silence for the rest
    // of the interview. So the hook asks for its own, with the same constraints the interview's own
    // mic uses so the review copy sounds like what the transcript was made from.
    const { hook } = setup();
    await act(async () => {
      await hook.result.current.start();
    });

    expect(micRequests).toHaveLength(1);
    expect(micRequests[0].audio).toMatchObject({ echoCancellation: true, noiseSuppression: true });
  });

  it("does NOT mutate the proctoring stream it was given", async () => {
    // Two other consumers hold that stream (the vision loop and the LiveKit publish) and it
    // outlives this recording. Pushing our mic onto it would leak into both.
    const { hook, proctorStream } = setup();
    await act(async () => {
      await hook.result.current.start();
    });

    expect(proctorStream.getAudioTracks()).toHaveLength(0);
    expect(constructedRecorders[0].stream).not.toBe(proctorStream);
  });

  it("still records video-only if the microphone cannot be opened", async () => {
    // A silent recording is a poor review copy. No recording at all is none.
    grantMic = false;
    const { hook } = setup();
    await act(async () => {
      await hook.result.current.start();
    });

    expect(constructedRecorders).toHaveLength(1);
    expect(constructedRecorders[0].stream.getVideoTracks()).toHaveLength(1);
    expect(constructedRecorders[0].started).toBe(true);
  });

  it("releases its microphone on stop — and never the camera, which proctoring still needs", async () => {
    const { hook, videoTrack } = setup();
    await act(async () => {
      await hook.result.current.start();
    });
    await act(async () => {
      await hook.result.current.stop();
    });

    expect(micTracks[0].stopped).toBe(true);
    expect(videoTrack.stopped).toBe(false);
  });

  it("never opens a microphone without consent, even when the feature is enabled", async () => {
    const { hook } = setup({ consented: false });
    await act(async () => {
      await hook.result.current.start();
    });

    expect(micRequests).toHaveLength(0);
    expect(constructedRecorders).toHaveLength(0);
  });

  it("never opens a microphone when the tenant has recording switched off", async () => {
    const { hook } = setup({ enabled: false });
    await act(async () => {
      await hook.result.current.start();
    });

    expect(micRequests).toHaveLength(0);
  });

  it("never records without a camera — it does not acquire one of its own", async () => {
    const { hook } = setup({ videoTrack: null });
    await act(async () => {
      await hook.result.current.start();
    });

    expect(constructedRecorders).toHaveLength(0);
  });

  it("two starts in the same tick open one recorder and one microphone, not two", async () => {
    // start() awaits getUserMedia now, so the effect firing twice can interleave two calls inside
    // that await — the window that did not exist while start() was synchronous.
    const { hook } = setup();
    await act(async () => {
      await Promise.all([hook.result.current.start(), hook.result.current.start()]);
    });

    expect(constructedRecorders).toHaveLength(1);
    expect(micRequests).toHaveLength(1);
  });

  it("ACCEPTANCE GATE: an interview that ends while the mic dialog is open never starts recording", async () => {
    // The candidate finished (or closed the tab) mid-getUserMedia. Coming back and beginning to
    // record after the session is over is a consent problem, not a tidiness one — and the mic must
    // be handed straight back.
    const { hook } = setup();

    let resolveMic;
    navigator.mediaDevices.getUserMedia = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveMic = () => {
            const track = makeTrack("audio");
            micTracks.push(track);
            resolve(new FakeMediaStream([track]));
          };
        })
    );

    let startPromise;
    act(() => {
      startPromise = hook.result.current.start();
    });
    await act(async () => {
      await hook.result.current.stop();
      resolveMic();
      await startPromise;
    });

    expect(constructedRecorders).toHaveLength(0);
    expect(micTracks[0].stopped).toBe(true);
  });
});

