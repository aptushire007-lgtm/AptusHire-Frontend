import { useEffect, useState, useCallback, useId, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  History,
  Sparkles,
  ListChecks,
  AlertTriangle,
  CircleCheck,
  Hourglass,
  ChevronDown,
  ClipboardList,
  Video,
  Briefcase,
  UserRound,
  CircleDot,
  ArrowRight,
  Search,
} from "lucide-react";
import api from "../api/client.js";
import { accountAuthHeader, clearAccountAuth } from "../auth/accountAuth.js";
import { useAccountAuth } from "../auth/useAccountAuth.js";
// The two portals are separate identities from the account (see portalAuth.js),
// so entering one from here means minting and storing ITS token — not reusing
// the account's.
import { saveAuth as savePortalAuth, clearAuth as clearPortalAuth } from "../portal/portalAuth.js";
import { saveAuth as saveAssessmentAuth, clearAuth as clearAssessmentAuth } from "../portal/assessmentAuth.js";
import { getSocket } from "../lib/socket.js";
import { Card, Badge, Skeleton, EmptyState, IconTile, SectionHeader } from "../components/ui/Card.jsx";
import { Chip, ChipRow, HeroStat, PageHero, StepTrack } from "../components/ui/Panels.jsx";
import Button from "../components/ui/Button.jsx";
import { stageLabel, stageTone, stageProgress, isRejected, STAGES, STAGE_LABELS } from "../lib/pipeline.js";
import VerificationTick from "../components/profile/VerificationTick.jsx";
import ActivityHeatmap from "../components/dashboard/ActivityHeatmap.jsx";
import ApplyVersionModal from "../components/jobs/ApplyVersionModal.jsx";
import { Download, ShieldCheck } from "lucide-react";

// --- time -------------------------------------------------------------------

// Deadlines here decide outcomes, so they are measured against the SERVER's
// clock, not the browser's. A device that is hours fast would otherwise tell a
// candidate a window had closed when it had not, or worse, the reverse.
function useServerClock(serverTime) {
  const [offset, setOffset] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (serverTime) setOffset(new Date(serverTime).getTime() - Date.now());
  }, [serverTime]);

  // Re-render once a minute so a countdown does not go stale while the page
  // sits open — which is exactly how someone misses a window.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  return useCallback(() => Date.now() + offset, [offset, tick]);
}

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

function formatAbsolute(value) {
  if (!value) return "";
  return new Date(value).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function indianGreeting(now = new Date()) {
  const hour = Number(new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    hourCycle: "h23",
  }).format(now));
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// "in 3 hours" / "5 days ago". Always rendered next to the absolute timestamp —
// a relative phrase alone is not something you can plan around.
function formatRelative(value, now) {
  if (!value) return "";
  const diff = new Date(value).getTime() - now;
  const past = diff < 0;
  const abs = Math.abs(diff);

  let phrase;
  if (abs < MIN) phrase = "less than a minute";
  else if (abs < HOUR) {
    const m = Math.round(abs / MIN);
    phrase = `${m} minute${m === 1 ? "" : "s"}`;
  } else if (abs < DAY) {
    const h = Math.round(abs / HOUR);
    phrase = `${h} hour${h === 1 ? "" : "s"}`;
  } else {
    const d = Math.round(abs / DAY);
    phrase = `${d} day${d === 1 ? "" : "s"}`;
  }
  return past ? `${phrase} ago` : `in ${phrase}`;
}

// --- action presentation ----------------------------------------------------

const ACTION_ICONS = {
  assessment: ClipboardList,
  interview: Video,
  offer: Sparkles,
  review: Hourglass,
  closed: CircleCheck,
};

// Tone is driven by state, not by kind: what matters is whether the candidate
// is blocked, running out of time, or free to wait.
function actionTone(action, now) {
  if (action.state === "missed") return "red";
  if (action.owner !== "candidate") return "slate";
  const due = action.dueAt ? new Date(action.dueAt).getTime() : null;
  if (due !== null && due - now <= DAY) return "amber";
  return "brand";
}

