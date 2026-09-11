/* =============================================================
   CandidateDashboard.jsx  —  /dashboard
   Exact match to the screenshot. Contains only:
     1. Hero welcome card (greeting + profile % + download btn)
     2. Three stat cards (Applications · Interviews · Profile Strength)
     3. Application Pipeline (5 stage buckets)
     4. Quick-nav chips (Find Roles · My Profile & Trust · Notifications)
     5. Your applications (2-col job cards)
     6. Bottom CTA banner (assessments)
     7. Footer
   All other sections removed.
   ============================================================= */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle, ArrowRight, Bell, Bookmark, Briefcase,
  ChevronRight, ClipboardList, Download, Search, Star,
  UserRound, Video, Zap,
} from "lucide-react";
import api from "../api/client.js";
import { accountAuthHeader, clearAccountAuth } from "../auth/accountAuth.js";
import { useAccountAuth } from "../auth/useAccountAuth.js";
import { saveAuth as savePortalAuth, clearAuth as clearPortalAuth } from "../portal/portalAuth.js";
import { saveAuth as saveAssessmentAuth, clearAuth as clearAssessmentAuth } from "../portal/assessmentAuth.js";
import { getSocket } from "../lib/socket.js";
import { isRejected } from "../lib/pipeline.js";

/* ─── design tokens ─────────────────────────────────────────────── */
const OR   = "#F97316";   // primary orange
const OR_S = "#FEF3E8";   // orange soft bg
const OR_D = "#EA6C0A";   // orange dark (hover)
const NV   = "#1B2A3B";   // navy (dark stat card / pipeline icon / banner)
const BD   = "#E2E8F0";   // border
const TX   = "#0F172A";   // body text dark
const MT   = "#64748B";   // muted text
const FT   = "#94A3B8";   // faint text
const WH   = "#FFFFFF";   // white
const CV   = "#F4F6F9";   // canvas bg

/* ─── helpers ────────────────────────────────────────────────────── */
function useServerClock(serverTime) {
  const [offset, setOffset] = useState(0);
  const [tick,   setTick]   = useState(0);
  useEffect(() => { if (serverTime) setOffset(new Date(serverTime).getTime() - Date.now()); }, [serverTime]);
  useEffect(() => { const id = setInterval(() => setTick(t => t + 1), 60_000); return () => clearInterval(id); }, []);
  return useCallback(() => Date.now() + offset, [offset, tick]);
}

function indianGreeting(now = new Date()) {
  const h = Number(new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata", hour: "numeric", hourCycle: "h23",
  }).format(now));
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function timeAgoShort(ds) {
  if (!ds) return "";
  const d = Math.floor((Date.now() - new Date(ds).getTime()) / 86_400_000);
  if (d === 0) return "Today";
  if (d === 1) return "1 day ago";
  if (d < 7)  return `${d} days ago`;
  return `${Math.floor(d / 7)}w ago`;
}

function pipelineBucket(status) {
  if (isRejected(status)) return "rejected";
  if (status === "shortlisted") return "shortlisted";
  if (["interview_scheduled","ai_interview_completed","hr_interview","technical_interview","manager_interview"].includes(status))
    return "interview";
  if (["ats_passed","assessment_scheduled","assessment_completed","under_review"].includes(status))
    return "screening";
  return "applied";
}

/* ─── tiny primitives ─────────────────────────────────────────────── */

// White card with subtle border + shadow
const Card = ({ children, style }) => (
  <div style={{
    background: WH, border: `1px solid ${BD}`, borderRadius: 12, padding: 20,
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    ...style,
  }}>
    {children}
  </div>
);

// Dark navy card (Applications stat)
const NavyCard = ({ children, style }) => (
  <div style={{
    background: NV, borderRadius: 12, padding: 20,
    boxShadow: "0 2px 8px rgba(27,42,59,0.18)",
    ...style,
  }}>
    {children}
  </div>
);

