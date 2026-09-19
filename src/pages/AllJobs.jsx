/* =============================================================
   AllJobs.jsx  —  /jobs
   Pixel-perfect replica of the Flowmingo public jobs board.
   Opens standalone (no AppShell sidebar). Auth session is read
   automatically from localStorage so the user stays logged in.
   ============================================================= */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search, MapPin, ChevronDown, X, Bookmark,
  CheckCircle2, Globe, MoreHorizontal, Briefcase,
  Clock, Building2, Star, ArrowLeft,
} from "lucide-react";
import api from "../api/client.js";
import { fetchDashboard, peekDashboard } from "../api/dashboardCache.js";
import { accountAuthHeader, getAccountAuth } from "../auth/accountAuth.js";
import { useAccountAuth } from "../auth/useAccountAuth.js";
import { Skeleton } from "../components/ui/Card.jsx";

/* ─────────────────────────────────────────────────────────────
   Flowmingo design tokens  (scoped to this page only)
   ───────────────────────────────────────────────────────────── */
const FM = {
  orange:       "#F97316",
  orangeLight:  "#FFF0E6",
  yellow:       "#F5B51B",
  yellowDark:   "#E5A514",
  lightYellow:  "#FFF4CC",
  veryLightYellow: "#FFF9E8",
  black:        "#17191D",
  bg:           "#FFFFFF",
  bgPage:       "#F7F8FA",
  bgOff:        "#F1F3F5",
  border:       "#E5E7EB",
  borderLight:  "#F1F3F5",
  textPrimary:  "#111827",
  textDark:     "#172334",
  textSecondary:"#64748B",
  textMuted:    "#94A3B8",
  textBody:     "#475569",
  activeRow:    "#FAFAFA",
  pillBg:       "#F8FAFC",
  bottomBg:     "#FFF9E8",
};

/* ─────────────────────────────────────────────────────────────
   Page-scoped <style> — bypasses Tailwind's 14 px floor
   ───────────────────────────────────────────────────────────── */