// Wrap / icon / text triples for the four urgency states. The text tones read
// from the verdict tokens rather than raw Tailwind hues, so this map and the
// Badge sitting next to it cannot describe the same state in two different
// colours — and the amber moves off 4.35:1, which was under AA at this size.
const TONE_STYLES = {
  red: {
    wrap: "border-red-200 bg-red-50",
    icon: "bg-[#FDECEA] text-[#C0392B]",
    text: "text-[#C0392B]",
  },
  amber: {
    wrap: "border-amber-200 bg-amber-50",
    icon: "bg-[#FFE8DC] text-[#FF6B2C]",
    text: "text-[#FF6B2C]",
  },
  brand: {
    wrap: "border-[#FFCAAF] bg-[#FFE8DC]",
    icon: "bg-[#FFE8DC] text-[#FF6B2C]",
    text: "text-[#FF6B2C]",
  },
  slate: {
    wrap: "border-slate-200 bg-slate-50",
    icon: "bg-slate-100 text-slate-600",
    text: "text-slate-600",
  },
};

// Inline text actions — "Mark as read", "Remove", "Save". They stay text, but
// they get a real hit area: 24px is the WCAG 2.2 AA target floor and
// `tap-target` lifts it to 44px on a thumb. The negative margin cancels the
// padding so nothing shifts optically, and the focus ring is added because a
// bare <button> here previously had no visible focus state of its own.
const INLINE_ACTION =
  "tap-target -m-1 inline-flex items-center gap-1 rounded-lg p-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2";

// Session statuses arrive as backend identifiers. Every other piece of stage
// copy on this page comes from pipeline.js; these were the one place a raw enum
// was reformatted into UI text, so a schema rename would have surfaced straight
// to the candidate. Unknown values still fall through to the old formatting
// rather than disappearing.
const SESSION_STATUS_LABELS = {
  pending: "Not started",
  scheduled: "Scheduled",
  in_progress: "In progress",
  completed: "Completed",
  submitted: "Submitted",
  expired: "Expired",
  cancelled: "Cancelled",
};

function sessionStatusLabel(status) {
  if (!status) return "Unknown";
  return SESSION_STATUS_LABELS[status] || String(status).replace(/_/g, " ");
}

function applicationPipelineBucket(status) {
  if (isRejected(status)) return "rejected";
  if (["shortlisted"].includes(status)) return "shortlisted";
  if (["interview_scheduled", "ai_interview_completed", "hr_interview", "technical_interview", "manager_interview"].includes(status)) return "interview";
  if (["ats_passed", "assessment_scheduled", "assessment_completed", "under_review"].includes(status)) return "screening";
  return "applied";
}

// A progress bar is a measurement, so it names what it measures. Without the
// role and the value it is a styled empty div — and on an application card it
// is the only thing that says how far along the process actually is.
function ProgressBar({ value, label, className = "", trackClassName = "h-1.5" }) {
  const pct = Math.max(0, Math.min(100, Math.round(value || 0)));
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={`w-full overflow-hidden rounded-full bg-slate-100 ${trackClassName} ${className}`}
    >
      <div
        className="h-full rounded-full bg-[#FF6B2C] transition-[width] duration-500 ease-out motion-reduce:transition-none"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// The line that names who the step is waiting on. Every other candidate portal
// shows a status label with no owner, which is why "Under Review" tells you
// nothing — it is equally true on day 1 and day 60.
function OwnerLine({ action, now }) {
  if (action.owner === "candidate") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
        <UserRound className="h-3.5 w-3.5" aria-hidden="true" /> Waiting on you
      </span>
    );
  }
  if (action.owner === "company") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
        <Hourglass className="h-3.5 w-3.5" aria-hidden="true" /> Waiting on the hiring team
        {action.since ? ` · for ${formatRelative(action.since, now).replace(" ago", "")}` : ""}
      </span>
    );
  }
  return null;
}

// Label for the button that enters a session. Naming the thing beats a generic
// "Open" — the candidate is deciding whether they have time for this right now.
function openLabel(action) {
  if (action.kind === "interview") return action.state === "in_progress" ? "Resume interview" : "Start interview";
  return action.state === "in_progress" ? "Resume assessment" : "Start assessment";
}

