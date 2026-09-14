import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, LogOut } from "lucide-react";
import Button from "../ui/Button.jsx";
import { getAuth } from "../../portal/portalAuth.js";

// The full-viewport chrome for the two live portal routes (pre-check, interview). Deliberately
// NOT AppShell: its left rail carries Careers/Dashboard/My Resumes links that are in-app SPA
// navigations, invisible to beforeunload, and were a real accidental-exit path out of a monitored,
// unrepeatable interview session. This shell replaces that chrome instead of patching around it —
// see the "interview portal shell" surface brief.

function ExitConfirmDialog({ onStay, onLeave }) {
  const dialogRef = useRef(null);
  const stayRef = useRef(null);

  // Focus the safe default action on open, trap Tab within the dialog, close on Escape (treated
  // as "stay" — the safe outcome), and restore focus to whatever triggered the dialog on close.
  useEffect(() => {
    const previouslyFocused = document.activeElement;
    stayRef.current?.focus();

    function onKeyDown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        onStay();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll("button");
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [onStay]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 px-4 py-8">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="exit-dialog-title"
        aria-describedby="exit-dialog-description"
        className="w-full max-w-sm rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-soft"
      >
        <h2 id="exit-dialog-title" className="text-base font-semibold text-slate-900">
          Leave this interview?
        </h2>
        <p id="exit-dialog-description" className="mt-2 text-sm text-slate-600">
          Your answers so far are saved. You can come back and continue before your interview link
          expires, but leaving now ends this monitored session.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button ref={stayRef} variant="outline" size="sm" onClick={onStay}>
            Stay
          </Button>
          <Button variant="danger" size="sm" onClick={onLeave}>
            Leave interview
          </Button>
        </div>
      </div>
    </div>
  );
}

// stage: "setup" (pre-check — nothing at stake yet, exit is immediate) or
//        "live" (interview — exit is guarded by ExitConfirmDialog).
// wide: the call layout (stage + transcript) needs the full width of the display rather than the
// shell's usual reading-width column. Widens the header to match so the brand mark and the Exit
// control still line up with the content edges below them.
// fill: from `lg` up the room is a fixed-height application surface, not a document — the header
// pins, the two panes below it divide what is left of the viewport, and only the transcript log
// scrolls, so the question can never be lost off the top of the screen. Below `lg` the two panes
// are stacked and there is no viewport left to divide, so the page scrolls normally rather than
// clipping half the room away.
// meta: the header's centre slot (question counter, elapsed time). Lives up here rather than in
// the room because it is chrome — the same status the tab title would carry — and because it must
// stay put while the panes beneath it change.
export default function InterviewShell({ stage = "live", wide = false, fill = false, meta = null, children }) {
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const jobTitle = getAuth()?.jobTitle;
  const measure = wide ? "max-w-[1560px]" : "max-w-3xl";

  function requestExit() {
    if (stage === "live") setConfirming(true);
    else navigate("/portal/dashboard");
  }

  return (
    <div className={fill ? "min-h-screen bg-[#F4F6F9] lg:flex lg:h-dvh lg:flex-col lg:overflow-hidden" : "min-h-screen bg-[#F4F6F9]"}>
      <header className={`${fill ? "sticky top-0 z-30 lg:static lg:shrink-0" : "sticky top-0 z-30"} border-b border-[#E2E8F0] bg-white`}>
        <div className={`mx-auto flex h-16 items-center gap-3 px-4 sm:gap-4 sm:px-6 ${measure}`}>
          {/* Brand mark and where you are, read as one breadcrumb: product, then the role this
              interview is for. The role is the half that matters to the candidate, so it is the
              half that keeps its weight when the wordmark drops away on a phone. */}
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F97316] text-white">
              <Zap className="h-[18px] w-[18px]" fill="currentColor" strokeWidth={1.5} />
            </span>
            <span className="hidden shrink-0 text-[17px] font-bold tracking-tight text-[#EA6C0A] sm:inline">
              AptusHire
            </span>
            {jobTitle && (
              <>
                <span aria-hidden="true" className="hidden shrink-0 text-slate-300 sm:inline">
                  /
                </span>
                <span className="truncate text-[15px] font-semibold text-slate-800">{jobTitle}</span>
              </>
            )}
          </div>

          {meta}

          <div className="flex shrink-0 flex-1 justify-end">
            <button
              type="button"
              onClick={requestExit}
              className="tap-target inline-flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FEF3E8]"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" /> Exit
            </button>
          </div>
        </div>
      </header>

      <main
        className={
          fill
            ? `mx-auto flex w-full flex-col px-4 py-4 sm:px-6 lg:min-h-0 lg:flex-1 ${measure}`
            : `mx-auto px-5 py-8 ${measure}`
        }
      >
        {children}
      </main>

      {confirming && (
        <ExitConfirmDialog onStay={() => setConfirming(false)} onLeave={() => navigate("/portal/dashboard")} />
      )}
    </div>
  );
}