const PAGE_CSS = `
.fmjobs * { box-sizing: border-box; }
.fmjobs { font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
.fmjobs h1, .fmjobs h2, .fmjobs h3 { font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; letter-spacing: -0.01em; }

/* reset Tailwind floor inside this scope */
.fmjobs .fm-text-11 { font-size: 11px !important; line-height: 1.45; }
.fmjobs .fm-text-12 { font-size: 12px !important; line-height: 1.45; }
.fmjobs .fm-text-13 { font-size: 13px !important; line-height: 1.5;  }
.fmjobs .fm-text-14 { font-size: 14px !important; line-height: 1.55; }
.fmjobs .fm-text-15 { font-size: 15px !important; line-height: 1.55; }
.fmjobs .fm-text-16 { font-size: 16px !important; line-height: 1.5;  }
.fmjobs .fm-text-22 { font-size: 22px !important; line-height: 1.3;  }
.fmjobs .fm-text-48 { font-size: 42px !important; line-height: 1.08; font-weight: 600; letter-spacing: -0.01em; }

/* scrollbar-none */
.fmjobs .scrollbar-none::-webkit-scrollbar { display: none; }
.fmjobs .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }

/* job-list-card hover */
.fmjobs .fm-job-card { transition: background 0.15s; }
.fmjobs .fm-job-card:hover { background: ${FM.bgOff}; }
.fmjobs .fm-job-card.fm-active { background: ${FM.activeRow}; border-left: 3px solid ${FM.textPrimary}; }

/* filter chip */
.fmjobs .fm-chip { display: inline-flex; align-items: center; gap: 5px; height: 32px; border-radius: 999px; border: 1px solid ${FM.border}; background: #fff; padding: 0 14px; font-size: 13px; font-weight: 500; color: ${FM.textPrimary}; cursor: pointer; transition: border-color .15s; white-space: nowrap; }
.fmjobs .fm-chip:hover { border-color: #CBD5E1; }

/* apply-now button */
.fmjobs .fm-apply-btn { display: flex; align-items: center; justify-content: center; width: 100%; height: 52px; border-radius: 10px; background: ${FM.black}; color: #fff; font-size: 14px; font-weight: 500; border: none; cursor: pointer; transition: opacity .15s; }
.fmjobs .fm-apply-btn:hover { opacity: .85; }

/* nav your-matches button */
.fmjobs .fm-matches-btn { display: inline-flex; align-items: center; gap: 6px; height: 36px; border-radius: 18px; background: ${FM.black}; color: #fff; padding: 0 16px; font-size: 13px; font-weight: 500; text-decoration: none; transition: opacity .15s; }
.fmjobs .fm-matches-btn:hover { opacity: .85; }
.fmjobs .fm-matches-chip { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 999px; background: ${FM.orange}; }

/* search bar */
.fmjobs .fm-search-box { display: flex; align-items: center; background: #fff; border: 1px solid ${FM.border}; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(15,23,42,0.04); }
.fmjobs .fm-search-input { border: none; outline: none; background: transparent; font-size: 14px; font-weight: 400; color: ${FM.textPrimary}; width: 100%; padding: 0 14px; height: 46px; }
.fmjobs .fm-search-input::placeholder { color: ${FM.textSecondary}; }
.fmjobs .fm-search-divider { width: 1px; height: 24px; background: ${FM.border}; flex-shrink: 0; }
.fmjobs .fm-search-btn { height: 46px; width: 112px; flex-shrink: 0; border: none; background: ${FM.black}; color: #fff; font-size: 13px; font-weight: 500; padding: 0 16px; cursor: pointer; transition: opacity .15s; white-space: nowrap; }
.fmjobs .fm-search-btn:hover { opacity: .85; }

/* show-more button */
.fmjobs .fm-show-more { display: flex; align-items: center; justify-content: center; width: 100%; height: 48px; border-radius: 10px; border: 1px solid ${FM.border}; background: #fff; font-size: 14px; font-weight: 500; color: ${FM.textPrimary}; cursor: pointer; transition: background .15s; }
.fmjobs .fm-show-more:hover { background: ${FM.bgOff}; }

/* bottom section links */
.fmjobs .fm-bottom-action { font-size: 13px; font-weight: 500; color: ${FM.orange}; text-decoration: none; white-space: nowrap; flex-shrink: 0; }
.fmjobs .fm-bottom-action:hover { text-decoration: underline; }

/* dropdown */
.fmjobs .fm-dropdown { position: absolute; top: calc(100% + 8px); left: 0; z-index: 100; background: #fff; border: 1px solid ${FM.border}; border-radius: 10px; box-shadow: 0 8px 28px rgba(15,23,42,.10); min-width: 180px; overflow: hidden; }
.fmjobs .fm-dropdown-item { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 16px; font-size: 13px; font-weight: 400; color: ${FM.textPrimary}; cursor: pointer; transition: background .1s; border: none; background: transparent; width: 100%; text-align: left; }
.fmjobs .fm-dropdown-item:hover { background: ${FM.bgOff}; }
.fmjobs .fm-dropdown-item.active { color: ${FM.orange}; font-weight: 500; }

/* detail description prose */
.fmjobs .fm-prose ul { list-style: disc; padding-left: 1.4em; }
.fmjobs .fm-prose ul li { margin-bottom: 6px; font-size: 14px; line-height: 1.65; color: ${FM.textBody}; font-weight: 400; }
.fmjobs .fm-prose p { font-size: 14px; line-height: 1.65; color: ${FM.textBody}; font-weight: 400; margin-bottom: 10px; }
.fmjobs .fm-prose h3 { font-size: 18px; font-weight: 600; margin: 20px 0 8px; color: ${FM.textPrimary}; }

/* list + detail split — properties here (not inline) so the mobile media
   query below can actually override them; inline styles always beat
   stylesheet rules regardless of media query. */
.fmjobs .fm-split { display: flex; height: calc(100vh - 380px); min-height: 360px; max-height: 640px; }
.fmjobs .fm-split-list { width: 36%; min-width: 320px; max-width: 400px; height: 100%; }
.fmjobs .fm-split-detail { flex: 1; min-width: 0; height: 100%; display: flex; flex-direction: column; }
.fmjobs .fm-back-to-list { display: none; }
.fmjobs .fm-meta-grid { grid-template-columns: repeat(2, 1fr); }
.fmjobs .fm-navbar-row { display: flex; padding: 0 24px; gap: 16px; }
.fmjobs .fm-nav-links { display: flex; }
.fmjobs .fm-candidates-chip { display: inline-flex; }

/* mobile: full-width nav collapse, stacked search, list/detail as two
   screens (list, or detail with a back button) instead of a fixed split */
@media (max-width: 768px) {
  .fmjobs .fm-nav-links { display: none; }
  .fmjobs .fm-candidates-chip { display: none; }
  .fmjobs .fm-matches-label { display: none; }
  .fmjobs .fm-navbar-row { padding: 0 16px; gap: 10px; }

  .fmjobs .fm-split { flex-direction: column; height: auto; min-height: 0; max-height: none; }
  .fmjobs .fm-split-list, .fmjobs .fm-split-detail { width: 100%; max-width: none; min-width: 0; height: auto; }
  .fmjobs .fm-split.fm-has-selection .fm-split-list { display: none; }
  .fmjobs .fm-split:not(.fm-has-selection) .fm-split-detail { display: none; }
  .fmjobs .fm-split.fm-has-selection .fm-back-to-list { display: flex; }
}

@media (max-width: 640px) {
  .fmjobs .fm-search-box { flex-direction: column; align-items: stretch; }
  .fmjobs .fm-search-divider { display: none; }
  .fmjobs .fm-search-btn { width: 100%; }
}

@media (max-width: 480px) {
  .fmjobs .fm-meta-grid { grid-template-columns: 1fr; }
}
`;

