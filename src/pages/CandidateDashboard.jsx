/* =============================================================
   CandidateDashboard.jsx  —  /dashboard
   Content-only redesign (yellow/charcoal design system) matching
   the "AptusHire Candidate Dashboard" reference. The shared sidebar
   and header (AppShell.jsx) are NOT part of this file and keep
   their existing orange/navy styling — this page's own content is:
     1. Hero welcome card (greeting, profile %, actions, illustration)
     2. Three stat cards (Applications · Interviews · Profile Strength)
     3. Application Pipeline (5 stage buckets)
     4. Quick Actions (Find Roles · My Profile & Trust · Notifications)
     5. Recent Activity
   ============================================================= */
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle, ArrowRight, BarChart3, Bell, Briefcase,
  ChevronRight, ClipboardList, Clock, Download, Search,
  UserRound, Video,
} from "lucide-react";
import api from "../api/client.js";
import { accountAuthHeader, clearAccountAuth } from "../auth/accountAuth.js";
import { useAccountAuth } from "../auth/useAccountAuth.js";
import { getSocket } from "../lib/socket.js";
import { isRejected } from "../lib/pipeline.js";

/* ─── design tokens (spec §3/§40) ───────────────────────────────── */
const TXP  = "#111827";  // primary text
const TXS  = "#64748B";  // secondary text
const TXM  = "#94A3B8";  // muted text
const BORD = "#E5E7EB";  // border
const YEL  = "#F5B51B";  // yellow
const YELD = "#E5A514";  // dark yellow
const YELL = "#FFF1C7";  // light yellow
const YELS = "#FFF9E8";  // very light yellow
const DARK = "#172334";  // dark charcoal
const PBG  = "#E7EBEF";  // progress track background
const WH   = "#FFFFFF";
const GRN  = "#65A30D";  // Live Updates dot only

const SHADOW_CARD  = "0 2px 8px rgba(15,23,42,0.04)";
const SHADOW_HOVER = "0 6px 18px rgba(15,23,42,0.07)";

/* ─── helpers ────────────────────────────────────────────────────── */
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

/* ─── primitives ─────────────────────────────────────────────────── */
const Card = ({ children, style }) => (
  <div style={{
    background: WH, border: `1px solid ${BORD}`, borderRadius: 16, padding: 24,
    boxShadow: SHADOW_CARD, transition: "box-shadow 180ms ease",
    ...style,
  }}>
    {children}
  </div>
);

const IconBox = ({ icon: Icon, size = 40, radius = 10, bg = YELL, color = TXP, iconSize = 22 }) => (
  <div style={{
    width: size, height: size, borderRadius: radius, background: bg, flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
  }}>
    <Icon style={{ width: iconSize, height: iconSize, color }} strokeWidth={1.75} />
  </div>
);

function StatCard({ icon, title, value, valueColor = TXP, iconBg, description, action }) {
  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 6, padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 16, fontWeight: 500, color: TXP }}>{title}</span>
        <IconBox icon={icon} bg={iconBg} />
      </div>
      <p style={{ fontSize: 40, fontWeight: 600, color: valueColor, lineHeight: 1, margin: 0 }}>{value}</p>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: 14, color: TXS }}>{description}</span>
        {action}
      </div>
    </Card>
  );
}

