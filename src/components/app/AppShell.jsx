import { useCallback, useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Sparkles,
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  FileText,
  Briefcase,
  BookOpen,
  Bookmark,
  ClipboardList,
  Video,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
  ChevronDown,
  Search,
  User,
  MoreHorizontal,
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
    divider: false,
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
      { to: "/?recommended=1&view=top", label: "Recommended", icon: Sparkles, end: true },
      { to: "/saved-jobs", label: "Saved Jobs", icon: Bookmark },
      { to: "/applied-jobs", label: "Applied Jobs", icon: FileText },
      // The /interviews route has always existed and rendered scheduled
      // interviews correctly — nothing in the signed-in app linked to it, so a
      // candidate with an interview booked had no door to it and reported the
      // interview as "not showing". The badge carries the same count the page
      // lists, so a waiting interview is visible from every screen.
      { to: "/interviews", label: "Interviews", icon: Video, badgeKey: "interviews" },
      { to: "/assessments", label: "Assessment", icon: ClipboardList, badgeKey: "assessments" },
    ],
  },
];

// The bottom tab bar (mobile, authenticated) surfaces the three most-used
// destinations directly; everything else lives behind "More".
const BOTTOM_TAB_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/?recommended=1&view=top", label: "Recommended", icon: Sparkles, end: true },
  { to: "/assessments", label: "Assessments", icon: ClipboardList, badgeKey: "assessments" },
];

const MORE_SHEET_ITEMS = [
  { to: "/account", label: "Settings", icon: Settings },
  { to: "/saved-jobs", label: "Saved Jobs", icon: Bookmark },
  { to: "/applied-jobs", label: "Applied Jobs", icon: FileText },
];
const MORE_SHEET_PATHS = MORE_SHEET_ITEMS.map((item) => item.to);

const SIDEBAR_ID   = "app-sidebar";
const DRAWER_ID    = "app-sidebar-drawer";
const MORE_SHEET_ID = "app-more-sheet";
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
// Shared hooks
// ─────────────────────────────────────────────────────────────────────────────

// Used by both the sidebar/drawer nav and the mobile bottom tab bar, so the
// assessment badge count stays in sync without fetching it twice per render.
function useAssessmentBadgeCount() {
  const { isAuthenticated } = useAccountAuth();
  const { search }          = useLocation();
  const [counts, setCounts] = useState({ assessments: 0, interviews: 0 });

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let active = true;
    api
      .get("/candidate-dashboard/summary", { headers: accountAuthHeader() })
      .then(({ data }) => {
        if (!active) return;
        setCounts({
          assessments: Number(data.assessmentCount) || 0,
          interviews: Number(data.interviewCount) || 0,
        });
      })
      .catch(() => {});
    return () => { active = false; };
  }, [isAuthenticated]);

  return counts;
}