// Orange filled button
const OrangeBtn = ({ children, onClick, loading, style, to, as: As }) => {
  const base = {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    gap: 7, height: 38, padding: "0 18px", borderRadius: 8,
    background: loading ? OR_D : OR, color: WH,
    border: "none", cursor: "pointer",
    fontSize: 13, fontWeight: 600, textDecoration: "none",
    transition: "opacity 0.15s", whiteSpace: "nowrap",
    ...style,
  };
  if (to) return <Link to={to} style={base}>{children}</Link>;
  return <button type="button" onClick={onClick} disabled={loading} style={base}>{children}</button>;
};

// Pill badge
const Badge = ({ children, color = OR, bg = OR_S, border = "transparent" }) => (
  <span style={{
    display: "inline-flex", alignItems: "center",
    borderRadius: 999, padding: "2px 8px",
    fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase",
    color, background: bg, border: `1px solid ${border}`,
  }}>
    {children}
  </span>
);

// Skill tag
const Tag = ({ children, accent }) => (
  <span style={{
    display: "inline-block", padding: "3px 10px", borderRadius: 6,
    fontSize: 12, fontWeight: 500,
    background: accent ? "#EFF6FF" : "#F1F5F9",
    color:      accent ? "#3B82F6" : "#475569",
    border:     `1px solid ${accent ? "#BFDBFE" : BD}`,
  }}>
    {children}
  </span>
);

// Quick-nav chip
const Chip = ({ icon: Icon, children, to, dot }) => (
  <Link to={to} style={{
    display: "inline-flex", alignItems: "center", gap: 7,
    height: 36, padding: "0 14px", borderRadius: 8,
    background: WH, border: `1px solid ${BD}`,
    color: "#334155", fontSize: 13, fontWeight: 500,
    textDecoration: "none", whiteSpace: "nowrap",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  }}>
    <Icon style={{ width: 14, height: 14, color: MT }} />
    {children}
    {dot && <span style={{ width: 7, height: 7, borderRadius: "50%", background: OR, flexShrink: 0 }} />}
  </Link>
);

/* ─── Skeleton loader ─────────────────────────────────────────────── */
const Sk = ({ w = "100%", h = 16, r = 6 }) => (
  <div style={{
    width: w, height: h, borderRadius: r,
    background: "#E2E8F0",
    animation: "skPulse 1.4s ease-in-out infinite",
  }} />
);

