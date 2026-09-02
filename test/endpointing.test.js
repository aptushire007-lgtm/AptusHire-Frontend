// user/src/portal/endpointing.js is a MIRROR of backend/utils/endpointing.js and
// backend/utils/finishIntent.js, duplicated across the boundary deliberately:
// only the browser knows, in real time, when the silence started and what the
// microphone energy did, so the classification has to run there.
//
// Duplication is the right call and it has a price, which is this file. If the
// two copies drift, the browser ends a turn while the server still believes the
// candidate is mid-thought — and the candidate experiences the single loudest
// complaint this pipeline has ever had: "it interrupted me." That failure is
// silent, it is unrecoverable (the words they were saying are simply gone), and
// nothing else in the codebase would catch it.
//
// So these tests do not re-litigate the classification rules — backend/test/unit/
// endpointing.test.js owns those, and asserting them twice would just mean two
// places to update. What is tested here is exactly the thing that has no other
// owner: that both copies answer identically. The backend modules are CommonJS
// and outside this app's Vite root, so createRequire hands them straight to Node.

import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import * as client from "../src/portal/endpointing.js";

const require = createRequire(import.meta.url);
const server = require("../../backend/utils/endpointing.js");
const finishIntent = require("../../backend/utils/finishIntent.js");

// A falling envelope (voice trailing off), a flat one (stopped abruptly,
// mid-thought), and a rising one (making another point) — the same three shapes
// the backend suite uses, so a divergence here is comparable to that one.
const FALLING = [...Array(10).fill(0.3), ...Array(5).fill(0.05)];
const FLAT = Array(15).fill(0.3);
const RISING = [...Array(10).fill(0.1), ...Array(5).fill(0.4)];
const ENVELOPES = { FALLING, FLAT, RISING, NONE: undefined, EMPTY: [], SHORT: [0.1, 0.2] };

const UTTERANCES = [
  // Mid-thought — must never end a turn.
  "So we started with a monolith and",
  "The tricky part was that the queue would back up because",
  "I looked at three options, but",
  "We scaled it horizontally, um",
  "That would be, hmm",
  "We used a queue, sort of",
  "It was fine, you know",
  "Let me think",
  // Finished.
  "We moved the whole ingestion pipeline onto Kafka and it cut our end-to-end latency roughly in half.",
  "So in the end we settled on optimistic locking, and that removed the contention entirely.",
  "That is how we solved the caching problem in the end.",
  // Ambiguous.
  "Yes.",
  "We migrated the service across three regions and rebuilt the deployment pipeline around it",
  "No, not really",
  // Degenerate.
  "",
  "   ",
  null,
  undefined,
];