/* ─────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────── */
function initials(name) {
  return String(name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function timeAgo(d) {
  if (!d) return "";
  const diff = (Date.now() - new Date(d).getTime()) / 86400000;
  if (diff < 1) return "today";
  if (diff < 2) return "yesterday";
  if (diff < 7) return `${Math.floor(diff)} days ago`;
  if (diff < 14) return "last week";
  if (diff < 60) return `${Math.floor(diff / 7)} weeks ago`;
  return `${Math.floor(diff / 30)} months ago`;
}

function fuzzyScore(value, term) {
  const text = String(value || "").toLowerCase();
  const needle = term.toLowerCase();
  const exactAt = text.indexOf(needle);
  if (exactAt >= 0) return 100 - Math.min(exactAt, 40);
  let at = 0, gaps = 0;
  for (const ch of needle) {
    const next = text.indexOf(ch, at);
    if (next < 0) return 0;
    gaps += next - at; at = next + 1;
  }
  return Math.max(1, 45 - gaps);
}

function jobScore(job, q) {
  const fields = [job.title, job.company?.name, job.department, job.location, job.description, ...(job.requiredSkills || [])];
  return q.trim().toLowerCase().split(/\s+/).reduce((total, term) => {
    if (total < 0) return total;
    const best = Math.max(...fields.map((f) => fuzzyScore(f, term)));
    return best ? total + best : -1;
  }, 0);
}

/** Parse plain-text job description into rendered JSX bullet lists */
function DescriptionBody({ text }) {
  if (!text) return null;
  const lines = text.split(/\n/).map((l) => l.trim());
  const blocks = [];
  let currentList = null;

  for (const line of lines) {
    if (!line) {
      if (currentList) { blocks.push(currentList); currentList = null; }
      continue;
    }
    const isBullet = /^[-•*]\s/.test(line) || /^\d+\.\s/.test(line);
    if (isBullet) {
      if (!currentList) currentList = [];
      currentList.push(line.replace(/^[-•*\d.]+\s/, ""));
    } else {
      if (currentList) { blocks.push(currentList); currentList = null; }
      blocks.push(line);
    }
  }
  if (currentList) blocks.push(currentList);

  return (
    <div className="fm-prose">
      {blocks.map((b, i) =>
        Array.isArray(b) ? (
          <ul key={i}>
            {b.map((item, j) => <li key={j}>{item}</li>)}
          </ul>
        ) : (
          /^(qualifications?|requirements?|responsibilities|about|overview|duties|skills|benefits|perks|what you.ll|nice to|preferred)/i.test(b)
            ? <h3 key={i}>{b}</h3>
            : <p key={i}>{b}</p>
        )
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Company logo avatar
   ───────────────────────────────────────────────────────────── */
function CompanyAvatar({ company, size = 36 }) {
  const [failed, setFailed] = useState(false);
  const logo = company?.logoPath;
  return (
    <div style={{ width: size, height: size, minWidth: size, borderRadius: 8, overflow: "hidden", border: `1px solid ${FM.border}`, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {logo && !failed ? (
        <img src={logo} alt={company?.name || ""} style={{ width: "100%", height: "100%", objectFit: "contain", padding: 2 }} onError={() => setFailed(true)} />
      ) : (
        <span style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: FM.bgOff, fontSize: size > 30 ? 13 : 11, fontWeight: 500, color: FM.textSecondary }}>
          {initials(company?.name)}
        </span>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SVG icons used in job cards (matching Flowmingo exactly)
   ───────────────────────────────────────────────────────────── */
const IconPin = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <path d="M12 13.43a3.12 3.12 0 1 0 0-6.24 3.12 3.12 0 0 0 0 6.24Z" stroke={FM.textSecondary} strokeWidth="1.5" />
    <path d="M3.62 8.49c1.97-8.66 14.8-8.65 16.76.01 1.15 5.08-2.01 9.38-4.78 12.04a5.193 5.193 0 0 1-7.21 0c-2.76-2.66-5.92-6.97-4.77-12.05Z" stroke={FM.textSecondary} strokeWidth="1.5" />
  </svg>
);
const IconClock = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <path d="M22 12c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2s10 4.48 10 10Z" stroke={FM.textSecondary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="m15.71 15.18-3.1-1.85c-.54-.32-.98-1.09-.98-1.72v-4.1" stroke={FM.textSecondary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconBuilding = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <path d="M6.7 18H4.15C2.72 18 2 17.28 2 15.85V4.15C2 2.72 2.72 2 4.15 2h4.3c1.43 0 2.15.72 2.15 2.15V6" stroke={FM.textSecondary} strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M17.37 8.42v11.16c0 1.61-.8 2.42-2.41 2.42H9.12c-1.61 0-2.42-.81-2.42-2.42V8.42C6.7 6.81 7.51 6 9.12 6h5.84c1.61 0 2.41.81 2.41 2.42Z" stroke={FM.textSecondary} strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M13.4 6V4.15c0-1.43.72-2.15 2.15-2.15h4.3C21.28 2 22 2.72 22 4.15v11.7c0 1.43-.72 2.15-2.15 2.15h-2.48M10 11h4M10 14h4M12 22v-3" stroke={FM.textSecondary} strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconArrowRight = ({ color = "#fff" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none">
    <path stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" strokeWidth="1.5" d="M14.43 5.93L20.5 12l-6.07 6.07M3.5 12h16.83" />
  </svg>
);
const IconEye = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none">
    <path d="M15.58 12c0 1.98-1.6 3.58-3.58 3.58S8.42 13.98 8.42 12s1.6-3.58 3.58-3.58 3.58 1.6 3.58 3.58Z" stroke={FM.orange} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 20.27c3.53 0 6.82-2.08 9.11-5.68.9-1.41.9-3.78 0-5.19-2.29-3.6-5.58-5.68-9.11-5.68-3.53 0-6.82 2.08-9.11 5.68-.9 1.41-.9 3.78 0 5.19 2.29 3.6 5.58 5.68 9.11 5.68Z" stroke={FM.orange} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconSend = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none">
    <path d="m7.4 6.32 8.49-2.83c3.81-1.27 5.88.81 4.62 4.62l-2.83 8.49c-1.9 5.71-5.02 5.71-6.92 0l-.84-2.52-2.52-.84c-5.71-1.9-5.71-5.01 0-6.92ZM10.11 13.65l3.58-3.59" stroke={FM.orange} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ─────────────────────────────────────────────────────────────
   Flowmingo Top Navbar
   ───────────────────────────────────────────────────────────── */
function FMTopNav({ user, isAuthenticated }) {
  const auth = getAccountAuth();
  const userInitials = auth?.user?.name
    ? auth.user.name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()
    : "DU";
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <header style={{ position: "sticky", top: 0, zIndex: 50, background: "#fff", borderBottom: `1px solid ${FM.border}`, height: 64 }}>
      <div className="fm-navbar-row" style={{ maxWidth: 1200, margin: "0 auto", height: "100%", alignItems: "center", justifyContent: "space-between" }}>
        {/* Left — logo + candidates dropdown */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Real AptusHire brand logo */}
          <Link to="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
            <img src="/logo.png" alt="AptusHire" style={{ height: 52, width: "auto" }} />
          </Link>
          {/* Candidates chip */}
          <button
            type="button"
            className="fm-candidates-chip"
            style={{ alignItems: "center", gap: 4, height: 34, border: `1px solid ${FM.border}`, borderRadius: 8, background: "#fff", padding: "0 10px", cursor: "pointer" }}
          >
            <span className="fm-text-13" style={{ color: FM.textPrimary, fontWeight: 500 }}>Candidates</span>
            <ChevronDown size={13} color={FM.textSecondary} />
          </button>
        </div>

        {/* Center nav links — hidden on mobile, "Jobs" is redundant with the page you're already on */}
        <nav className="fm-nav-links" style={{ alignItems: "center", gap: 28 }}>
          <Link to="/welcome" style={{ textDecoration: "none" }}>
            <span className="fm-text-13" style={{ color: FM.textPrimary, fontWeight: 500 }}>What you get</span>
          </Link>
          <Link to="/jobs" style={{ textDecoration: "none" }}>
            <span className="fm-text-13" style={{ color: FM.textPrimary, fontWeight: 600, position: "relative", display: "inline-block", paddingBottom: 4 }}>
              Jobs
              <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 2, background: FM.orange, borderRadius: 999 }} />
            </span>
          </Link>
          <Link to="/welcome#how" style={{ textDecoration: "none" }}>
            <span className="fm-text-13" style={{ color: FM.textPrimary, fontWeight: 500 }}>How it works</span>
          </Link>
        </nav>

        {/* Right — user, your-matches */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* User initials / profile — opens a menu linking dashboard + applied jobs */}
          {isAuthenticated ? (
            <div ref={menuRef} style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, height: 34, border: `1px solid ${FM.border}`, borderRadius: 8, background: "#fff", padding: "0 10px", cursor: "pointer" }}
              >
                <span style={{ width: 22, height: 22, borderRadius: 999, background: FM.bgOff, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span className="fm-text-12" style={{ fontWeight: 500, color: FM.textPrimary }}>{userInitials}</span>
                </span>
                <ChevronDown size={13} color={FM.textSecondary} />
              </button>
              {menuOpen && (
                <div className="fm-dropdown" style={{ right: 0, left: "auto", minWidth: 220 }}>
                  {(user?.name || user?.email) && (
                    <div style={{ padding: "12px 16px", borderBottom: `1px solid ${FM.borderLight}` }}>
                      {user?.name && <p className="fm-text-13" style={{ fontWeight: 600, color: FM.textPrimary }}>{user.name}</p>}
                      {user?.email && <p className="fm-text-12" style={{ color: FM.textSecondary, marginTop: 2 }}>{user.email}</p>}
                    </div>
                  )}
                  <Link to="/?recommended=1" className="fm-dropdown-item" style={{ textDecoration: "none" }} onClick={() => setMenuOpen(false)}>
                    <span className="fm-text-13">Go to your dashboard</span>
                  </Link>
                  <Link to="/applied-jobs" className="fm-dropdown-item" style={{ textDecoration: "none" }} onClick={() => setMenuOpen(false)}>
                    <span className="fm-text-13">Applied Jobs</span>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" style={{ textDecoration: "none" }}>
              <span className="fm-text-13" style={{ color: FM.textPrimary, fontWeight: 500 }}>Log in</span>
            </Link>
          )}

          {/* Your matches pill */}
          <Link to="/?recommended=1" target="_blank" rel="noreferrer" className="fm-matches-btn">
            <span className="fm-text-13 fm-matches-label">Your matches</span>
            <span className="fm-matches-chip">
              <IconArrowRight color="#fff" />
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ─────────────────────────────────────────────────────────────
   Filter chip dropdown
   ───────────────────────────────────────────────────────────── */
function FMFilterChip({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        className="fm-chip"
        onClick={() => setOpen((v) => !v)}
        style={value ? { borderColor: FM.textPrimary, background: FM.pillBg } : {}}
      >
        <span className="fm-text-13">{label}{value ? `: ${value}` : ""}</span>
        <ChevronDown size={14} color={FM.textSecondary} />
      </button>
      {open && (
        <div className="fm-dropdown">
          {value && (
            <button className="fm-dropdown-item" onClick={() => { onChange(""); setOpen(false); }}>
              <span className="fm-text-13" style={{ color: "#DC2626" }}>
                <X size={13} style={{ marginRight: 6, display: "inline" }} />Clear
              </span>
            </button>
          )}
          {options.map((opt) => (
            <button
              key={opt}
              className={`fm-dropdown-item${opt === value ? " active" : ""}`}
              onClick={() => { onChange(opt === value ? "" : opt); setOpen(false); }}
            >
              <span className="fm-text-13">{opt}</span>
              {opt === value && <CheckCircle2 size={14} color={FM.orange} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Left panel — single job card row
   ───────────────────────────────────────────────────────────── */
function JobListCard({ job, active, onClick, saved, onToggleSave, saving }) {
  const salary    = job.salary || job.salaryRange || job.compensation;
  const jobType   = job.jobType || job.employmentType;
  const workplace = job.workplaceType || job.workPlace;

  return (
    <div
      className={`fm-job-card${active ? " fm-active" : ""}`}
      style={{ borderLeft: active ? `3px solid ${FM.textPrimary}` : "3px solid transparent", borderBottom: `1px solid ${FM.borderLight}`, padding: "16px 16px 16px 14px", minHeight: 95, cursor: "pointer" }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        {/* Checkbox area (Flowmingo has a checkbox left of the avatar) */}
        <div
          role="checkbox"
          aria-checked="false"
          aria-label={job.title}
          style={{ width: 16, height: 16, border: "1px solid #CBD5E1", borderRadius: 4, flexShrink: 0, marginTop: 3, background: "#fff" }}
          onClick={(e) => e.stopPropagation()}
        />

        <CompanyAvatar company={job.company} size={36} />

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title row */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
            <span className="fm-text-14" style={{ fontWeight: 500, color: FM.textPrimary, lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {job.title}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <span className="fm-text-12" style={{ color: FM.textMuted, whiteSpace: "nowrap" }}>
                {timeAgo(job.createdAt)}
              </span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onToggleSave(job); }}
                disabled={saving}
                aria-label={saved ? "Unsave" : "Save"}
                style={{ background: "none", border: "none", cursor: "pointer", color: saved ? FM.yellowDark : FM.border, padding: 0, lineHeight: 1 }}
              >
                <Bookmark size={15} fill={saved ? FM.yellowDark : "none"} color={saved ? FM.yellowDark : FM.textMuted} />
              </button>
            </div>
          </div>

          {/* Company */}
          <p className="fm-text-13" style={{ color: FM.textSecondary, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {job.company?.name}
          </p>

          {/* Meta row */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", marginTop: 7 }}>
            {job.location && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <IconPin />
                <span className="fm-text-13" style={{ color: FM.textSecondary }}>{job.location}</span>
              </span>
            )}
            {jobType && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <IconClock />
                <span className="fm-text-13" style={{ color: FM.textSecondary }}>{jobType}</span>
              </span>
            )}
            {workplace && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <IconBuilding />
                <span className="fm-text-13" style={{ color: FM.textSecondary }}>{workplace}</span>
              </span>
            )}
          </div>

          {/* Salary line if present */}
          {salary && (
            <p className="fm-text-13" style={{ color: FM.textSecondary, marginTop: 5, fontWeight: 500 }}>
              {salary}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Right panel — job detail
   ───────────────────────────────────────────────────────────── */
function JobDetail({ job, navigate, onBack }) {
  if (!job) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12, padding: 48, textAlign: "center" }}>
        <Briefcase size={40} color={FM.border} />
        <p className="fm-text-15" style={{ fontWeight: 600, color: FM.textPrimary }}>Select a job</p>
        <p className="fm-text-13" style={{ color: FM.textSecondary }}>Pick a role from the list to see full details here.</p>
      </div>
    );
  }

  const salary    = job.salary || job.salaryRange || job.compensation;
  const jobType   = job.jobType || job.employmentType;
  const workplace = job.workplaceType || job.workPlace;
  const applyTo   = `/jobs/${job.slug || job._id}/apply`;
  const website   = job.company?.website;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 28px 0" }}>
        {/* Back to list — mobile only, shown via .fm-back-to-list media rule */}
        <button
          type="button"
          onClick={onBack}
          className="fm-back-to-list"
          style={{ alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 16, color: FM.textSecondary }}
        >
          <ArrowLeft size={16} />
          <span className="fm-text-13" style={{ fontWeight: 500 }}>Back to list</span>
        </button>

        {/* Title + more */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <h1 className="fm-text-22" style={{ fontWeight: 600, color: FM.textPrimary, flex: 1 }}>
            {job.title}
          </h1>
          <button type="button" aria-label="More" style={{ background: "none", border: "none", cursor: "pointer", padding: 4, marginTop: 2, color: FM.textMuted, flexShrink: 0 }}>
            <MoreHorizontal size={20} />
          </button>
        </div>

        {/* Company row */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 18 }}>
          <CompanyAvatar company={job.company} size={48} />
          <div style={{ minWidth: 0 }}>
            <p className="fm-text-15" style={{ fontWeight: 500, color: FM.textPrimary }}>{job.company?.name}</p>
            {website && (
              <a href={website} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 5, textDecoration: "none" }}>
                <Globe size={13} color={FM.textSecondary} />
                <span className="fm-text-12" style={{ color: FM.textSecondary }}>
                  {website.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}
                </span>
              </a>
            )}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: FM.borderLight, margin: "20px 0" }} />

        {/* Description body */}
        <DescriptionBody text={job.description} />

        {/* Requirements */}
        {job.requirements && (
          <>
            <div style={{ height: 1, background: FM.borderLight, margin: "16px 0" }} />
            <DescriptionBody text={job.requirements} />
          </>
        )}

        {/* Skills */}
        {job.requiredSkills?.length > 0 && (
          <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: 8 }}>
            {job.requiredSkills.map((s) => (
              <span key={s} style={{ display: "inline-block", border: `1px solid ${FM.border}`, borderRadius: 999, padding: "6px 10px", fontSize: 12, fontWeight: 500, color: FM.textBody, background: FM.pillBg }}>
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Meta row */}
        <div className="fm-meta-grid" style={{ display: "grid", gap: "12px 24px", marginTop: 24, borderTop: `1px solid ${FM.borderLight}`, paddingTop: 20 }}>
          {[
            { label: "Salary",          value: salary },
            { label: "Workplace type",  value: workplace },
            { label: "Employment type", value: jobType },
            { label: "Seniority level", value: job.seniorityLevel || job.experienceLevel },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="fm-text-13" style={{ color: FM.textSecondary, fontWeight: 500 }}>{label}</p>
              <p className="fm-text-14" style={{ color: FM.textPrimary, fontWeight: 400, marginTop: 4 }}>{value || "—"}</p>
            </div>
          ))}
        </div>

        <div style={{ height: 24 }} />
      </div>

      {/* Sticky Apply Now */}
      <div style={{ flexShrink: 0, borderTop: `1px solid ${FM.borderLight}`, background: "#fff", padding: "16px 28px" }}>
        <button
          type="button"
          className="fm-apply-btn"
          onClick={() => navigate(applyTo)}
        >
          Apply Now
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Company ticker strip
   ───────────────────────────────────────────────────────────── */
function CompanyTicker({ companies, onSelect }) {
  return (
    <>
      {companies.map((company) => (
        <button
          key={company.name}
          type="button"
          onClick={() => onSelect(company.name)}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0, height: 42, border: `1px solid ${FM.border}`, borderRadius: 12, background: "#fff", cursor: "pointer", padding: "0 12px", transition: "border-color .15s" }}
        >
          <CompanyAvatar company={company} size={26} />
          <span className="fm-text-13" style={{ color: FM.textSecondary, whiteSpace: "nowrap", fontWeight: 500 }}>{company.name}</span>
        </button>
      ))}
    </>
  );
}

function QuickFilterChip({ icon: Icon, label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0, height: 42,
        border: `1px solid ${active ? FM.textPrimary : FM.border}`, borderRadius: 12,
        background: active ? FM.pillBg : "#fff", cursor: "pointer", padding: "0 12px", transition: "border-color .15s",
      }}
    >
      <Icon size={16} color={FM.textSecondary} />
      <span className="fm-text-13" style={{ color: FM.textSecondary, whiteSpace: "nowrap", fontWeight: 500 }}>{label}</span>
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────
   Bottom "job-hunting engines" section
   ───────────────────────────────────────────────────────────── */
function BottomEngines() {
  return (
    <div style={{ background: FM.bottomBg, padding: "40px 24px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto", background: "#fff", borderRadius: 20, border: `1px solid ${FM.border}`, padding: "24px 28px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 20 }}>
          <p className="fm-text-16" style={{ fontWeight: 600, color: FM.textPrimary }}>Your job-hunting engines</p>
          <Link to="/?recommended=1" target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 5, textDecoration: "none" }}>
            <span className="fm-text-13" style={{ color: FM.orange, fontWeight: 500 }}>Go to your dashboard</span>
            <IconArrowRight color={FM.orange} />
          </Link>
        </div>

        {/* Row 1 — Private Introduction */}
        <Link
          to="/?recommended=1"
          target="_blank"
          rel="noreferrer"
          style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 14, padding: "16px 0", borderBottom: `1px solid ${FM.borderLight}`, textDecoration: "none" }}
        >
          <div style={{ width: 36, height: 36, borderRadius: 999, background: FM.orangeLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <IconEye />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <p className="fm-text-14" style={{ fontWeight: 600, color: FM.textPrimary }}>Let companies find you</p>
            <p className="fm-text-13" style={{ color: FM.textSecondary, marginTop: 3 }}>
              Join the private talent pool — companies reach out when a job matches. Nothing public.
            </p>
          </div>
          <span className="fm-bottom-action">Turn on Private Introduction</span>
        </Link>

        {/* Row 2 — Proactive Outreach */}
        <Link
          to="/?recommended=1"
          target="_blank"
          rel="noreferrer"
          style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 14, padding: "16px 0 0", textDecoration: "none" }}
        >
          <div style={{ width: 36, height: 36, borderRadius: 999, background: FM.orangeLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <IconSend />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <p className="fm-text-14" style={{ fontWeight: 600, color: FM.textPrimary }}>Want us to email companies for you?</p>
            <p className="fm-text-13" style={{ color: FM.textSecondary, marginTop: 3 }}>
              We send AI-personalized emails to hiring managers from your inbox — you read every email first.
            </p>
          </div>
          <span className="fm-bottom-action">Turn on Proactive Outreach</span>
        </Link>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN EXPORT
   ───────────────────────────────────────────────────────────── */
export default function AllJobs() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAccountAuth();

  const [jobs,       setJobs]       = useState([]);
  const [savedIds,   setSavedIds]   = useState(new Set());
  const [savingId,   setSavingId]   = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");

  // Search
  const [titleInput,  setTitleInput]  = useState("");
  const [locInput,    setLocInput]    = useState("");
  const [submitted,   setSubmitted]   = useState({ title: "", loc: "" });

  // Filters
  const [filterFunction,    setFilterFunction]    = useState("");
  const [filterEmployment,  setFilterEmployment]  = useState("");
  const [filterArrangement, setFilterArrangement] = useState("");

  // Detail selection + pagination
  const [selectedId, setSelectedId] = useState(null);
  const [showAll,    setShowAll]    = useState(false);

  // Below 769px (matches the CSS "@media (max-width: 768px)" split/detail
  // toggle) selecting a job HIDES the list entirely — there's no persistent
  // pane to auto-populate there, only a full-screen detail a candidate must
  // deliberately navigate to. Auto-selecting on that layout was trapping
  // mobile visitors: "Back to list" cleared selectedId, but the auto-select
  // effect below (no dependency array — it runs after every render) then
  // immediately re-selected the first job again, so the job list itself
  // was never actually visible/reachable on a phone.
  const [isDesktopSplit, setIsDesktopSplit] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 769px)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 769px)");
    const update = () => setIsDesktopSplit(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  /* ── Fetch ── */
  useEffect(() => {
    Promise.all([
      api.get("/jobs/published"),
      isAuthenticated
        ? fetchDashboard().catch(() => null)
        : Promise.resolve(null),
    ])
      .then(([jobsRes, dashRes]) => {
        if (!Array.isArray(jobsRes.data)) throw new Error("unexpected");
        setJobs(jobsRes.data);
        if (dashRes) {
          setSavedIds(new Set((dashRes.data.savedJobs || []).map((j) => String(j._id || j))));
        }
      })
      .catch(() => setError("Couldn't load jobs. Please try again."))
      .finally(() => setLoading(false));
  }, [isAuthenticated]); // eslint-disable-line

  /* ── Auto-select first (desktop split-pane only — see isDesktopSplit) ── */
  const listRef = useRef(null);
  useEffect(() => {
    if (isDesktopSplit && !loading && filteredJobs.length > 0 && !selectedId) {
      setSelectedId(String(filteredJobs[0]._id));
    }
  }); // runs every render until set

  /* ── Derived ── */
  const functionOpts = useMemo(() => {
    const s = new Set();
    jobs.forEach((j) => { if (j.department) s.add(j.department.trim()); });
    return [...s].sort();
  }, [jobs]);

  const employmentOpts = useMemo(() => {
    const s = new Set();
    jobs.forEach((j) => { const v = j.jobType || j.employmentType; if (v) s.add(v.trim()); });
    return s.size ? [...s].sort() : ["Full-time", "Part-time", "Contract", "Internship", "Temporary", "Volunteer"];
  }, [jobs]);

  const arrangementOpts = useMemo(() => {
    const s = new Set();
    jobs.forEach((j) => { const v = j.workplaceType || j.workPlace; if (v) s.add(v.trim()); });
    return s.size ? [...s].sort() : ["On-site", "Remote", "Hybrid"];
  }, [jobs]);

  const companyStrip = useMemo(() => {
    const seen = new Map();
    jobs.forEach((j) => { if (j.company?.name && !seen.has(j.company.name)) seen.set(j.company.name, j.company); });
    return [...seen.values()];
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    let list = [...jobs];
    if (submitted.title) {
      list = list.map((j) => ({ job: j, score: jobScore(j, submitted.title) }))
        .filter(({ score }) => score >= 0)
        .sort((a, b) => b.score - a.score)
        .map(({ job }) => job);
    }
    if (submitted.loc) {
      const lc = submitted.loc.toLowerCase();
      list = list.filter((j) => (j.location || "").toLowerCase().includes(lc));
    }
    if (filterEmployment) {
      const lc = filterEmployment.toLowerCase();
      list = list.filter((j) => (j.jobType || j.employmentType || "").toLowerCase() === lc);
    }
    if (filterArrangement) {
      const lc = filterArrangement.toLowerCase();
      list = list.filter((j) => (j.workplaceType || j.workPlace || "").toLowerCase() === lc);
    }
    if (filterFunction) list = list.filter((j) => j.department === filterFunction);
    return list;
  }, [jobs, submitted, filterEmployment, filterArrangement, filterFunction]);

  const visibleJobs = showAll ? filteredJobs : filteredJobs.slice(0, 20);
  const selectedJob = useMemo(() => jobs.find((j) => String(j._id) === selectedId) || null, [jobs, selectedId]);
  const newThisWeek = useMemo(() => {
    const cutoff = Date.now() - 7 * 86400000;
    return jobs.filter((j) => new Date(j.createdAt || 0).getTime() > cutoff).length;
  }, [jobs]);

  const hasFilter = filterEmployment || filterArrangement || filterFunction || submitted.title || submitted.loc;

  /* ── Save / unsave ── */
  async function toggleSave(job) {
    if (!isAuthenticated) { navigate("/login"); return; }
    const id = String(job._id);
    setSavingId(id);
    try {
      const res = await api.post(`/candidate-dashboard/saved-jobs/${job._id}`, {}, { headers: accountAuthHeader() });
      setSavedIds((prev) => { const n = new Set(prev); res.data.saved ? n.add(id) : n.delete(id); return n; });
    } catch { /* non-fatal */ } finally { setSavingId(null); }
  }

  /* ── Render ── */
  return (
    <>
      {/* Inject scoped CSS */}
      <style>{PAGE_CSS}</style>

      <div className="fmjobs" style={{ minHeight: "100vh", background: FM.bgPage, display: "flex", flexDirection: "column" }}>
        <FMTopNav user={user} isAuthenticated={isAuthenticated} />

        {/* ── HERO ── */}
        <section style={{ background: "#fff", padding: "20px 24px 14px", maxWidth: 1200, margin: "0 auto", width: "100%" }}>
          <div style={{
            backgroundImage: `linear-gradient(to right, #fff 0%, #fff 44%, rgba(255,255,255,0.55) 66%, rgba(255,255,255,0) 88%), url('/hero-banner.png')`,
            backgroundSize: "cover, cover",
            backgroundPosition: "center, right center",
            backgroundRepeat: "no-repeat, no-repeat",
            borderRadius: 16,
            padding: "16px 24px",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 32, flexWrap: "wrap", marginBottom: 10,
          }}>
            <div style={{ flex: "1 1 420px", minWidth: 280 }}>
              {/* Live now pill */}
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: FM.orangeLight, borderRadius: 999, padding: "5px 12px", marginBottom: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: FM.orange, flexShrink: 0 }} />
                <span className="fm-text-12" style={{ fontWeight: 500, color: FM.orange, textTransform: "uppercase", letterSpacing: "0.06em" }}>Live now</span>
              </div>

              {/* Count headline */}
              <h1 className="fm-text-48" style={{ color: FM.textPrimary, margin: "0 0 8px" }}>
                <span style={{ color: FM.orange }}>{loading ? "…" : filteredJobs.length.toLocaleString()}</span>
                <span style={{ color: FM.textPrimary }}> live roles </span>
                <span style={{ color: FM.textMuted }}>open right now</span>
              </h1>

              {/* Subtitle */}
              <p className="fm-text-15" style={{ color: FM.textSecondary, margin: 0 }}>
                {newThisWeek > 0 && <span style={{ fontWeight: 600, color: FM.orange }}>{newThisWeek}+ added this week.</span>}
                {" "}Free to browse, no account needed.
              </p>
            </div>

            {/* Quote (illustration now lives in the hero background) */}
            <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center" }}>
              <div>
                <p style={{ fontSize: 20, fontWeight: 500, color: FM.textPrimary, lineHeight: 1.25, margin: 0, maxWidth: 170 }}>
                  A better career is a brighter you.
                </p>
                <span style={{ display: "block", width: 42, height: 3, background: FM.orange, borderRadius: 999, marginTop: 10 }} />
              </div>
            </div>
          </div>

          {/* Search bar */}
          <form
            onSubmit={(e) => { e.preventDefault(); setSubmitted({ title: titleInput.trim(), loc: locInput.trim() }); }}
            className="fm-search-box"
          >
            <div style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
              <Search size={18} color={FM.textSecondary} style={{ flexShrink: 0, marginLeft: 16 }} />
              <input
                type="text"
                className="fm-search-input"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                placeholder="Search job title or keyword"
              />
            </div>
            <div className="fm-search-divider" />
            <div style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
              <MapPin size={18} color={FM.textSecondary} style={{ flexShrink: 0, marginLeft: 16 }} />
              <input
                type="text"
                className="fm-search-input"
                value={locInput}
                onChange={(e) => setLocInput(e.target.value)}
                placeholder="City or country"
              />
            </div>
            <button type="submit" className="fm-search-btn">Search jobs</button>
          </form>

          {/* Filter chips */}
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            <FMFilterChip label="Job function"     value={filterFunction}    options={functionOpts.length ? functionOpts : ["Engineering", "Design", "Marketing", "Sales", "Operations"]} onChange={setFilterFunction} />
            <FMFilterChip label="Employment type"  value={filterEmployment}  options={employmentOpts}  onChange={setFilterEmployment} />
            <FMFilterChip label="Work arrangement" value={filterArrangement} options={arrangementOpts} onChange={setFilterArrangement} />
            {hasFilter && (
              <button
                type="button"
                onClick={() => {
                  setTitleInput(""); setLocInput("");
                  setSubmitted({ title: "", loc: "" });
                  setFilterFunction(""); setFilterEmployment(""); setFilterArrangement("");
                }}
                className="fm-chip"
                style={{ color: "#DC2626", borderColor: "#FECACA" }}
              >
                <X size={13} />
                <span className="fm-text-13">Clear all</span>
              </button>
            )}
          </div>

          {/* Quick filters + company chips */}
          <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 10 }}>
            <QuickFilterChip
              icon={Star}
              label="Featured"
              active={!hasFilter}
              onClick={() => {
                setTitleInput(""); setLocInput("");
                setSubmitted({ title: "", loc: "" });
                setFilterFunction(""); setFilterEmployment(""); setFilterArrangement("");
              }}
            />
            {companyStrip.length > 0 && (
              <CompanyTicker
                companies={companyStrip}
                onSelect={(name) => {
                  const match = jobs.find((j) => j.company?.name === name);
                  if (match) setSelectedId(String(match._id));
                }}
              />
            )}
            <QuickFilterChip
              icon={Briefcase}
              label="Remote Jobs"
              active={filterArrangement === "Remote"}
              onClick={() => setFilterArrangement((v) => (v === "Remote" ? "" : "Remote"))}
            />
          </div>
        </section>

        {/* ── SPLIT LAYOUT — sized to fill the first viewport (nav+hero+search+filters
             above it are ~380px on desktop), so the board fits one screen like the
             reference; the page still scrolls further down to the engines section. ── */}
        <div
          className={`fm-split${selectedId ? " fm-has-selection" : ""}`}
          style={{
            maxWidth: 1200, margin: "0 auto 16px", width: "100%",
            background: "#fff", border: `1px solid ${FM.border}`, borderRadius: 14, overflow: "hidden",
            boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
          }}
        >

          {/* Left list panel */}
          <div
            ref={listRef}
            className="fm-split-list"
            style={{
              borderRight: `1px solid ${FM.border}`,
              overflowY: "auto",
              background: "#fff",
              flexShrink: 0,
            }}
          >
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} style={{ display: "flex", gap: 10, borderBottom: `1px solid ${FM.borderLight}`, padding: "14px 16px" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: "#E8E8ED", flexShrink: 0 }} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ height: 14, borderRadius: 4, background: "#E8E8ED", width: "75%" }} />
                    <div style={{ height: 12, borderRadius: 4, background: "#E8E8ED", width: "50%" }} />
                    <div style={{ height: 12, borderRadius: 4, background: "#E8E8ED", width: "60%" }} />
                  </div>
                </div>
              ))
            ) : error ? (
              <p className="fm-text-13" style={{ color: "#DC2626", padding: 20, textAlign: "center" }}>{error}</p>
            ) : filteredJobs.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: 40, textAlign: "center" }}>
                <Briefcase size={32} color={FM.border} />
                <p className="fm-text-14" style={{ fontWeight: 600, color: FM.textPrimary }}>No matching jobs</p>
                <p className="fm-text-13" style={{ color: FM.textSecondary }}>Try adjusting your search or filters.</p>
              </div>
            ) : (
              <>
                {visibleJobs.map((job) => (
                  <JobListCard
                    key={job._id}
                    job={job}
                    active={String(job._id) === selectedId}
                    onClick={() => setSelectedId(String(job._id))}
                    saved={savedIds.has(String(job._id))}
                    onToggleSave={toggleSave}
                    saving={savingId === String(job._id)}
                  />
                ))}
                {!showAll && filteredJobs.length > 20 && (
                  <div style={{ padding: "12px 16px 20px" }}>
                    <button type="button" className="fm-show-more" onClick={() => setShowAll(true)}>
                      <span className="fm-text-14">Show more roles</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right detail panel (desktop: always visible; mobile: shown in place of the list once a job is selected) */}
          <div
            className="fm-split-detail"
            style={{
              overflowY: "auto",
              background: "#fff",
            }}
          >
            <JobDetail job={selectedJob} navigate={navigate} onBack={() => setSelectedId(null)} />
          </div>
        </div>

        {/* ── BOTTOM ENGINES ── */}
        <BottomEngines />
      </div>
    </>
  );
}