// One thing the candidate must do, with its real deadline and — while the
// window is open — the way in. The link itself is never displayed: only its
// hash is stored server-side, so it cannot be reproduced, and minting a new one
// would break the link already sitting in the candidate's inbox. The button
// instead exchanges the account session for this session's portal token.
function ActionRow({ action, jobTitle, companyName, now, onOpen, opening }) {
  const Icon = ACTION_ICONS[action.kind] || CircleDot;
  const tone = TONE_STYLES[actionTone(action, now)];
  const due = action.dueAt;

  return (
    // 16px is the container radius; 12px is the control radius. This panel is a
    // container, and at `rounded-xl` it read as an oversized button — see
    // DESIGN.md § The 12/16 Rule.
    <div className={`rounded-2xl border p-4 ${tone.wrap}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone.icon}`}>
          {action.state === "missed" ? (
            <AlertTriangle className="h-4.5 w-4.5" aria-hidden="true" />
          ) : (
            <Icon className="h-4.5 w-4.5" aria-hidden="true" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">{action.title}</p>
          {jobTitle && (
            <p className="truncate text-xs text-slate-500">
              {jobTitle}
              {companyName ? ` · ${companyName}` : ""}
            </p>
          )}
          <p className="mt-1.5 text-sm text-slate-600">{action.detail}</p>

          {action.scheduledAt && (
            <p className="mt-1.5 text-xs text-slate-500">
              Scheduled for <span className="font-medium text-slate-700">{formatAbsolute(action.scheduledAt)}</span>
            </p>
          )}

          {due && (
            <p className={`mt-1.5 text-xs font-semibold ${tone.text}`}>
              {action.state === "missed" ? "Closed" : "Closes"} {formatRelative(due, now)}
              <span className="ml-1 font-normal text-slate-500">· {formatAbsolute(due)}</span>
            </p>
          )}

          {action.canOpen && (
            <div className="mt-3">
              <Button size="sm" variant="orange" loading={opening} onClick={() => onOpen(action)}>
                {openLabel(action)} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- application tracking ---------------------------------------------------

// The full ordered pipeline with the reached point marked. A candidate can see
// not just where they are but what the remaining process actually is — which
// the single status label they get everywhere else never tells them.
function StageTrack({ status, stageHistory }) {
  const reached = useMemo(() => {
    const set = new Set((stageHistory || []).map((h) => h.stage));
    set.add(status);
    return set;
  }, [status, stageHistory]);

  const atIndex = STAGES.indexOf(status);
  const dates = useMemo(() => {
    const map = {};
    for (const h of stageHistory || []) if (h.at && !map[h.stage]) map[h.stage] = h.at;
    return map;
  }, [stageHistory]);

  // Only stages this application has actually touched, plus the next two, so a
  // 15-step pipeline does not drown the three steps that matter.
  const visible = STAGES.filter((s, i) => reached.has(s) || (atIndex >= 0 && i > atIndex && i <= atIndex + 2));

  // The numbers are the position in the VISIBLE run, not in the full pipeline —
  // "Step 01" is where this candidate's story starts, not where the schema's
  // enum does. The dates come straight from stageHistory, so a step that has
  // been reached says when, and one that has not says nothing rather than
  // guessing.
  const steps = visible.map((stage) => ({
    key: stage,
    label: STAGE_LABELS[stage] || stage,
    meta: dates[stage] ? formatAbsolute(dates[stage]) : null,
  }));

  return (
    <StepTrack
      className="mt-4"
      label="Application progress"
      steps={steps}
      currentKey={status}
      reached={reached}
    />
  );
}

function ApplicationCard({ application, next, now, onOpen, openingId }) {
  const [open, setOpen] = useState(false);
  const trackId = useId();
  const { job, status, stageHistory = [], offer } = application;
  const rejected = isRejected(status);
  const pct = Math.round(stageProgress(status) * 100);
  const primary = next?.primary;

  return (
    // Container radius, not control radius — DESIGN.md § The 12/16 Rule.
    //
    // `min-w-0` for the reason <Card> carries it in the primitive (see
    // components/ui/Card.jsx): this is a GRID ITEM, and a grid item's automatic
    // minimum size is its min-content — which, for the `truncate` job title and
    // company name below, is the FULL untruncated string. Measured at 601px
    // inside a 320px viewport, and because index.css clips overflow-x rather
    // than scrolling it, the excess was silently CUT OFF rather than reachable.
    // This card is hand-rolled rather than a <Card> (it is nested inside one and
    // deliberately carries no second shadow), so it does not inherit that fix.
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {/* Slate, not brand: this chip marks "an application" on a card whose
              actual signal — the stage badge beside it — is the thing meant to
              catch the eye. A violet tile competing with it would be the second
              loudest element saying nothing. */}
          <IconTile icon={Briefcase} tone="slate" size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{job?.title || "Application"}</p>
            <p className="truncate text-xs text-slate-500">{job?.company?.name}</p>
          </div>
        </div>
        <Badge tone={stageTone(status)}>{stageLabel(status)}</Badge>
      </div>

      {!rejected && (
        <ProgressBar
          className="mt-3"
          value={pct}
          label={`${job?.title || "Application"}: ${stageLabel(status)}, ${pct}% through the process`}
        />
      )}

      {primary && (
        <div className="mt-3">
          <OwnerLine action={primary} now={now} />
          <p className="mt-1 text-sm text-slate-600">{primary.detail}</p>
          {primary.dueAt && primary.owner === "candidate" && (
            <p className={`mt-1 text-xs font-semibold ${TONE_STYLES[actionTone(primary, now)].text}`}>
              {primary.state === "missed" ? "Closed" : "Closes"} {formatRelative(primary.dueAt, now)}
            </p>
          )}
        </div>
      )}

      {offer?.status && offer.status !== "none" && (
        <p className="mt-2 text-xs font-medium text-amber-700">
          Offer {offer.status}
          {offer.sentAt ? ` · sent ${formatAbsolute(offer.sentAt)}` : ""}
        </p>
      )}

      {primary?.canOpen && (
        <div className="mt-3">
          <Button size="sm" variant="orange" loading={openingId === primary.sessionId} onClick={() => onOpen(primary)}>
            {openLabel(primary)} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={trackId}
        className={`${INLINE_ACTION} mt-3 text-[#FF6B2C] hover:bg-[#FFE8DC] hover:underline focus-visible:ring-brand-300`}
      >
        <ChevronDown
          aria-hidden="true"
          className={`h-3.5 w-3.5 transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
        />
        {open ? "Hide" : "Show"} full progress
      </button>

      <div id={trackId} hidden={!open}>
        {open && <StageTrack status={status} stageHistory={stageHistory} />}
      </div>
    </div>
  );
}

// --- page -------------------------------------------------------------------

// These cards are siblings of the "Needs you" panel, not children of it, so
// they sit at the same heading level. They were <h3> under an <h1>, which skips
// a level and leaves a screen-reader user's section list with a hole in it.
function SectionCard({ title, icon: Icon, description, children, action, ...props }) {
  return (
    <Card as="section" {...props} className="border-[#E8E8E4] !bg-white text-[#1A1A1A] dark:border-[#E8E8E4] dark:!bg-white">
      {/* Composes <SectionHeader> rather than re-rolling a title row, so the
          icon chip, heading size, and action alignment match every other
          section in both apps instead of drifting one screen at a time. */}
      <SectionHeader icon={Icon} title={title} description={description} action={action} />
      <div className="mt-5">{children}</div>
    </Card>
  );
}

export default function CandidateDashboard() {
  const navigate = useNavigate();
  const { user } = useAccountAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [openingId, setOpeningId] = useState(null);
  const [openError, setOpenError] = useState("");
  const redirectTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, []);

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await api.get("/candidate-dashboard", { headers: accountAuthHeader() });
      setData(res.data);
    } catch (err) {
      // Only an authentication failure is allowed to end the account session.
      // Network errors and server failures are recoverable and must not erase a
      // valid login or bounce the candidate out of their dashboard flow.
      if (err.response?.status === 401) {
        clearAccountAuth();
        setError("Your session has expired. Please log in again.");
        if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = setTimeout(() => navigate("/login", { replace: true }), 1200);
        return;
      }
      setError(err.response?.data?.error || "We couldn't load your dashboard. Please try again.");
    }
  }, [navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const nowFn = useServerClock(data?.serverTime);
  const now = nowFn();

  const [selectedApplyJob, setSelectedApplyJob] = useState(null);
  const [exporting, setExporting] = useState(false);

  const handleDownloadData = async () => {
    try {
      setExporting(true);
      const res = await api.get("/candidate-dashboard/profile/export-data", {
        headers: accountAuthHeader(),
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `AptusHire-Data-Export-${Date.now()}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setExporting(false);
    }
  };

  const [greeting, setGreeting] = useState(() => indianGreeting());

  useEffect(() => {
    const updateGreeting = () => setGreeting(indianGreeting());
    const id = setInterval(updateGreeting, 60_000);
    return () => clearInterval(id);
  }, []);

  // Live-refresh when an admin moves this candidate's stage — no page refresh
  // required (Module 11 realtime requirement).
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onStage = () => load();
    socket.on("candidate:stage", onStage);
    return () => socket.off("candidate:stage", onStage);
  }, [load]);

  // A resend/reschedule rotates the session's token and expiry without
  // touching the application's stage, so the "candidate:stage" event above
  // never fires for it. Without this, the toast from NotificationContext says
  // a fresh link exists, but the "Needs you" card and Interviews list here
  // keep showing the old, already-expired one until a manual reload.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onNotification = (notification) => {
      if (notification?.type === "interview_invite") load();
    };
    socket.on("notification:new", onNotification);
    return () => socket.off("notification:new", onNotification);
  }, [load]);

  async function markNotificationRead(id) {
    await api.patch(`/notifications/${id}/read`, {}, { headers: accountAuthHeader() });
    await load();
  }

  // Enter this session's portal using the account as proof of ownership. The
  // server re-checks that this account's email owns the application and applies
  // the same expiry/cancellation rules the emailed link would, then returns the
  // portal's own short-lived token. The emailed link keeps working: nothing is
  // rotated here.
  //
  // The previous portal session is cleared first — the stored jobTitle/token may
  // belong to a different interview, and carrying it over would label this one
  // with the wrong job.
  async function openSession(action) {
    if (!action?.sessionId) return;
    setOpeningId(action.sessionId);
    setOpenError("");
    try {
      const res = await api.post(
        `/candidate-dashboard/sessions/${action.kind}/${action.sessionId}/open`,
        {},
        { headers: accountAuthHeader() }
      );
      const identity = {
        jwt: res.data.token,
        jobTitle: res.data.session?.jobTitle,
        candidateName: res.data.session?.candidateName,
      };
      if (action.kind === "interview") {
        clearPortalAuth();
        savePortalAuth(identity);
        navigate("/portal/dashboard");
      } else {
        clearAssessmentAuth();
        saveAssessmentAuth(identity);
        navigate("/assessment-portal/hub");
      }
    } catch (err) {
      // Includes the honest refusals — expired, cancelled — in the portal's own
      // words, so the dashboard never promises a way in that does not exist.
      setOpenError(err?.response?.data?.error || "We couldn't open that right now. Please try again shortly.");
      setOpeningId(null);
      await load();
    }
  }

  const applicationsById = useMemo(() => {
    const map = new Map();
    for (const a of data?.appliedJobs || []) map.set(String(a._id), a);
    return map;
  }, [data]);

  // Which sessions can be entered right now, keyed by session id. The server
  // decides this (canOpen) rather than the browser re-deriving it from status +
  // expiry — a device with a skewed clock must not be the thing that offers, or
  // withholds, a way into an interview.
  const openableSessions = useMemo(() => {
    const map = new Map();
    for (const entry of data?.nextActions || []) {
      for (const action of entry.actions || []) {
        if (action.canOpen && action.sessionId) map.set(String(action.sessionId), action);
      }
    }
    return map;
  }, [data]);

  const nextByApplication = useMemo(() => {
    const map = new Map();
    for (const n of data?.nextActions || []) map.set(String(n.applicationId), n);
    return map;
  }, [data]);

  // Everything the candidate is personally blocking, across all applications,
  // most urgent first. This is the whole point of the screen.
  const needsYou = useMemo(() => {
    const rows = [];
    for (const entry of data?.nextActions || []) {
      const application = applicationsById.get(String(entry.applicationId));
      for (const action of entry.actions || []) {
        if (action.owner !== "candidate") continue;
        rows.push({ action, application });
      }
      // Offers have no session object, so they only appear as `primary`.
      if (entry.primary?.owner === "candidate" && entry.primary.kind === "offer") {
        rows.push({ action: entry.primary, application });
      }
    }
    const rank = { missed: 0, in_progress: 1, due: 2 };
    return rows.sort((a, b) => {
      const r = (rank[a.action.state] ?? 9) - (rank[b.action.state] ?? 9);
      if (r !== 0) return r;
      const at = a.action.dueAt ? new Date(a.action.dueAt).getTime() : Infinity;
      const bt = b.action.dueAt ? new Date(b.action.dueAt).getTime() : Infinity;
      return at - bt;
    });
  }, [data, applicationsById]);

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">My Dashboard</h1>
        <Card role="alert" className="border-red-200 bg-red-50">
          <p className="flex items-start gap-2.5 text-sm font-semibold text-[#C0392B]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
          <Button type="button" size="sm" variant="outline" className="mt-4" onClick={load}>
            Try again
          </Button>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      // The shape of the page that is about to arrive, not two generic blocks.
      // A skeleton that does not match what loads is just a second layout shift
      // wearing a loading costume.
      <div className="space-y-6" aria-busy="true">
        <p className="sr-only" role="status">
          Loading your dashboard…
        </p>

        <div className="space-y-2">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>

        <Card>
          <Skeleton className="h-5 w-28" />
          <Skeleton className="mt-4 h-20 w-full rounded-2xl" />
          <Skeleton className="mt-3 h-20 w-full rounded-2xl" />
        </Card>

        <Card>
          <Skeleton className="h-5 w-40" />
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {["assessments", "interviews", "resume", "notifications"].map((key) => (
            <Card key={key}>
              <Skeleton className="h-5 w-36" />
              <Skeleton className="mt-4 h-16 w-full" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const pct = data.profile.profileCompletionPercent;
  const applications = data.appliedJobs || [];
  const activeApplications = applications.filter((a) => !isRejected(a.status));
  const interviewCount = (data.upcomingInterviews?.length || 0) + (data.aiInterviewHistory?.length || 0);
  const pipeline = [
    { key: "applied", label: "Applied" },
    { key: "screening", label: "Screening" },
    { key: "interview", label: "Interview" },
    { key: "shortlisted", label: "Shortlisted" },
    { key: "rejected", label: "Rejected" },
  ].map((stage) => ({
    ...stage,
    count: applications.filter((application) => applicationPipelineBucket(application.status) === stage.key).length,
  }));

  return (
    <div className="candidate-dashboard space-y-6 text-[#FF6B2C]">
      <section className="flex flex-col justify-between gap-4 rounded-2xl border border-[#E8E8E4] bg-white p-6 text-[#1A1A1A] shadow-[0_1px_4px_rgba(27,67,50,0.07)] sm:flex-row sm:items-end sm:p-8">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6B6B]">Candidate dashboard</p>
          <h1 className="mt-2 text-2xl font-bold text-[#1A1A1A]">{greeting}, {user?.name || "Candidate"} <span aria-hidden="true">👋</span></h1>
          <p className="mt-2 text-sm text-[#6B6B6B]">Here's your hiring progress.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/profile" className="rounded-[9px] border border-[#FFCAAF] bg-[#FFE8DC] px-3 py-2 text-xs font-semibold text-[#FF6B2C] hover:bg-[#D2ECC9]">Profile completion: {pct}%</Link>
          <button onClick={handleDownloadData} disabled={exporting} className="inline-flex items-center gap-2 rounded-[9px] bg-[#FF6B2C] px-4 py-2 text-xs font-semibold text-white shadow-[0_1px_4px_rgba(27,67,50,0.07)] transition-colors hover:bg-[#FF6B2C]-dark"><Download className="h-4 w-4" /><span>{exporting ? "Exporting…" : "Download My Data"}</span></button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Hiring progress summary">
        {[
          { label: "Applications", value: applications.length, detail: "Total submitted", icon: Briefcase },
          { label: "Interviews", value: interviewCount, detail: "Scheduled or completed", icon: Video },
          { label: "Profile completion", value: pct, detail: "Profile strength", icon: UserRound },
        ].map(({ label, value, detail, icon: Icon }) => (
          <Card key={label} className="border-[#E8E8E4] !bg-white p-5 text-[#1A1A1A] shadow-xs dark:border-[#E8E8E4] ">
            <div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold text-[#6B6B6B]">{label}</span><Icon className="h-4 w-4 text-[#FF6B2C]" aria-hidden="true" /></div>
            <p className="mt-3 text-3xl font-bold text-[#FF6B2C]">{value}{label === "Profile completion" ? "%" : ""}</p>
            <p className="mt-1 text-xs text-[#6B6B6B]">{detail}</p>
          </Card>
        ))}
      </section>

      <SectionCard id="pipeline" title="Application pipeline" icon={ListChecks} description="A current count of your applications by stage.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {pipeline.map((stage) => <div key={stage.key} className="rounded-xl border border-[#E8E8E4] bg-white p-4"><p className="text-[11px] font-semibold uppercase tracking-wide text-[#6B6B6B]">{stage.label}</p><p className="mt-2 text-2xl font-bold text-[#FF6B2C]">{stage.count}</p></div>)}
        </div>
      </SectionCard>

      {/* Quick Navigation Chips */}
      <ChipRow label="Jump to">
        <Chip as={Link} to="/" icon={Search}>
          Find Roles
        </Chip>
        <Chip as={Link} to="/profile" icon={UserRound}>
          My Profile &amp; Trust
        </Chip>
        <Chip as={Link} to="/notifications" icon={Bell}>
          Notifications
        </Chip>
      </ChipRow>

      {/* Brand, not ember — the opposite call from the recruiter dashboard, and
          for a reason specific to this screen. "Still open" is a state, and the
          list directly below it states per-application stages in the reserved
          pending amber. An ember panel sitting on top of that column is exactly
          the adjacency the containment rule exists to prevent.

          The basis line is required by the component and earns its place here:
          "3" means nothing without "of 7 you've submitted". */}
      {data.appliedJobs.length > 0 && (
        <HeroStat
          tone="brand"
          label="Applications still open"
          value={activeApplications.length}
          basis={`Of ${data.appliedJobs.length} you've submitted. An application counts as open until a decision is recorded — closed ones stay in the list below with their outcome.`}
          action={
            <Button as={Link} to="/" size="sm" variant="secondary">
              Browse more roles
            </Button>
          }
        />
      )}

      {/* Brand tone on the card below, never ember or amber: this is the
          candidate's own to-do list, and the reserved pending channel means "a
          recruiter has not got to you yet". Those two must not look alike — one
          is work you can do now, the other is waiting you cannot affect. */}
      {needsYou.length > 0 ? (
        <Card as="section" tone="brand">
          <div className="flex min-w-0 items-start gap-3">
            <IconTile icon={ListChecks} size="sm" />
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                Needs you
                <Badge tone="brand">{needsYou.length}</Badge>
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                These are waiting on you. Deadlines are shown in your local time.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {needsYou.map(({ action, application }) => (
              <ActionRow
                key={`${action.kind}-${action.sessionId || application?._id}`}
                action={action}
                jobTitle={application?.job?.title}
                companyName={application?.job?.company?.name}
                now={now}
                onOpen={openSession}
                opening={openingId === action.sessionId}
              />
            ))}
          </div>
        </Card>
      ) : (
        data.appliedJobs.length > 0 && (
          <Card as="section" className="border-emerald-200 bg-emerald-50/50">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FFE8DC] text-[#FF6B2C]">
                <CircleCheck className="h-4.5 w-4.5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Nothing needs you right now</h2>
                <p className="mt-0.5 text-sm text-slate-600">
                  Every open application is with the hiring team. You'll be emailed and notified here the moment
                  that changes.
                </p>
              </div>
            </div>
          </Card>
        )
      )}

      <SectionCard
        id="applications"
        title="Your applications"
        icon={ListChecks}
        action={
          activeApplications.length > 0 ? (
            <span className="text-xs text-slate-500">
              {activeApplications.length} active · {data.appliedJobs.length} total
            </span>
          ) : null
        }
      >
        {data.appliedJobs.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="No applications yet"
            description="Apply to a job and you'll be able to track exactly where it stands — and what's waiting on who."
            action={
              <Link to="/">
                <Button size="sm" variant="orange">Browse open roles</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {data.appliedJobs.map((application) => (
              <ApplicationCard
                key={application._id}
                application={application}
                next={nextByApplication.get(String(application._id))}
                now={now}
                onOpen={openSession}
                openingId={openingId}
              />
            ))}
          </div>
        )}
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard id="interviews" title="Interviews" icon={Video}>
          {data.upcomingInterviews.length === 0 && data.aiInterviewHistory.length === 0 ? (
            <p className="text-sm text-slate-500">No interviews scheduled yet.</p>
          ) : (
            <div className="space-y-3">
              {[...data.upcomingInterviews, ...data.aiInterviewHistory].map((s) => (
                <div key={s._id} className="rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-[#FFCAAF]">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate text-sm font-semibold text-slate-800">{s.job?.title}</p>
                    <Badge tone={s.status === "completed" ? "green" : s.status === "expired" ? "red" : "brand"}>
                      {sessionStatusLabel(s.status)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{formatAbsolute(s.interviewAt)}</p>
                  {openableSessions.has(String(s._id)) && (
                    <Button
                      size="sm"
                      variant="orange"
                      className="mt-2"
                      loading={openingId === s._id}
                      onClick={() => openSession(openableSessions.get(String(s._id)))}
                    >
                      {openLabel(openableSessions.get(String(s._id)))} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Notifications" icon={Bell}>
          {data.notifications.length === 0 && <p className="text-sm text-slate-500">No notifications yet.</p>}
          <div className="space-y-3">
            {data.notifications.slice(0, 5).map((n) => (
              <div key={n._id} className="rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-[#FFCAAF]">
                <p className="text-sm font-semibold text-slate-800">{n.title}</p>
                <p className="text-xs text-slate-500">{n.message}</p>
                {!n.read && (
                  <button
                    type="button"
                    onClick={() => markNotificationRead(n._id)}
                    className={`${INLINE_ACTION} mt-1 text-[#FF6B2C] hover:bg-[#FFE8DC] hover:underline focus-visible:ring-brand-300`}
                  >
                    Mark as read
                    {/* Three notifications in a row all offering "Mark as read"
                        is unnavigable by voice or by screen reader without this. */}
                    <span className="sr-only">: {n.title}</span>
                  </button>
                )}
              </div>
            ))}
          </div>
          <Link to="/notifications">
            <Button variant="outline" size="sm" className="mt-3">
              View All Notifications
            </Button>
          </Link>
        </SectionCard>

      </div>

      <SectionCard title="Past interviews" icon={History}>
        {data.aiInterviewHistory.length === 0 ? (
          <p className="text-sm text-slate-500">No past interviews yet.</p>
        ) : (
          <div className="space-y-3">
            {data.aiInterviewHistory.map((s) => (
              <div key={s._id} className="flex items-center justify-between gap-2 rounded-xl border border-[#E8E8E4] !bg-white p-4 transition-colors hover:border-[#FFCAAF] dark:border-[#E8E8E4] ">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{s.job?.title}</p>
                  <p className="truncate text-xs text-slate-500">{formatAbsolute(s.interviewAt)}</p>
                </div>
                <Badge tone={s.status === "completed" ? "green" : "slate"}>{sessionStatusLabel(s.status)}</Badge>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* 12-Week Application & Interview Activity Heatmap */}
      <ActivityHeatmap
        applications={data.appliedJobs || []}
        interviews={[...(data.upcomingInterviews || []), ...(data.aiInterviewHistory || [])]}
      />

      {/* Apply with Resume Version Modal */}
      {selectedApplyJob && (
        <ApplyVersionModal
          job={selectedApplyJob}
          isOpen={Boolean(selectedApplyJob)}
          onClose={() => setSelectedApplyJob(null)}
          onSuccess={() => {
            load();
          }}
        />
      )}
    </div>
  );
}