/* ─── Application card ─────────────────────────────────────────────── */
function AppCard({ application }) {
  const job       = application.job || {};
  const isRemote  = ["remote","hybrid"].includes((job.workplaceType || application.workplaceType || "").toLowerCase());
  const isFullTime = (job.jobType || job.employmentType || "full").toLowerCase().includes("full");
  const typeLabel  = isRemote ? "REMOTE" : "FULL-TIME";
  const typeStyle  = isRemote
    ? { color: "#16A34A", bg: "#F0FDF4", border: "#BBF7D0" }
    : { color: "#6366F1", bg: "#EEF2FF", border: "#C7D2FE" };

  const title    = job.title   || application.title   || "Job Application";
  const company  = job.company?.name || application.company?.name || "";
  const location = [company, job.location || application.location].filter(Boolean).join(" • ");
  const skills   = job.requiredSkills || application.requiredSkills || [];
  const applied  = application.appliedAt || application.createdAt;

  return (
    <div style={{
      border: `1px solid ${BD}`, borderRadius: 10, padding: 16, background: WH,
    }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
        <div>
          <Badge color={typeStyle.color} bg={typeStyle.bg} border={typeStyle.border}>
            {typeLabel}
          </Badge>
          <p style={{ fontSize: 14, fontWeight: 700, color: TX, marginTop: 6, lineHeight: 1.3 }}>{title}</p>
          <p style={{ fontSize: 12, color: MT, marginTop: 3 }}>{location || company}</p>
        </div>
        <button style={{ background: "none", border: "none", cursor: "pointer", color: FT, padding: 2, flexShrink: 0 }}>
          <Bookmark style={{ width: 16, height: 16 }} />
        </button>
      </div>

      {/* skills */}
      {skills.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
          {skills.slice(0, 5).map((s, i) => (
            <Tag key={s} accent={i === 3}>{s}</Tag>
          ))}
        </div>
      )}

      {/* footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: `1px solid ${BD}` }}>
        <span style={{ fontSize: 12, color: FT }}>Applied {timeAgoShort(applied)}</span>
        <Link to={`/jobs/${job.slug || job._id || ""}`} style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          fontSize: 13, fontWeight: 600, color: TX, textDecoration: "none",
          border: `1px solid ${BD}`, borderRadius: 6, padding: "4px 12px",
        }}>
          View Details <ChevronRight style={{ width: 13, height: 13 }} />
        </Link>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
export default function CandidateDashboard() {
  const navigate = useNavigate();
  const { user } = useAccountAuth();
  const [data,      setData]      = useState(null);
  const [error,     setError]     = useState("");
  const [exporting, setExporting] = useState(false);
  const [greeting,  setGreeting]  = useState(() => indianGreeting());
  const timerRef = useRef(null);

  /* ── fetch ── */
  const load = useCallback(async () => {
    setError("");
    try {
      const res = await api.get("/candidate-dashboard", { headers: accountAuthHeader() });
      setData(res.data);
    } catch (err) {
      if (err.response?.status === 401) {
        clearAccountAuth();
        setError("Session expired. Redirecting to login…");
        timerRef.current = setTimeout(() => navigate("/login", { replace: true }), 1200);
        return;
      }
      setError(err.response?.data?.error || "Couldn't load your dashboard. Please try again.");
    }
  }, [navigate]);

  useEffect(() => {
    load();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [load]);

  /* ── greeting clock ── */
  useEffect(() => {
    const id = setInterval(() => setGreeting(indianGreeting()), 60_000);
    return () => clearInterval(id);
  }, []);

  /* ── realtime stage/notification refresh ── */
  useEffect(() => {
    const socket = getSocket(); if (!socket) return;
    const fn = () => load();
    socket.on("candidate:stage", fn);
    return () => socket.off("candidate:stage", fn);
  }, [load]);

  useEffect(() => {
    const socket = getSocket(); if (!socket) return;
    const fn = (n) => { if (n?.type === "interview_invite") load(); };
    socket.on("notification:new", fn);
    return () => socket.off("notification:new", fn);
  }, [load]);

  /* ── data export ── */
  const handleDownload = async () => {
    try {
      setExporting(true);
      const res = await api.get("/candidate-dashboard/profile/export-data", {
        headers: accountAuthHeader(), responseType: "blob",
      });
      const url  = window.URL.createObjectURL(new Blob([res.data]));
      const a    = document.createElement("a");
      a.href = url;
      a.setAttribute("download", `AptusHire-Data-${Date.now()}.json`);
      document.body.appendChild(a); a.click(); a.remove();
    } catch (e) { console.error(e); }
    finally { setExporting(false); }
  };

  const nowFn = useServerClock(data?.serverTime);

  /* ── error ── */
  if (error) return (
    <div style={{ padding: 32 }}>
      <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 12, padding: 20 }}>
        <p style={{ color: "#DC2626", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
          <AlertTriangle style={{ width: 16, height: 16 }} />{error}
        </p>
        <button onClick={load} style={{ marginTop: 12, padding: "6px 16px", borderRadius: 8, border: `1px solid ${BD}`, background: WH, cursor: "pointer", fontSize: 13 }}>
          Try again
        </button>
      </div>
    </div>
  );

  /* ── skeleton ── */
  if (!data) return (
    <>
      <style>{`@keyframes skPulse{0%,100%{opacity:1}50%{opacity:.45}}`}</style>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }} aria-busy="true">
        <p className="sr-only" role="status">Loading your dashboard…</p>
        {/* hero */}
        <div style={{ background: WH, border:`1px solid ${BD}`, borderRadius: 12, padding: 20 }}>
          <Sk w="50%" h={14} r={4} /><div style={{marginTop:10}}><Sk w="70%" h={28} r={6}/></div>
          <div style={{marginTop:8}}><Sk w="40%" h={14} r={4}/></div>
        </div>
        {/* stat cards */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
          {[1,2,3].map(i=><div key={i} style={{borderRadius:12,padding:20,background:i===1?NV:WH,border:`1px solid ${BD}`}}><Sk w="60%" h={12} r={4}/><div style={{marginTop:12}}><Sk w="30%" h={36} r={6}/></div></div>)}
        </div>
        {/* pipeline */}
        <div style={{background:WH,border:`1px solid ${BD}`,borderRadius:12,padding:20}}>
          <Sk w="40%" h={16} r={4}/><div style={{marginTop:16,display:"flex",gap:12}}>{[1,2,3,4,5].map(i=><div key={i} style={{flex:1}}><Sk h={12} r={3}/><div style={{marginTop:8}}><Sk h={28} r={4}/></div></div>)}</div>
        </div>
        {/* chips */}
        <div style={{display:"flex",gap:8}}>{[1,2,3].map(i=><Sk key={i} w={120} h={36} r={8}/>)}</div>
        {/* apps */}
        <div style={{background:WH,border:`1px solid ${BD}`,borderRadius:12,padding:20}}>
          <Sk w="30%" h={16} r={4}/><div style={{marginTop:16,display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12}}>{[1,2].map(i=><Sk key={i} h={140} r={10}/>)}</div>
        </div>
      </div>
    </>
  );

  /* ── derived data ── */
  const pct          = data.profile?.profileCompletionPercent ?? 0;
  const applications = data.appliedJobs || [];
  const interviews   = (data.upcomingInterviews?.length || 0) + (data.aiInterviewHistory?.length || 0);
  const hasUnreadNotif = (data.notifications || []).some(n => !n.read);
  const displayName  = user?.name || data.profile?.name || "Candidate";

  const STAGES = [
    { key: "applied",     label: "APPLIED"     },
    { key: "screening",   label: "SCREENING"   },
    { key: "interview",   label: "INTERVIEW"   },
    { key: "shortlisted", label: "SHORTLISTED" },
    { key: "rejected",    label: "REJECTED"    },
  ];
  const pipelineCounts = STAGES.map(s => ({
    ...s,
    count: applications.filter(a => !a.pipelineExit && pipelineBucket(a.status) === s.key).length,
  }));

  /* ═══════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════ */
  return (
    <>
      {/* keyframes for pulse animations */}
      <style>{`
        @keyframes skPulse{0%,100%{opacity:1}50%{opacity:.45}}
        @keyframes livePing{0%,100%{opacity:.6;transform:scale(1)}50%{opacity:1;transform:scale(1.6)}}
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ══════════════════════════════════════════
            1. HERO WELCOME CARD
        ══════════════════════════════════════════ */}
        <Card>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            {/* left: label + greeting + sub */}
            <div style={{ flex: 1, minWidth: 200 }}>
              {/* "● CANDIDATE DASHBOARD" label */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: OR, flexShrink: 0 }} />
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
                  textTransform: "uppercase", color: MT,
                }}>
                  Candidate Dashboard
                </span>
              </div>

              <h1 style={{ fontSize: 26, fontWeight: 700, color: TX, lineHeight: 1.2, margin: 0 }}>
                {greeting}, {displayName}{" "}
                <span role="img" aria-label="wave">👋</span>
              </h1>
              <p style={{ fontSize: 13, color: MT, marginTop: 8 }}>
                Here's your hiring progress and recent updates.
              </p>
            </div>

            {/* right: profile completion + download */}
            <div style={{ display: "flex", alignItems: "center", gap: 20, flexShrink: 0 }}>
              {/* Profile completion mini section */}
              <div>
                <p style={{ fontSize: 11, color: MT, marginBottom: 4 }}>Profile completion</p>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: TX }}>{pct}%</span>
                  {/* progress track */}
                  <div style={{ width: 72, height: 6, background: "#E2E8F0", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: OR, borderRadius: 999 }} />
                  </div>
                </div>
              </div>

              {/* Download My Data button */}
              <OrangeBtn onClick={handleDownload} loading={exporting}>
                <Download style={{ width: 13, height: 13 }} />
                {exporting ? "Exporting…" : "Download My Data"}
              </OrangeBtn>
            </div>
          </div>
        </Card>

        {/* ══════════════════════════════════════════
            2. THREE STAT CARDS
        ══════════════════════════════════════════ */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>

          {/* Applications — dark navy */}
          <NavyCard>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#94A3B8" }}>Applications</span>
              {/* briefcase icon box */}
              <div style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(249,115,22,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Briefcase style={{ width: 17, height: 17, color: OR }} />
              </div>
            </div>
            <p style={{ fontSize: 38, fontWeight: 800, color: WH, lineHeight: 1 }}>
              {applications.length}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 10 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: OR, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "#94A3B8" }}>Total submitted applications</span>
            </div>
          </NavyCard>

          {/* Interviews — white */}
          <Card style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: MT }}>Interviews</span>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: OR_S, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Video style={{ width: 17, height: 17, color: OR }} />
              </div>
            </div>
            <p style={{ fontSize: 38, fontWeight: 800, color: TX, lineHeight: 1 }}>{interviews}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 10 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: OR, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: MT }}>Scheduled or completed</span>
            </div>
          </Card>

          {/* Profile Strength — white with star icon */}
          <Card style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: MT }}>Profile Strength</span>
              {/* star — outline, yellow */}
              <Star style={{ width: 18, height: 18, color: "#FCD34D", strokeWidth: 1.5 }} />
            </div>
            <p style={{ fontSize: 38, fontWeight: 800, color: OR, lineHeight: 1 }}>{pct}%</p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
              <span style={{ fontSize: 12, color: MT }}>Profile strength</span>
              <Link to="/profile" style={{
                display: "inline-flex", alignItems: "center", gap: 2,
                fontSize: 12, fontWeight: 600, color: OR, textDecoration: "none",
              }}>
                Complete profile <ChevronRight style={{ width: 12, height: 12 }} />
              </Link>
            </div>
          </Card>
        </div>

        {/* ══════════════════════════════════════════
            3. APPLICATION PIPELINE
        ══════════════════════════════════════════ */}
        <Card>
          {/* header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* navy icon box */}
              <div style={{ width: 32, height: 32, borderRadius: 8, background: NV, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <ClipboardList style={{ width: 16, height: 16, color: WH }} />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: TX }}>Application Pipeline</p>
                <p style={{ fontSize: 12, color: MT }}>A current count of your applications tracked by hiring stage.</p>
              </div>
            </div>
            {/* Live Updates badge */}
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "4px 10px", borderRadius: 6,
              background: "#EFF6FF", color: "#3B82F6", fontSize: 12, fontWeight: 600,
              border: "1px solid #BFDBFE", whiteSpace: "nowrap",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#3B82F6", animation: "livePing 1.4s ease-in-out infinite" }} />
              Live Updates
            </span>
          </div>

          {/* stage columns */}
          <div style={{ display: "flex", gap: 0 }}>
            {pipelineCounts.map((stage, i) => (
              <div key={stage.key} style={{
                flex: 1, paddingLeft: i === 0 ? 0 : 16,
                borderLeft: i > 0 ? `1px solid ${BD}` : "none",
                paddingRight: i < pipelineCounts.length - 1 ? 16 : 0,
              }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: MT, marginBottom: 8 }}>
                  {stage.label}
                </p>
                <p style={{ fontSize: 26, fontWeight: 700, color: TX, lineHeight: 1 }}>{stage.count}</p>
                <div style={{ marginTop: 10, height: 3, background: "#E2E8F0", borderRadius: 999 }} />
              </div>
            ))}
          </div>
        </Card>

        {/* ══════════════════════════════════════════
            4. QUICK-NAV CHIPS
        ══════════════════════════════════════════ */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <Chip icon={Search}    to="/">Find Roles</Chip>
          <Chip icon={UserRound} to="/profile">My Profile &amp; Trust</Chip>
          <Chip icon={Bell}      to="/notifications" dot={hasUnreadNotif}>Notifications</Chip>
        </div>

        {/* ══════════════════════════════════════════
            5. YOUR APPLICATIONS
        ══════════════════════════════════════════ */}
        <Card>
          {/* header row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: NV, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Briefcase style={{ width: 16, height: 16, color: WH }} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: TX }}>Your applications</p>
            </div>
            <Link to="/applied-jobs" style={{
              display: "inline-flex", alignItems: "center", gap: 3,
              fontSize: 13, fontWeight: 600, color: OR, textDecoration: "none",
            }}>
              View All Applications <ChevronRight style={{ width: 13, height: 13 }} />
            </Link>
          </div>

          {/* job cards */}
          {applications.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <Briefcase style={{ width: 40, height: 40, color: "#E2E8F0", margin: "0 auto 12px" }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: TX }}>No applications yet</p>
              <p style={{ fontSize: 13, color: MT, marginTop: 4 }}>Apply to a role to start tracking progress here.</p>
              <Link to="/" style={{
                display: "inline-flex", alignItems: "center", gap: 6, marginTop: 16,
                padding: "8px 20px", borderRadius: 8, background: OR, color: WH,
                fontSize: 13, fontWeight: 600, textDecoration: "none",
              }}>
                Browse open roles <ArrowRight style={{ width: 14, height: 14 }} />
              </Link>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
              {applications.slice(0, 4).map(app => (
                <AppCard key={app._id} application={app} />
              ))}
            </div>
          )}
        </Card>

        {/* ══════════════════════════════════════════
            6. BOTTOM CTA BANNER
        ══════════════════════════════════════════ */}
        <div style={{
          background: NV, borderRadius: 12, padding: "22px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 20, flexWrap: "wrap",
          boxShadow: "0 4px 16px rgba(27,42,59,0.22)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* lightning icon in orange circle */}
            <div style={{
              width: 44, height: 44, borderRadius: 10, flexShrink: 0,
              background: "rgba(249,115,22,0.20)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Zap style={{ width: 22, height: 22, color: OR }} />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: WH, lineHeight: 1.3 }}>
                Be Part of High-Performing Engineering Teams
              </p>
              <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>
                Complete your skill verification assessments to increase profile views by 4×.
              </p>
            </div>
          </div>
          <OrangeBtn to="/assessments" style={{ whiteSpace: "nowrap" }}>
            Explore Assessments <ArrowRight style={{ width: 14, height: 14 }} />
          </OrangeBtn>
        </div>

        {/* ══════════════════════════════════════════
            7. FOOTER
        ══════════════════════════════════════════ */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 8, paddingTop: 16, borderTop: `1px solid ${BD}`,
        }}>
          <p style={{ fontSize: 12, color: FT }}>© 2026 AptusHire Inc. All rights reserved.</p>
          <div style={{ display: "flex", gap: 20 }}>
            {["Privacy Policy", "Terms of Service", "Support Helpdesk"].map(l => (
              <a key={l} href="#" style={{ fontSize: 12, color: FT, textDecoration: "none" }}>{l}</a>
            ))}
          </div>
        </div>

      </div>
    </>
  );
}
