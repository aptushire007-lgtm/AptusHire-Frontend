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
import ThemeToggle from "../ui/ThemeToggle.jsx";
import { useTheme } from "../../context/ThemeContext.jsx";
import api from "../../api/client.js";
import { accountAuthHeader } from "../../auth/accountAuth.js";

/**
 * The candidate app's chrome: a collapsible left rail, a slim header that owns
 * identity, and the content column.
 *
 * DESIGN.md used to say this app has no sidebar, on the grounds that a fixed
 * 256px rail of mostly-irrelevant links spends a quarter of a phone viewport
 * saying so. That objection is answered by collapsibility rather than by going
 * back to a top bar: the rail is off-canvas below `lg`, and above it the reader
 * can drop it to an icon-only strip and keep the choice. The doc has been
 * updated to match.
 *
 * Division of labour, same as the admin shell so the two apps don't drift:
 * the SIDEBAR holds destinations, the HEADER holds who you are (notifications,
 * account, sign in/out). Nothing appears in both.
 */

// Public destinations. "How it Works" is the explainer for someone still
// deciding whether to trust an AI screen — it lives on the marketing landing
// page. A signed-in candidate has already decided and is now inside a process
// with state; sending them back out to the pitch is chrome that costs a row and
// tells them nothing about their application. So it is public-only, not
// permanent.
//
// "Interview Dashboard" (/portal/dashboard) is deliberately in NEITHER list: it
// needs a magic-link session, so for a signed-in candidate without one it is a
// dead end that looks like their dashboard.
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
    label: "My Progress",
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

// Fixed ids rather than useId(): `aria-controls` has to name a node that
// actually exists, and both of these are referenced from a control that lives
// in a different component.
const SIDEBAR_ID = "app-sidebar";
const DRAWER_ID = "app-sidebar-drawer";

