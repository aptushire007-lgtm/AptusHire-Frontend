import { useCallback, useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Sparkles,
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  FileText,
  UserRound,
  Briefcase,
  BookOpen,
  Bookmark,
  ClipboardList,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  ScanSearch,
} from "lucide-react";
import { useAccountAuth } from "../../auth/useAccountAuth.js";
import { logoutAccount } from "../../auth/logout.js";
import { NotificationProvider } from "../../context/NotificationContext.jsx";
import NotificationBell from "./NotificationBell.jsx";
import { BrandLogo, AptusMark } from "../ui/BrandLogo.jsx";
import { useTheme } from "../../context/ThemeContext.jsx";
import api from "../../api/client.js";
import { accountAuthHeader } from "../../auth/accountAuth.js";

// ─────────────────────────────────────────────────────────────────────────────
// Navigation data
// ─────────────────────────────────────────────────────────────────────────────
const PUBLIC_NAV = [
  { to: "/", label: "Careers", icon: Briefcase, end: true },
  { to: "/welcome", label: "How it Works", icon: BookOpen },
];

const ACCOUNT_NAV_GROUPS = [
  {
    label: "Main",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
      { to: "/", label: "Find Jobs", icon: Briefcase, end: true, hideWhenRecommended: true },
      { to: "/?recommended=1", label: "Recommended", icon: Sparkles, recommendedOnly: true },
      { to: "/saved-jobs", label: "Saved Jobs", icon: Bookmark },
      { to: "/applied-jobs", label: "Applied Jobs", icon: FileText },
      { to: "/cv-evaluation", label: "CV Evaluation", icon: ScanSearch },
    ],
  },
  {
    label: "Progress",
    items: [
      { to: "/assessments", label: "Assessment", icon: ClipboardList, badgeKey: "assessments" },
    ],
  },
  {
    label: "Account",
    items: [
      { to: "/profile", label: "Profile", icon: UserRound },
      { to: "/account", label: "Settings", icon: Settings },
    ],
  },
];

const SIDEBAR_ID  = "app-sidebar";
const DRAWER_ID   = "app-sidebar-drawer";
const COLLAPSE_KEY = "candidateNavCollapsed";

function readCollapsed() {
  try { return window.localStorage.getItem(COLLAPSE_KEY) === "1"; }
  catch { return false; }
}
function writeCollapsed(v) {
  try { window.localStorage.setItem(COLLAPSE_KEY, v ? "1" : "0"); }
  catch { /* non-fatal */ }
}

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