// Shared a11y wiring for a dismissable overlay panel (the mobile sidebar
// drawer and the "More" bottom sheet both need it): Escape to close, Tab
// trapped inside the panel, body scroll locked while open, and focus
// restored to whatever opened it on close.
function useOverlayA11y(open, panelRef, closeRef) {
  useEffect(() => {
    if (!open) return undefined;
    const panel  = panelRef.current;
    const opener = document.activeElement;
    closeRef.current?.focus();

    function onKeyDown(e) {
      if (e.key === "Escape") { closeRef.current?.click(); return; }
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
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
}

// ─────────────────────────────────────────────────────────────────────────────
// SidebarNav
// ─────────────────────────────────────────────────────────────────────────────
function SidebarNav({ collapsed, onNavigate, label }) {
  const { isAuthenticated } = useAccountAuth();
  const { search }          = useLocation();
  const navigate             = useNavigate();
  const counts               = useAssessmentBadgeCount();

  const groups = isAuthenticated
    ? ACCOUNT_NAV_GROUPS
    : [{ divider: false, items: PUBLIC_NAV }];

  return (
    <nav aria-label={label} className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-3">
      {groups.map((group, groupIndex) => (
        <div key={groupIndex} className="contents">
          {group.divider && <hr className="my-3 border-t border-[#E2E8F0]" />}
          {group.items.map((item) => {
            const isHidden =
              (item.hideWhenRecommended && search.includes("recommended=1")) ||
              (item.recommendedOnly && !search.includes("recommended=1"));

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={(event) => {
                  onNavigate?.();
                  if (item.label === "Recommended") {
                    event.preventDefault();
                    navigate("/?recommended=1&view=top");
                  }
                }}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) => {
                  const active = isActive && !isHidden;
                  return [
                    "group flex items-center gap-3 rounded-xl py-2.5 text-[15px] font-semibold text-[#1E293B] whitespace-nowrap",
                    "transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316]",
                    collapsed ? "justify-center px-2" : "px-3",
                    active ? "bg-[#F1F5F9]" : "hover:bg-[#FEF3E8]",
                  ].join(" ");
                }}
              >
                {({ isActive }) => {
                  const active = isActive && !isHidden;
                  return (
                    <>
                      <item.icon
                        className={`h-[18px] w-[18px] shrink-0 transition-colors ${active ? "text-[#0F172A]" : "text-[#64748B] group-hover:text-[#7C3F10]"}`}
                        aria-hidden="true"
                      />
                      <span className={collapsed ? "sr-only" : "min-w-0 flex-1 whitespace-normal"}>{item.label}</span>
                      {item.badgeKey && !collapsed && counts[item.badgeKey] > 0 && (
                        <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-[#F1F5F9] text-[11px] font-bold text-[#475569] px-1.5 py-0.5">
                          {counts[item.badgeKey]}
                        </span>
                      )}
                      {!collapsed && (
                        <ChevronRight
                          className="h-4 w-4 shrink-0 text-[#F97316] opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                          aria-hidden="true"
                        />
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
// SidebarGreeting
// ─────────────────────────────────────────────────────────────────────────────
function SidebarGreeting() {
  const { isAuthenticated, user } = useAccountAuth();
  if (!isAuthenticated) return null;
  const firstName = user?.name?.trim().split(/\s+/)[0] || "there";
  return (
    <p className="px-5 pb-1 pt-4 text-[19px] font-bold text-[#0F172A]">
      Welcome, {firstName}!
    </p>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SidebarBrand
// ─────────────────────────────────────────────────────────────────────────────
function SidebarBrand({ collapsed, onNavigate }) {
  if (collapsed) {
    return (
      <Link
        to="/welcome"
        onClick={onNavigate}
        title="AptusHire"
        className="flex h-[68px] shrink-0 items-center justify-center bg-white px-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316]"
      >
        <AptusMark size={32} />
        <span className="sr-only">AptusHire, home</span>
      </Link>
    );
  }
  return (
    // Same height and border colour as the content header on the right, so the
    // two strips read as one continuous white bar across the top of the page.
    <div className="flex h-[68px] shrink-0 items-center bg-white px-5">
      <BrandLogo
        to="/welcome"
        variant="image"
        size={50}
        onClick={onNavigate}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HeaderActions
// ─────────────────────────────────────────────────────────────────────────────
function HeaderActions({ onNavigate }) {
  const { isAuthenticated, user } = useAccountAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handler = (e) => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const baseAction =
    "tap-target inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[14px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#F97316]/20";

  const initials = (user?.name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "A";

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-1.5 sm:gap-2">
        <Link
          to="/login"
          onClick={onNavigate}
          className={`${baseAction} text-[#0F172A] hover:bg-[#F1F5F9]`}
        >
          Log In
        </Link>
        <Link
          to="/register"
          onClick={onNavigate}
          className="tap-target inline-flex items-center justify-center rounded-full bg-[#F97316] px-5 py-2.5 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-[#EA6C0A] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#F97316]/25"
        >
          Register
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <NotificationBell />

      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="tap-target flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 transition-colors hover:bg-[#F1F5F9] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#F97316]/20"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FEF3E8] text-[12px] font-bold text-[#F97316]">
            {initials}
          </span>
          <span className="hidden max-w-[10rem] truncate text-[14px] font-semibold text-[#0F172A] sm:inline">
            {user?.name || "Account"}
          </span>
          <ChevronDown className="hidden h-4 w-4 shrink-0 text-[#64748B] sm:inline" aria-hidden="true" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-60 overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_8px_28px_rgba(0,0,0,0.12)]">
            {(user?.name || user?.email) && (
              <div className="border-b border-[#F0F2F4] px-4 py-3">
                {user?.name && <p className="truncate text-[14px] font-semibold text-[#0F172A]">{user.name}</p>}
                {user?.email && <p className="truncate text-[12px] text-[#64748B]">{user.email}</p>}
              </div>
            )}
            {/* Update Profile: available at every breakpoint (desktop previously
                had no entry point to it from this menu — only Settings). */}
            <Link
              to="/profile"
              onClick={() => { setMenuOpen(false); onNavigate?.(); }}
              className="flex items-center gap-2.5 px-4 py-2.5 text-[14px] font-medium text-[#0F172A] hover:bg-[#F4F6F9]"
            >
              <User className="h-4 w-4 shrink-0 text-[#64748B]" aria-hidden="true" />
              Update Profile
            </Link>
            <Link
              to="/account"
              onClick={() => { setMenuOpen(false); onNavigate?.(); }}
              className="hidden items-center gap-2.5 px-4 py-2.5 text-[14px] font-medium text-[#0F172A] hover:bg-[#F4F6F9] lg:flex"
            >
              <Settings className="h-4 w-4 shrink-0 text-[#64748B]" aria-hidden="true" />
              Settings
            </Link>
            <button
              type="button"
              onClick={() => { setMenuOpen(false); logoutAccount(); onNavigate?.(); navigate("/login"); }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[14px] font-medium text-[#0F172A] hover:bg-[#F4F6F9]"
            >
              <LogOut className="h-4 w-4 shrink-0 text-[#64748B]" aria-hidden="true" />
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ShellInner
// ─────────────────────────────────────────────────────────────────────────────
function ShellInner({ children }) {
  const [collapsed, setCollapsed]   = useState(readCollapsed);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [moreOpen, setMoreOpen]     = useState(false);
  const [headerSearch, setHeaderSearch] = useState("");
  const { pathname }                = useLocation();
  const { theme, setTheme }         = useTheme();
  const { isAuthenticated }         = useAccountAuth();
  const navigate                    = useNavigate();
  const panelRef                    = useRef(null);
  const closeRef                    = useRef(null);
  const moreRef                     = useRef(null);
  const moreCloseRef                = useRef(null);

  const handleHeaderSearch = useCallback((e) => {
    e.preventDefault();
    const q = headerSearch.trim();
    navigate(q ? `/?recommended=1&q=${encodeURIComponent(q)}` : "/?recommended=1");
  }, [headerSearch, navigate]);

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

  useEffect(() => { setDrawerOpen(false); setMoreOpen(false); }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const mq = window.matchMedia("(min-width: 1024px)");
    const close = () => mq.matches && setDrawerOpen(false);
    close();
    mq.addEventListener("change", close);
    return () => mq.removeEventListener("change", close);
  }, [drawerOpen]);

  useOverlayA11y(drawerOpen, panelRef, closeRef);
  useOverlayA11y(moreOpen, moreRef, moreCloseRef);

  return (
    <div className="candidate-side flex min-h-screen bg-[#F4F6F9] text-[#0F172A]">
      {/* Skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-card focus:bg-[#F97316] focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white focus:shadow-soft"
      >
        Skip to main content
      </a>

      {/* ── Desktop persistent sidebar ──────────────────────────── */}
      <aside
        id={SIDEBAR_ID}
        className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-[#E2E8F0] bg-white transition-[width] duration-200 motion-reduce:transition-none lg:flex ${
          collapsed ? "w-[4.5rem]" : "w-[17rem]"
        }`}
      >
        <SidebarBrand collapsed={collapsed} />
        {!collapsed && <SidebarGreeting />}
        <SidebarNav collapsed={collapsed} label="Main" />
        {/* Collapse toggle */}
        <div className="border-t border-[#E2E8F0] p-3">
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex w-full items-center justify-center gap-2 rounded-control py-2 text-xs font-medium text-[#64748B] transition-colors hover:bg-[#F1F5F9] hover:text-[#0F172A]"
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
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
            aria-hidden="true"
            onClick={() => setDrawerOpen(false)}
          />
          <div
            ref={panelRef}
            id={DRAWER_ID}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="absolute inset-y-0 left-0 flex w-[17rem] max-w-[85vw] flex-col border-r border-[#E2E8F0] bg-white shadow-lift"
          >
            <button
              ref={closeRef}
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
              className="tap-target absolute right-3 top-4 inline-flex h-9 w-9 items-center justify-center rounded-control text-[#64748B] transition-colors hover:bg-[#F1F5F9] hover:text-[#0F172A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316]"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            <SidebarBrand onNavigate={() => setDrawerOpen(false)} />
            <SidebarGreeting />
            <SidebarNav label="Menu" onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      {/* ── Main content column ──────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Sticky header */}
        <header className="sticky top-0 z-40 border-b border-[#E2E8F0] bg-white/95 shadow-[0_1px_3px_rgba(0,0,0,0.07)] backdrop-blur-md">
          <div className="flex h-[68px] items-center justify-between gap-3 px-5 sm:px-8">
            <div className="flex min-w-0 items-center gap-2">
              {/* Mobile: open drawer (guests only — authenticated mobile nav lives in the bottom tab bar) */}
              {!isAuthenticated && (
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
              )}
              {/* Brand on mobile (sidebar hidden) */}
              <BrandLogo
                to="/welcome"
                variant="image"
                size={isAuthenticated ? 40 : 52}
                className="lg:hidden"
              />
            </div>

            {isAuthenticated && (
              <form onSubmit={handleHeaderSearch} className="hidden min-w-0 flex-1 max-w-md md:block">
                <label className="sr-only" htmlFor="app-header-search">Search for jobs, roles or companies</label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" aria-hidden="true" />
                  <input
                    id="app-header-search"
                    type="search"
                    value={headerSearch}
                    onChange={(e) => setHeaderSearch(e.target.value)}
                    placeholder="Search for jobs, roles or companies..."
                    className="h-10 w-full rounded-full border border-[#E5E7EB] bg-[#F8FAFC] pl-10 pr-4 text-[14px] text-[#111827] placeholder:text-[#94A3B8] transition-colors focus:border-[#F97316] focus:bg-white focus:outline-none focus:ring-3 focus:ring-[#F97316]/15"
                  />
                </div>
              </form>
            )}

            <HeaderActions />
          </div>

          {/* Mobile-only second row: full-width search (authenticated only — the row above already shows an inline search at md+) */}
          {isAuthenticated && (
            <form onSubmit={handleHeaderSearch} className="px-5 pb-3 md:hidden">
              <label className="sr-only" htmlFor="app-header-search-mobile">Search for jobs, roles or companies</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" aria-hidden="true" />
                <input
                  id="app-header-search-mobile"
                  type="search"
                  value={headerSearch}
                  onChange={(e) => setHeaderSearch(e.target.value)}
                  placeholder="Search for jobs, roles or companies..."
                  className="h-10 w-full rounded-full border border-[#E5E7EB] bg-[#F8FAFC] pl-10 pr-4 text-[14px] text-[#111827] placeholder:text-[#94A3B8] transition-colors focus:border-[#F97316] focus:bg-white focus:outline-none focus:ring-3 focus:ring-[#F97316]/15"
                />
              </div>
            </form>
          )}
        </header>

        <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
          <div className={`mx-auto max-w-[1440px] px-5 py-6 sm:px-8 sm:py-8 ${isAuthenticated ? "pb-24 lg:pb-8" : ""}`}>
            {children}
          </div>
        </main>
      </div>

      {isAuthenticated && (
        <BottomTabBar
          onOpenMore={() => setMoreOpen(true)}
          moreActive={MORE_SHEET_PATHS.includes(pathname)}
        />
      )}

      {/* ── "More" bottom sheet ─────────────────────────────────── */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
            aria-hidden="true"
            onClick={() => setMoreOpen(false)}
          />
          <div
            ref={moreRef}
            id={MORE_SHEET_ID}
            role="dialog"
            aria-modal="true"
            aria-label="More"
            className="absolute inset-x-0 bottom-0 flex max-h-[70vh] flex-col overflow-y-auto rounded-t-2xl border-t border-[#E2E8F0] bg-white pb-[calc(env(safe-area-inset-bottom)+8px)] shadow-deep"
          >
            <div className="flex items-center justify-center pt-3">
              <span className="h-1.5 w-10 rounded-full bg-[#E2E8F0]" aria-hidden="true" />
            </div>
            <div className="flex items-center justify-between px-5 pb-2 pt-3">
              <p className="text-[15px] font-bold text-[#0F172A]">More</p>
              <button
                ref={moreCloseRef}
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="Close"
                className="tap-target inline-flex h-9 w-9 items-center justify-center rounded-control text-[#64748B] transition-colors hover:bg-[#F1F5F9] hover:text-[#0F172A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316]"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <nav aria-label="More" className="flex flex-col gap-1 px-3 pb-3">
              {MORE_SHEET_ITEMS.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-semibold text-[#1E293B] transition-colors hover:bg-[#FEF3E8]"
                >
                  <item.icon className="h-[18px] w-[18px] shrink-0 text-[#64748B]" aria-hidden="true" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BottomTabBar (mobile, authenticated)
// ─────────────────────────────────────────────────────────────────────────────
function BottomTabBar({ onOpenMore, moreActive }) {
  const counts = useAssessmentBadgeCount();

  const tabClass = ({ isActive }) =>
    [
      "tap-target flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[11px] font-semibold transition-colors",
      isActive ? "text-[#F97316]" : "text-[#64748B]",
    ].join(" ");

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-[#E2E8F0] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      {BOTTOM_TAB_ITEMS.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end} className={tabClass}>
          {({ isActive }) => (
            <>
              <span className="relative">
                <item.icon className="h-5 w-5" aria-hidden="true" />
                {item.badgeKey && counts[item.badgeKey] > 0 && (
                  <span className="absolute -right-2 -top-1.5 inline-flex min-w-[1rem] items-center justify-center rounded-full bg-[#F97316] px-1 text-[9px] font-bold leading-[1rem] text-white">
                    {counts[item.badgeKey]}
                  </span>
                )}
              </span>
              <span className="block w-full truncate text-center">{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
      <button
        type="button"
        onClick={onOpenMore}
        aria-haspopup="dialog"
        aria-expanded={moreActive ? undefined : false}
        className={`tap-target flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[11px] font-semibold transition-colors ${
          moreActive ? "text-[#F97316]" : "text-[#64748B]"
        }`}
      >
        <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
        <span className="block w-full truncate text-center">More</span>
      </button>
    </nav>
  );
}

export default function AppShell({ children }) {
  return (
    <NotificationProvider>
      <ShellInner>{children}</ShellInner>
    </NotificationProvider>
  );
}