// Remembered across visits — a reader who collapsed the rail to get their
// screen back does not want to redo it on every page load. Wrapped because
// localStorage throws outright in some privacy modes, and a nav that crashes
// the app is a worse outcome than a nav that forgets.
const COLLAPSE_KEY = "candidateNavCollapsed";
function readCollapsed() {
  try {
    return window.localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}
function writeCollapsed(value) {
  try {
    window.localStorage.setItem(COLLAPSE_KEY, value ? "1" : "0");
  } catch {
    /* non-fatal: the preference just doesn't survive the session */
  }
}

const NAV_ROW =
  "tap-target flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[13px] font-medium whitespace-nowrap transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600";

const HEADER_ACTION =
  "tap-target inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[15px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 dark:hover:bg-slate-800 dark:text-slate-300";

// Everything the drawer's focus trap considers reachable.
const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

// `label` is a required distinction, not decoration. The persistent rail is
// still in the DOM below `lg` behind `hidden`, so when the drawer is open there
// are two of these mounted at once — and two navigation landmarks sharing one
// name is a maze to anyone listing landmarks to get their bearings.
function SidebarNav({ collapsed, onNavigate, label }) {
  const { isAuthenticated } = useAccountAuth();
  const { search } = useLocation();
  const [counts, setCounts] = useState({ assessments: 0 });

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let active = true;
    api.get("/candidate-dashboard", { headers: accountAuthHeader() })
      .then(({ data }) => {
        if (!active) return;
        const assessments = data.assessments || [];
        setCounts({
          assessments: assessments.filter((assessment) => !["completed", "expired", "cancelled"].includes(String(assessment.status || "").toLowerCase())).length,
        });
      })
      .catch(() => {});
    return () => { active = false; };
  }, [isAuthenticated]);

  const groups = isAuthenticated
    ? ACCOUNT_NAV_GROUPS
    : [{ label: null, items: PUBLIC_NAV }];

  return (
    <nav aria-label={label} className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-2">
      {groups.map((group) => (
        <div key={group.label || "public"} className="mb-4 last:mb-0">
          {group.label && !collapsed && (
            <p className="px-3 pb-2 pt-3 text-[11px] font-medium uppercase tracking-[0.12em] text-[#8C9790]">
              {group.label}
            </p>
          )}
          {group.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `${NAV_ROW} ${collapsed ? "justify-center px-2" : ""} ${
                  isActive && !item.anchor && !(item.hideWhenRecommended && search.includes("recommended=1")) && !(item.recommendedOnly && !search.includes("recommended=1"))
                    ? "bg-[#EAF9E1] font-semibold text-[#214740]"
                    : "text-[#707E79] hover:bg-[#F7F8F8] hover:text-[#2E2F2D]"
                }`
              }
            >
              <item.icon className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
              <span className={collapsed ? "sr-only" : "truncate"}>{item.label}</span>
              {item.badgeKey && !collapsed && (
                <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-md bg-[#F0F2F5] px-1.5 py-0.5 text-[11px] font-bold text-[#67736E]">
                  {counts[item.badgeKey] || 0}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}

function SidebarBrand({ collapsed, onNavigate }) {
  if (collapsed) {
    return (
      <Link
        to="/"
        onClick={onNavigate}
        title="AptusHire"
        className="flex h-16 shrink-0 items-center justify-center rounded-lg px-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
      >
        <AptusMark size={32} />
        <span className="sr-only">AptusHire, home</span>
      </Link>
    );
  }

  return (
    <div className="flex h-16 shrink-0 items-center px-5">
      <BrandLogo to="/" size="lg" textWeight="font-semibold" theme="light" className="uppercase" onClick={onNavigate} />
    </div>
  );
}

/** Identity and session — the header's right side, at every width. */
function HeaderActions({ onNavigate, showThemeToggle = true }) {
  const { isAuthenticated, user } = useAccountAuth();
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {showThemeToggle && <ThemeToggle />}
      {!isAuthenticated ? (
        <>
          <Link
            to="/login"
            onClick={onNavigate}
            className={`${HEADER_ACTION} bg-transparent text-[#214740] hover:bg-[#EAF9E1] focus-visible:ring-[#C1EBAD]`}
          >
            Log In
          </Link>
          <Link
            to="/register"
            onClick={onNavigate}
            className="tap-target inline-flex items-center justify-center rounded-full bg-[#214740] px-5 py-2.5 text-[15px] font-semibold text-white shadow-[0_8px_20px_rgba(33,71,64,0.16)] transition-colors hover:bg-[#2E4F48] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#C1EBAD]"
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
            className={`${HEADER_ACTION} !bg-transparent !text-[#214740] hover:!bg-[#EAF9E1] hover:!text-[#214740] focus-visible:ring-[#C1EBAD]`}
          >
            <UserRound className="h-4 w-4 shrink-0" aria-hidden="true" />
            {/* The name is the first thing to go on a narrow header — the icon
                still identifies the destination, and a long display name would
                otherwise push the row wider than the viewport. */}
            <span className="hidden max-w-[10rem] truncate sm:inline">{user?.name || "Account"}</span>
          </Link>
          <button
            type="button"
            onClick={() => {
              logoutAccount();
              onNavigate?.();
              navigate("/login");
            }}
            className={`${HEADER_ACTION} !bg-transparent !text-[#214740] hover:!bg-[#EAF9E1] hover:!text-[#214740] focus-visible:ring-[#C1EBAD]`}
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

function ShellInner({ children }) {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { pathname } = useLocation();
  const { theme, setTheme } = useTheme();
  // The candidate product uses one fixed light AptusHire palette across every
  // route. Keeping this at shell level prevents profile, resume, job and apply
  // screens from restoring unrelated legacy dark surfaces between navigations.
  const usesLightPortalTheme = true;
  const panelRef = useRef(null);
  const closeRef = useRef(null);

  // Keep the whole candidate product on the fixed AptusHire light palette.
  // Updating the provider as well as the root avoids a mount-order race where
  // a previously saved dark preference repainted nested profile cards after
  // this shell had already made its own surface light.
  useEffect(() => {
    if (theme !== "light") setTheme("light");
    const root = document.documentElement;
    root.classList.remove("dark");
    root.classList.add("light");
  }, [theme, setTheme]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((v) => {
      writeCollapsed(!v);
      return !v;
    });
  }, []);

  // Following a link inside the drawer navigates; the drawer has no reason to
  // still be covering the page you just asked for.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // The drawer's own close button is `lg:hidden`. If the viewport crosses into
  // `lg` while it is open, that button disappears along with it — and the body
  // scroll lock below would outlive the only way to release it. Close on the
  // breakpoint rather than hiding an open drawer at it.
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const mq = window.matchMedia("(min-width: 1024px)");
    const close = () => mq.matches && setDrawerOpen(false);
    close();
    mq.addEventListener("change", close);
    return () => mq.removeEventListener("change", close);
  }, [drawerOpen]);

  // Drawer behaviour while open: lock the page behind it, keep Tab inside it,
  // close on Escape, and hand focus back to whatever opened it. Without the
  // trap, Tab walks straight out of the panel into the page under the scrim —
  // which a sighted mouse user cannot reach but a keyboard user silently can.
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const panel = panelRef.current;
    const opener = document.activeElement;
    closeRef.current?.focus();

    function onKeyDown(event) {
      if (event.key === "Escape") {
        setDrawerOpen(false);
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const items = panel.querySelectorAll(FOCUSABLE);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (opener instanceof HTMLElement && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, [drawerOpen]);

  return (
    <div
      className={`candidate-side flex min-h-screen ${
        usesLightPortalTheme
          ? "bg-[#ECF3EB] text-[#2E2F2D]"
          : ""
      }`}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-xl focus:bg-brand-600 focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white focus:shadow-soft"
      >
        Skip to main content
      </a>

      {/* Persistent rail, `lg` and up. */}
      <aside
        id={SIDEBAR_ID}
        className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r bg-white/90 backdrop-blur transition-[width] duration-200 motion-reduce:transition-none lg:flex ${
          usesLightPortalTheme ? "border-[#EDF1ED]" : "border-slate-200/80 dark:border-slate-800/80 dark:bg-slate-950/90"
        } ${collapsed ? "w-[4.5rem]" : "w-64"}`}
      >
        <SidebarBrand collapsed={collapsed} />
        <SidebarNav collapsed={collapsed} label="Main" />
      </aside>

      {/* Off-canvas drawer, below `lg`. */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
            aria-hidden="true"
            onClick={() => setDrawerOpen(false)}
          />
          <div
            ref={panelRef}
            id={DRAWER_ID}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-slate-200/80 bg-white shadow-soft dark:border-slate-800/80 dark:bg-slate-950"
          >
            <button
              ref={closeRef}
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
              className="tap-target absolute right-3 top-4 inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            <SidebarBrand onNavigate={() => setDrawerOpen(false)} />
            <SidebarNav label="Menu" onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className={`sticky top-0 z-40 flex h-[72px] items-center justify-between gap-3 border-b bg-[#FBFDF8]/95 px-5 backdrop-blur-md transition-colors sm:px-8 ${
            usesLightPortalTheme ? "border-[#EDF1ED]" : "border-slate-200/80 dark:border-slate-800/80 dark:bg-slate-950/80"
          }`}
        >
          <div className="flex min-w-0 items-center gap-2">
            {/* Two controls, not one with branching behaviour: below `lg` the
                rail is off-canvas and the gesture is "open the menu"; above it
                the rail is already there and the gesture is "give me the
                space back". Conflating them makes the icon lie at one width. */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              aria-expanded={drawerOpen}
              aria-controls={drawerOpen ? DRAWER_ID : undefined}
              className="tap-target -ml-1.5 inline-flex items-center justify-center rounded-lg p-1.5 text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 lg:hidden"
            >
              <Menu className="h-6 w-6" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!collapsed}
              aria-controls={SIDEBAR_ID}
              className="tap-target -ml-1.5 hidden items-center justify-center rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 lg:inline-flex"
            >
              {collapsed ? (
                <PanelLeftOpen className="h-5 w-5" aria-hidden="true" />
              ) : (
                <PanelLeftClose className="h-5 w-5" aria-hidden="true" />
              )}
            </button>

            {/* The wordmark lives in the rail; below `lg` the rail is off-canvas,
                so the header carries it instead. */}
            <BrandLogo to="/" size="md" textWeight="font-medium" theme="light" className="lg:hidden" />
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <HeaderActions showThemeToggle={!usesLightPortalTheme} />
          </div>
        </header>

        <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
          <div className="mx-auto max-w-[1440px] px-5 py-6 sm:px-8 sm:py-8">{children}</div>
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