function QuickActionCard({ icon, title, description, to, dot }) {
  return (
    <Link to={to} style={{
      display: "flex", alignItems: "center", gap: 12, minHeight: 68,
      background: WH, border: `1px solid ${BORD}`, borderRadius: 12, padding: "12px 16px",
      textDecoration: "none", boxShadow: SHADOW_CARD, transition: "box-shadow 180ms ease",
    }}>
      <div style={{ position: "relative", flexShrink: 0 }}>
        <IconBox icon={icon} size={40} radius={999} iconSize={18} />
        {dot && (
          <span style={{
            position: "absolute", top: -2, right: -2, width: 10, height: 10,
            borderRadius: "50%", background: YELD, border: `2px solid ${WH}`,
          }} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 16, fontWeight: 500, color: TXP, margin: 0 }}>{title}</p>
        <p style={{ fontSize: 14, color: TXS, marginTop: 2 }}>{description}</p>
      </div>
      <ChevronRight style={{ width: 18, height: 18, color: TXM, flexShrink: 0 }} />
    </Link>
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

  useEffect(() => {
    const id = setInterval(() => setGreeting(indianGreeting()), 60_000);
    return () => clearInterval(id);
  }, []);

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

  const handleDownload = async () => {
    try {
      setExporting(true);
      const res = await api.get("/candidate-dashboard/profile/export-data", {
        headers: accountAuthHeader(), responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.setAttribute("download", `AptusHire-Data-${Date.now()}.json`);
      document.body.appendChild(a); a.click(); a.remove();
    } catch (e) { console.error(e); }
    finally { setExporting(false); }
  };

  if (error) return (
    <div style={{ padding: 32 }}>
      <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 16, padding: 20 }}>
        <p style={{ color: "#DC2626", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
          <AlertTriangle style={{ width: 16, height: 16 }} />{error}
        </p>
        <button onClick={load} style={{ marginTop: 12, padding: "6px 16px", borderRadius: 10, border: `1px solid ${BORD}`, background: WH, cursor: "pointer", fontSize: 14 }}>
          Try again
        </button>
      </div>
    </div>
  );

  if (!data) return (
    <>
      <style>{`@keyframes skPulse{0%,100%{opacity:1}50%{opacity:.45}}`}</style>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }} aria-busy="true">
        <p className="sr-only" role="status">Loading your dashboard…</p>
        <div style={{ background: WH, border: `1px solid ${BORD}`, borderRadius: 16, padding: 32, height: 180 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
          {[1, 2, 3].map((i) => <div key={i} style={{ borderRadius: 16, height: 170, background: WH, border: `1px solid ${BORD}` }} />)}
        </div>
        <div style={{ background: WH, border: `1px solid ${BORD}`, borderRadius: 16, height: 195 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
          {[1, 2, 3].map((i) => <div key={i} style={{ borderRadius: 14, height: 100, background: WH, border: `1px solid ${BORD}` }} />)}
        </div>
      </div>
    </>
  );

  const pct          = data.profile?.profileCompletionPercent ?? 0;
  const applications = data.appliedJobs || [];
  const interviews   = (data.upcomingInterviews?.length || 0) + (data.aiInterviewHistory?.length || 0);
  const notifications = data.notifications || [];
  const hasUnreadNotif = notifications.some((n) => !n.read);
  const displayName  = user?.name || data.profile?.name || "Candidate";

  const STAGES = [
    { key: "applied",     label: "Applied"     },
    { key: "screening",   label: "Screening"   },
    { key: "interview",   label: "Interview"   },
    { key: "shortlisted", label: "Shortlisted" },
    { key: "rejected",    label: "Rejected"    },
  ];
  const pipelineCounts = STAGES.map((s) => ({
    ...s,
    count: applications.filter((a) => !a.pipelineExit && pipelineBucket(a.status) === s.key).length,
  }));
  const maxStageCount = Math.max(1, ...pipelineCounts.map((s) => s.count));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ══════ HERO — compact horizontal banner (not a tall card) ══════ */}
      <style>{`
        .dash-hero { flex-wrap: nowrap; }
        @media (max-width: 980px) {
          .dash-hero { flex-wrap: wrap !important; }
          .dash-hero > * { flex-basis: 100% !important; }
        }
      `}</style>
      <div className="dash-hero" style={{
        backgroundImage: `linear-gradient(to right, ${WH} 0%, ${WH} 45%, rgba(255,255,255,0.55) 68%, rgba(255,255,255,0) 88%), url('/hero-banner.png')`,
        backgroundSize: "cover, cover",
        backgroundPosition: "center, right center",
        backgroundRepeat: "no-repeat, no-repeat",
        border: `1px solid ${BORD}`, borderRadius: 14, padding: "12px 24px",
        boxShadow: SHADOW_CARD,
        display: "flex", gap: 20, alignItems: "center", justifyContent: "space-between",
      }}>
        {/* left: eyebrow + greeting + description + actions */}
        <div style={{ flex: "1 1 300px", minWidth: 240 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: YEL, flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.09em", textTransform: "uppercase", color: TXS }}>
              Candidate Dashboard
            </span>
          </div>

          <h1 style={{ fontSize: 30, fontWeight: 500, lineHeight: 1.15, color: TXP, margin: 0 }}>
            {greeting},{" "}
            <span style={{ color: YELD, fontWeight: 600 }}>{displayName}</span> <span role="img" aria-label="wave">👋</span>
          </h1>
          <p style={{ fontSize: 14, fontWeight: 400, color: TXS, marginTop: 4 }}>
            Here's your hiring progress and recent updates.
          </p>

          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <Link to="/?recommended=1" style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
              height: 36, padding: "0 16px", borderRadius: 8,
              background: DARK, color: WH, fontSize: 14, fontWeight: 500, textDecoration: "none", whiteSpace: "nowrap",
            }}>
              Find Jobs <ArrowRight style={{ width: 15, height: 15 }} />
            </Link>
            <Link to="/profile" style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              height: 36, padding: "0 16px", borderRadius: 8,
              background: WH, border: `1px solid ${BORD}`, color: TXP, fontSize: 14, fontWeight: 500, textDecoration: "none", whiteSpace: "nowrap",
            }}>
              Update Profile
            </Link>
          </div>
        </div>

        {/* middle: profile completion + download */}
        <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", gap: 6, minWidth: 170 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 500, color: TXS, marginBottom: 4 }}>Profile completion</p>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 28, fontWeight: 600, color: TXP }}>{pct}%</span>
              <div style={{ width: 110, height: 7, background: BORD, borderRadius: 999, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: YEL, borderRadius: 999 }} />
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDownload}
            disabled={exporting}
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
              height: 36, padding: "0 14px", borderRadius: 9,
              background: exporting ? YELD : YEL, color: TXP, border: "none", cursor: "pointer",
              fontSize: 14, fontWeight: 500, whiteSpace: "nowrap",
            }}
          >
            <Download style={{ width: 14, height: 14 }} />
            {exporting ? "Exporting…" : "Download My Data"}
          </button>
        </div>

        {/* right: motivational quote (illustration now lives in the hero background) */}
        <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 19, fontWeight: 400, color: TXP, lineHeight: 1.25, margin: 0, maxWidth: 190 }}>
              &ldquo;Progress today, a brighter tomorrow.&rdquo;
            </p>
            <span style={{ display: "block", width: 42, height: 3, background: YEL, borderRadius: 999, marginTop: 6 }} />
          </div>
        </div>
      </div>

      {/* ══════ STAT CARDS ══════ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
        <StatCard
          icon={Briefcase}
          title="Applications"
          value={applications.length}
          description="Total submitted applications"
          action={<ChevronRight style={{ width: 16, height: 16, color: TXM }} />}
        />
        <StatCard
          icon={Video}
          title="Interviews"
          value={interviews}
          iconBg="#F1F5F9"
          description="Scheduled or completed"
          action={<ChevronRight style={{ width: 16, height: 16, color: TXM }} />}
        />
        <StatCard
          icon={BarChart3}
          title="Profile Strength"
          value={`${pct}%`}
          valueColor={YELD}
          description="Profile strength"
          action={
            <Link to="/profile" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: "50%", background: YELL }}>
              <ChevronRight style={{ width: 15, height: 15, color: TXP }} />
            </Link>
          }
        />
      </div>

      {/* ══════ APPLICATION PIPELINE ══════ */}
      <Card style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <IconBox icon={ClipboardList} bg={DARK} color={WH} />
            <div>
              <p style={{ fontSize: 20, fontWeight: 600, color: TXP, margin: 0 }}>Application Pipeline</p>
              <p style={{ fontSize: 14, color: TXS, marginTop: 2 }}>A current count of your applications tracked by hiring stage.</p>
            </div>
          </div>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            height: 32, padding: "0 14px", borderRadius: 10,
            background: "#F7F8F9", border: `1px solid ${BORD}`, fontSize: 14, fontWeight: 500, color: TXP,
            whiteSpace: "nowrap",
          }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: GRN, flexShrink: 0 }} />
            Live Updates
          </span>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 0 }}>
          {pipelineCounts.map((stage, i) => (
            <div key={stage.key} style={{
              flex: "1 1 18%", minWidth: 110,
              paddingLeft: i === 0 ? 0 : 16,
              borderLeft: i > 0 ? `1px solid ${BORD}` : "none",
              paddingRight: 16,
            }}>
              <p style={{ fontSize: 12, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", color: TXS, marginBottom: 4 }}>
                {stage.label}
              </p>
              <p style={{ fontSize: 30, fontWeight: 600, color: TXP, lineHeight: 1, margin: 0 }}>{stage.count}</p>
              <div style={{ marginTop: 8, height: 6, background: PBG, borderRadius: 999, overflow: "hidden" }}>
                <div style={{ width: `${(stage.count / maxStageCount) * 100}%`, height: "100%", background: YEL, borderRadius: 999 }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ══════ QUICK ACTIONS ══════ */}
      <div>
        <p style={{ fontSize: 22, fontWeight: 600, color: TXP, margin: "0 0 10px" }}>Quick Actions</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
          <QuickActionCard icon={Search} title="Find Roles" description="Explore new opportunities" to="/?recommended=1" />
          <QuickActionCard icon={UserRound} title="My Profile & Trust" description="Keep your profile updated" to="/profile" />
          <QuickActionCard icon={Bell} title="Notifications" description="Stay up to date" to="/notifications" dot={hasUnreadNotif} />
        </div>
      </div>

      {/* ══════ RECENT ACTIVITY ══════ */}
      <Card style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: notifications.length ? 8 : 0 }}>
          <p style={{ fontSize: 18, fontWeight: 500, color: TXP, margin: 0 }}>Recent Activity</p>
          {notifications.length > 0 && (
            <Link to="/notifications" style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 14, fontWeight: 500, color: YELD, textDecoration: "none" }}>
              View all <ChevronRight style={{ width: 14, height: 14 }} />
            </Link>
          )}
        </div>

        {notifications.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "12px 0" }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#F1F3F5", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
              <Clock style={{ width: 20, height: 20, color: TXM }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 500, color: TXP, margin: 0 }}>No recent activity</p>
            <p style={{ fontSize: 14, color: TXS, marginTop: 4 }}>Your latest updates will appear here.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {notifications.slice(0, 4).map((n, i) => (
              <div key={n._id || i} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
                borderTop: i === 0 ? "none" : `1px solid ${BORD}`,
              }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#F1F3F5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Bell style={{ width: 15, height: 15, color: TXS }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 15, color: TXP, margin: 0, fontWeight: n.read ? 400 : 500 }}>{n.message || n.title || "Update"}</p>
                </div>
                <span style={{ fontSize: 13, color: TXM, flexShrink: 0 }}>{timeAgoShort(n.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
