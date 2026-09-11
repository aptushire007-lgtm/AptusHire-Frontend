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
  ChevronRight,
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
      { to: "/", label: "Find Jobs", icon: Briefcase, end: true, hideWhenRecommended: true },
      { to: "/?recommended=1", label: "Recommended", icon: Sparkles, recommendedOnly: true },
      { to: "/saved-jobs", label: "Saved Jobs", icon: Bookmark },
      { to: "/applied-jobs", label: "Applied Jobs", icon: FileText },
      { to: "/assessments", label: "Assessment", icon: ClipboardList, badgeKey: "assessments" },
    ],
  },
  {
    divider: true,
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
      .get("/candidate-dashboard/summary", { headers: accountAuthHeader() })
      .then(({ data }) => {
        if (!active) return;
        setCounts({ assessments: Number(data.assessmentCount) || 0 });
      })
      .catch(() => {});
    return () => { active = false; };
  }, [isAuthenticated]);

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
                onClick={onNavigate}
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
                        className={`h-[18px] w-[18px] shrink-0 transition-colors ${active ? "text-[#0F172A]" : "text-[#64748B] group-hover:text-[#F97316]"}`}
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
        to="/"
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
        to="/"
        size="lg"
        textWeight="font-semibold"
        theme="light"
        nameColorClassName="text-[#2563EB]"
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

  const baseAction =
    "tap-target inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[14px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#F97316]/20";

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {!isAuthenticated ? (
        <>
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
        </>
      ) : (
        <>
          <NotificationBell />
          <Link
            to="/profile"
            onClick={onNavigate}
            className={`${baseAction} text-[#0F172A] hover:bg-[#F1F5F9]`}
          >
            <UserRound className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="hidden max-w-[10rem] truncate sm:inline">
              {user?.name || "Account"}
            </span>
          </Link>
          <button
            type="button"
            onClick={() => { logoutAccount(); onNavigate?.(); navigate("/login"); }}
            className={`${baseAction} text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]`}
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
          collapsed ? "w-[4.5rem]" : "w-[calc(18rem+1cm)]"
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
            className="absolute inset-y-0 left-0 flex w-[calc(18rem+1cm)] max-w-[85vw] flex-col border-r border-[#E2E8F0] bg-white shadow-lift"
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
        <header className="sticky top-0 z-40 flex h-[68px] items-center justify-between gap-3 border-b border-[#E2E8F0] bg-white/95 px-5 shadow-[0_1px_3px_rgba(0,0,0,0.07)] backdrop-blur-md sm:px-8">
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
