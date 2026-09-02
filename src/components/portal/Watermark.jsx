import { useEffect, useState } from "react";

// A visible, tiled watermark over the interview/assessment screen. This does NOT detect or block
// screen-sharing — no browser API can (see the room components' own comments on that limitation). It
// exists so that if a screen IS shared or recorded outside our reach, whatever leaves the room carries
// the candidate's name, a short session fingerprint, and a live clock baked into the pixels — the same
// principle Zoom/Teams recording watermarks and confidential-document viewers use. A static screenshot
// still carries a timestamp; a live share shows the clock visibly ticking to anyone watching it happen.
//
// `pointer-events-none` so it can never intercept a click or keystroke; kept faint and z-indexed below
// modals/toasts (see the room components) so it never competes with anything the candidate needs to
// read or click.
function formatStamp(d) {
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// Deliberately sparse and near-invisible at normal viewing distance — candidates found the
// original density (30 tiles at 10% opacity) distracting to read against. The forensic purpose
// (tracing a leaked recording/screenshot back to the session) only needs ONE legible instance to
// survive per crop, not a wall of repeated text, so tile count and opacity both come down while
// the label content stays exactly what it was — this is a visibility change, not a capability one.
const TILE_COUNT = 14;

export default function Watermark({ name, idFragment }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    // Every 15s, not every 1s — this only needs to be visibly LIVE on a share/recording, not precise;
    // a per-second re-render of the tiles for the entire duration of an interview is wasted work.
    const timer = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(timer);
  }, []);

  const label = [name, idFragment, formatStamp(now)].filter(Boolean).join("   ·   ");

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[45] overflow-hidden select-none">
      <div className="absolute inset-0 -m-40 grid grid-cols-2 gap-y-44 gap-x-24 rotate-[-28deg] sm:grid-cols-3">
        {Array.from({ length: TILE_COUNT }, (_, i) => (
          <span key={i} className="whitespace-nowrap text-xs font-normal text-slate-900/[0.05]">
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