describe("endpointing mirror — the browser classifies exactly as the server would", () => {
  it("agrees on state, wait and reason for every utterance × energy shape", () => {
    const disagreements = [];
    for (const text of UTTERANCES) {
      for (const [name, energy] of Object.entries(ENVELOPES)) {
        const mine = client.classify(text, { energy });
        const theirs = server.classify(text, { energy });
        if (mine.state !== theirs.state || mine.waitMs !== theirs.waitMs || mine.reason !== theirs.reason) {
          disagreements.push(
            `${JSON.stringify(text)} @${name}: client=${JSON.stringify(mine)} server=${JSON.stringify(theirs)}`
          );
        }
      }
    }
    expect(disagreements).toEqual([]);
  });

  it("falls back to the server's own numbers when no policy was sent", () => {
    // The wait windows are server-owned and arrive with the streaming
    // credential, so a tenant configures patience in one place. The client's
    // fallback exists only for an older backend that sends none — and if it
    // drifts from DEFAULTS, that older backend silently gets different pacing.
    const fallback = client.normalizeEndpointing(undefined);

    expect(fallback.completeWaitMs).toBe(server.DEFAULTS.completeWaitMs);
    expect(fallback.ambiguousWaitMs).toBe(server.DEFAULTS.ambiguousWaitMs);
    expect(fallback.holdingWaitMs).toBe(server.DEFAULTS.holdingWaitMs);
    expect(fallback.minCompleteWords).toBe(server.DEFAULTS.minCompleteWords);
  });

  it("honours a server-sent policy instead of its own numbers", () => {
    const policy = { completeWaitMs: 700, ambiguousWaitMs: 5000, holdingWaitMs: 9000, minCompleteWords: 4 };
    const mine = client.classify("We rewrote the ingestion path and cut latency by half.", { energy: FALLING, policy });
    const theirs = server.classify("We rewrote the ingestion path and cut latency by half.", { energy: FALLING, policy });

    expect(mine).toEqual(theirs);
    expect(mine.waitMs).toBe(700);
  });

  it("holds the floor on every word and phrase the server holds it on", () => {
    // The vocabularies are module-private on the client, so this compares the
    // observable contract instead: build an utterance ending in each of the
    // server's holding words, fillers and phrases, and require both sides to
    // agree. A word added server-side and forgotten here shows up as the
    // browser cutting someone off mid-sentence.
    const tails = [
      ...server.HOLDING_WORDS,
      ...server.FILLERS,
      ...server.HOLDING_PHRASES,
    ];
    const missing = tails.filter((tail) => {
      const text = `We rebuilt the ingestion path and moved it onto a queue ${tail}`;
      return client.isHolding(text) !== server.isHolding(text);
    });

    expect(missing).toEqual([]);
  });

  it("reads the same energy trend from the same samples", () => {
    for (const [name, energy] of Object.entries(ENVELOPES)) {
      expect(client.energyTrend(energy), name).toBe(server.energyTrend(energy));
    }
    // Too few samples to draw a trend from — the text must decide alone rather
    // than a two-sample "trend" deciding for it.
    expect(client.energyTrend([0.1, 0.2])).toBeNull();
    expect(client.energyTrend(undefined)).toBeNull();
  });

  it("agrees on what counts as a finished sentence", () => {
    for (const text of UTTERANCES) {
      expect(client.hasTerminalPunctuation(text), JSON.stringify(text)).toBe(server.hasTerminalPunctuation(text));
    }
  });

  it("GATE: never ends a turn sooner than the server would", () => {
    // The asymmetry the whole design rests on: ending early destroys evidence
    // the candidate was mid-answer and they cannot get it back, while waiting
    // too long merely feels slow. Equality is the contract above; this states
    // the direction that must hold even if it ever breaks.
    for (const text of UTTERANCES) {
      for (const energy of Object.values(ENVELOPES)) {
        const mine = client.classify(text, { energy });
        const theirs = server.classify(text, { energy });
        expect(mine.waitMs, JSON.stringify(text)).toBeGreaterThanOrEqual(theirs.waitMs);
      }
    }
  });
});

describe("finish-intent mirror — 'I'm done' means the same thing in both places", () => {
  // The server owns the trigger list and ships it to the browser with the
  // streaming credential, so the client never invents a rule. These are the
  // real triggers, not a copy.
  const triggers = finishIntent.TRIGGERS;

  const HAND_BACKS = [
    "We sharded by tenant id and moved the hot tables onto their own cluster, so that's my answer.",
    "We used a write-through cache in front of Postgres and invalidated on write, so yeah that's it.",
    "We split the monolith along the order and inventory boundaries and stood up a queue, that is all.",
    "We split the monolith along the order and inventory boundaries and stood up a queue. I have completed my answer.",
    "We split the monolith along the order and inventory boundaries and stood up a queue, done.",
  ];

  const NOT_HAND_BACKS = [
    // A finish phrase with no answer in front of it is a sentence still forming.
    "That's it",
    "I'm done",
    // They carried on talking, so the turn had not ended.
    "We rebuilt the indexer and that's about it, although actually the harder part was the backfill " +
      "which took another three weeks of careful batching work",
    "The migration is done, and then we still had to backfill three years of historical records " +
      "before the new pipeline could take over.",
    "The next question in the survey asked about latency, which we had already instrumented well.",
    "",
  ];

  it("agrees with the server on every hand-back and every near-miss", () => {
    const disagreements = [];
    for (const text of [...HAND_BACKS, ...NOT_HAND_BACKS]) {
      const mine = client.detectFinish(text, { triggers });
      const theirs = finishIntent.detect(text);
      if (Boolean(mine.honour) !== Boolean(theirs.honour)) {
        disagreements.push(`${JSON.stringify(text)}: client=${mine.honour} server=${theirs.honour}`);
      }
    }
    expect(disagreements).toEqual([]);
  });

  it("honours a real hand-back and refuses a fragment", () => {
    // Stated outright as well as by parity, so a change that breaks BOTH copies
    // the same way still fails.
    for (const text of HAND_BACKS) {
      expect(client.detectFinish(text, { triggers }).honour, text).toBe(true);
    }
    for (const text of NOT_HAND_BACKS) {
      expect(client.detectFinish(text, { triggers }).honour, text).toBe(false);
    }
  });

  it("does nothing at all when the server sent no triggers", () => {
    // An older or misconfigured backend must degrade to "never auto-finish",
    // never to a hardcoded client-side guess about what finishing sounds like.
    expect(client.detectFinish(HAND_BACKS[0], { triggers: [] }).honour).toBe(false);
    expect(client.detectFinish(HAND_BACKS[0], {}).honour).toBe(false);
  });
});