// ─────────────────────────────────────────────────────────────────────────────
// SidebarNav
// ─────────────────────────────────────────────────────────────────────────────
function SidebarNav({ collapsed, onNavigate, label }) {
  const { isAuthenticated } = useAccountAuth();
  const { search }          = useLocation();
  const [counts, setCounts] = useState({ assessments: 0 });

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let active = true;
    api
      .get("/candidate-dashboard", { headers: accountAuthHeader() })
      .then(({ data }) => {
        if (!active) return;
        const assessments = data.assessments || [];
        setCounts({
          assessments: assessments.filter(
            (a) => !["completed", "expired", "cancelled"].includes(String(a.status || "").toLowerCase())
          ).length,
        });
      })
      .catch(() => {});
    return () => { active = false; };
  }, [isAuthenticated]);

  const groups = isAuthenticated
    ? ACCOUNT_NAV_GROUPS
    : [{ label: null, items: PUBLIC_NAV }];

  return (
    <nav aria-label={label} className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-3">
      {groups.map((group) => (
        <div key={group.label || "public"} className="mb-4 last:mb-0">
          {group.label && !collapsed && (
            <p className="mb-1 px-3 pt-2 text-[10px] font-semibold uppercase tracking-widest text-[#9BAAA1]">
              {group.label}
            </p>
          )}
          {group.items.map((item) => {
            const isHidden =
              (item.hideWhenRecommended && search.includes("recommended=1")) ||
              (item.recommendedOnly && !search.includes("recommended=1"));

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) => {
                  const active = isActive && !isHidden;
                  return [
                    "relative flex items-center gap-3 rounded-control py-2.5 text-[13px] font-medium whitespace-nowrap",
                    "transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                    collapsed ? "justify-center px-2" : "px-3",
                    active
                      ? "before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r-full before:bg-[#176B45] bg-[#E8F2EC] font-semibold text-[#176B45]"
                      : "text-[#64736A] hover:bg-[#DDECE3] hover:text-text",
                  ].join(" ");
                }}
              >
                {({ isActive }) => {
                  const active = isActive && !isHidden;
                  return (
                    <>
                      <item.icon
                        className={`h-4 w-4 shrink-0 transition-colors ${active ? "text-[#176B45]" : "text-[#9BAAA1]"}`}
                        aria-hidden="true"
                      />
                      <span className={collapsed ? "sr-only" : "min-w-0 flex-1 whitespace-normal wrap-break-word"}>{item.label}</span>
                      {item.badgeKey && !collapsed && counts[item.badgeKey] > 0 && (
                        <span className="ml-auto inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-[#176B45] text-[10px] font-bold text-white px-1.5 py-0.5">
                          {counts[item.badgeKey]}
                        </span>
                      )}
                    </>
                  );
                }}
              </NavLink>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SidebarBrand
// ─────────────────────────────────────────────────────────────────────────────
function SidebarBrand({ collapsed, onNavigate }) {
  if (collapsed) {
    return (
      <Link
        to="/"
        onClick={onNavigate}
        title="AptusHire"
        className="flex h-16 shrink-0 items-center justify-center border-b border-[#E5EBE7] px-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <AptusMark size={32} />
        <span className="sr-only">AptusHire, home</span>
      </Link>
    );
  }
  return (
    <div className="flex h-16 shrink-0 items-center border-b border-[#E5EBE7] px-5">
      <BrandLogo to="/" size="lg" textWeight="font-semibold" theme="light" onClick={onNavigate} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HeaderActions
// ─────────────────────────────────────────────────────────────────────────────
function HeaderActions({ onNavigate }) {
  const { isAuthenticated, user } = useAccountAuth();
  const navigate = useNavigate();

  const baseAction =
    "tap-target inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[14px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/20";

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {!isAuthenticated ? (
        <>
          <Link
            to="/login"
            onClick={onNavigate}
            className={`${baseAction} text-[#17221C] hover:bg-[#DDECE3]`}
          >
            Log In
          </Link>
          <Link
            to="/register"
            onClick={onNavigate}
            className="tap-target inline-flex items-center justify-center rounded-full bg-[#176B45] px-5 py-2.5 text-[14px] font-semibold text-white shadow-[0_1px_4px_rgba(27,67,50,0.07)] transition-colors hover:bg-[#176B45]-dark focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/25"
          >
            Register
          </Link>
        </>
      ) : (
        <>
          <NotificationBell />
          <Link
            to="/account"
            onClick={onNavigate}
            className={`${baseAction} text-[#17221C] hover:bg-[#DDECE3]`}
          >
            <UserRound className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="hidden max-w-[10rem] truncate sm:inline">
              {user?.name || "Account"}
            </span>
          </Link>
          <button
            type="button"
            onClick={() => { logoutAccount(); onNavigate?.(); navigate("/login"); }}
            className={`${baseAction} text-[#64736A] hover:bg-[#DDECE3] hover:text-text`}
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">Log Out</span>
            <span className="sr-only sm:hidden">Log Out</span>
          </button>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ShellInner
// ─────────────────────────────────────────────────────────────────────────────
function ShellInner({ children }) {
  const [collapsed, setCollapsed]   = useState(readCollapsed);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { pathname }                = useLocation();
  const { theme, setTheme }         = useTheme();
  const panelRef                    = useRef(null);
  const closeRef                    = useRef(null);

  // Lock to light palette
  useEffect(() => {
    if (theme !== "light") setTheme("light");
    const root = document.documentElement;
    root.classList.remove("dark");
    root.classList.add("light");
  }, [theme, setTheme]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((v) => { writeCollapsed(!v); return !v; });
  }, []);

  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const mq = window.matchMedia("(min-width: 1024px)");
    const close = () => mq.matches && setDrawerOpen(false);
    close();
    mq.addEventListener("change", close);
    return () => mq.removeEventListener("change", close);
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const panel  = panelRef.current;
    const opener = document.activeElement;
    closeRef.current?.focus();

    function onKeyDown(e) {
      if (e.key === "Escape") { setDrawerOpen(false); return; }
      if (e.key !== "Tab" || !panel) return;
      const items = panel.querySelectorAll(FOCUSABLE);
      if (!items.length) return;
      const first = items[0];
      const last  = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prev;
      if (opener instanceof HTMLElement && document.contains(opener))
        opener.focus({ preventScroll: true });
    };
  }, [drawerOpen]);

  return (
    <div className="candidate-side flex min-h-screen bg-[#F8FAF9] text-[#17221C]">
      {/* Skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-card focus:bg-[#176B45] focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white focus:shadow-soft"
      >
        Skip to main content
      </a>

      {/* ── Desktop persistent sidebar ──────────────────────────── */}
      <aside
        id={SIDEBAR_ID}
        className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-[#E5EBE7] bg-white transition-[width] duration-200 motion-reduce:transition-none lg:flex ${
          collapsed ? "w-[4.5rem]" : "w-64"
        }`}
      >
        <SidebarBrand collapsed={collapsed} />
        <SidebarNav collapsed={collapsed} label="Main" />
        {/* Collapse toggle */}
        <div className="border-t border-[#E5EBE7] p-3">
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex w-full items-center justify-center gap-2 rounded-control py-2 text-xs font-medium text-[#9BAAA1] transition-colors hover:bg-[#DDECE3] hover:text-[#64736A]"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* ── Mobile drawer ────────────────────────────────────────── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            aria-hidden="true"
            onClick={() => setDrawerOpen(false)}
          />
          <div
            ref={panelRef}
            id={DRAWER_ID}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-[#E5EBE7] bg-white shadow-lift"
          >
            <button
              ref={closeRef}
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
              className="tap-target absolute right-3 top-4 inline-flex h-9 w-9 items-center justify-center rounded-control text-[#64736A] transition-colors hover:bg-[#DDECE3] hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            <SidebarBrand onNavigate={() => setDrawerOpen(false)} />
            <SidebarNav label="Menu" onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      {/* ── Main content column ──────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Sticky header */}
        <header className="sticky top-0 z-40 flex h-[68px] items-center justify-between gap-3 border-b border-[#E5EBE7] bg-white/95 px-5 shadow-[0_1px_4px_rgba(27,67,50,0.07)] backdrop-blur-md sm:px-8">
          <div className="flex min-w-0 items-center gap-2">
            {/* Mobile: open drawer */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              aria-expanded={drawerOpen}
              aria-controls={drawerOpen ? DRAWER_ID : undefined}
              className="tap-target -ml-1.5 inline-flex items-center justify-center rounded-control p-1.5 text-[#64736A] transition-colors hover:bg-[#DDECE3] hover:text-[#176B45] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 lg:hidden"
            >
              <Menu className="h-6 w-6" aria-hidden="true" />
            </button>
            {/* Brand on mobile (sidebar hidden) */}
            <BrandLogo
              to="/"
              size="md"
              textWeight="font-medium"
              theme="light"
              className="lg:hidden"
            />
          </div>

          <HeaderActions />
        </header>

        <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
          <div className="mx-auto max-w-[1440px] px-5 py-6 sm:px-8 sm:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function AppShell({ children }) {
  return (
    <NotificationProvider>
      <ShellInner>{children}</ShellInner>
    </NotificationProvider>
  );
}
