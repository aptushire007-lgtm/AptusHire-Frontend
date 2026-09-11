/**
 * AptusHire Composite Dashboard Surfaces
 * Light theme: white/cream surfaces, green brand, gold accent, charcoal text.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight, CircleCheck, CircleDot } from "lucide-react";
import { Card, IconTile, toneText } from "./Card.jsx";

// ── PageHero ────────────────────────────────────────────────────────────────
export function PageHero({
  eyebrow,
  eyebrowIcon: EyebrowIcon,
  title,
  description,
  descriptionClassName = "",
  points = [],
  pointsClassName = "",
  action,
  as: Component = "header",
  className = "",
  ...props
}) {
  return (
    <Component
      className={`overflow-hidden rounded-panel border border-[#E2E8F0] bg-white px-6 py-7 shadow-[0_1px_4px_rgba(0,0,0,0.07)] sm:px-8 sm:py-8 ${className}`}
      {...props}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-5">
        <div className="min-w-0 max-w-2xl">
          {eyebrow && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FED7AA] bg-[#FEF3E8] px-3 py-1 text-xs font-semibold text-[#F97316]">
              {EyebrowIcon && <EyebrowIcon className="h-3.5 w-3.5" aria-hidden="true" />}
              {eyebrow}
            </span>
          )}
          <h1
            className={`font-display text-2xl font-bold tracking-tight text-[#0F172A] sm:text-3xl ${
              eyebrow ? "mt-3.5" : ""
            }`}
          >
            {title}
          </h1>
          {description && (
            <p className={`mt-2.5 max-w-prose text-sm leading-relaxed text-[#64748B] ${descriptionClassName}`}>
              {description}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      {points.length > 0 && (
        <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2.5 border-t border-[#E2E8F0]/60 pt-5">
          {points.map((point) => (
            <li
              key={point}
              className={`inline-flex items-center gap-2 text-xs font-medium text-[#64748B] ${pointsClassName}`}
            >
              <CircleCheck className="h-4 w-4 shrink-0 text-[#F97316]" aria-hidden="true" />
              {point}
            </li>
          ))}
        </ul>
      )}
    </Component>
  );
}

// ── Chip ─────────────────────────────────────────────────────────────────────
export function Chip({
  children,
  icon: Icon,
  trailing: Trailing,
  active   = false,
  as: Component = "button",
  className = "",
  ...props
}) {
  return (
    <Component
      aria-current={active && Component !== "button" ? "page" : undefined}
      aria-pressed={active && Component === "button" ? "true" : undefined}
      className={[
        "tap-target inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium whitespace-nowrap",
        "transition-colors duration-150 focus-visible:outline-none focus-visible:ring-3",
        active
          ? "border-[#F97316] bg-[#F97316] text-white shadow-[0_1px_2px_rgba(23,107,69,0.20)] focus-visible:ring-[#F97316]/25"
          : "border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#FED7AA] hover:bg-[#FEF3E8] hover:text-[#F97316] focus-visible:ring-[#F97316]/20",
        className,
      ].join(" ")}
      {...props}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />}
      {children}
      {Trailing && <Trailing className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden="true" />}
    </Component>
  );
}

// ── ChipRow ───────────────────────────────────────────────────────────────────
export function ChipRow({ children, label, className = "" }) {
  const scrollerRef = useRef(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const updateEdges = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    const next = { left: el.scrollLeft > 4, right: el.scrollLeft < maxScroll - 4 };
    setEdges((prev) =>
      prev.left === next.left && prev.right === next.right ? prev : next
    );
  }, []);

  useEffect(() => {
    updateEdges();
    const el = scrollerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    el.addEventListener("scroll", updateEdges, { passive: true });
    const ro = new ResizeObserver(updateEdges);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", updateEdges); ro.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateEdges, children]);

  const FADE = "20px";
  const maskImage =
    edges.left && edges.right
      ? `linear-gradient(to right, transparent, black ${FADE}, black calc(100% - ${FADE}), transparent)`
      : edges.right
      ? `linear-gradient(to right, black calc(100% - ${FADE}), transparent)`
      : edges.left
      ? `linear-gradient(to right, transparent, black ${FADE})`
      : undefined;

  return (
    <div
      ref={scrollerRef}
      role="group"
      aria-label={label}
      style={maskImage ? { WebkitMaskImage: maskImage, maskImage } : undefined}
      className={`-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none [&::-webkit-scrollbar]:hidden ${className}`}
    >
      {children}
    </div>
  );
}

// ── HeroStat ──────────────────────────────────────────────────────────────────
export function HeroStat({
  label,
  value,
  basis,
  tone  = "default",
  badge,
  action,
  tiles = [],
  className = "",
  ...props
}) {
  return (
    <Card tone={tone} className={`p-7 ${className}`} {...props}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm font-medium text-[#64748B]">{label}</p>
        {badge}
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-x-8 gap-y-6">
        <div className="min-w-0">
          {/* shadcn stat convention: a restrained 2xl semibold figure, not a
              display-weight banner number — the label and basis carry meaning,
              the digit just anchors it. */}
          <p className="text-2xl font-semibold tabular-nums tracking-tight text-[#0F172A]">
            {value}
          </p>
          <p className="mt-1.5 max-w-prose text-sm text-[#64748B]">{basis}</p>
          {action && <div className="mt-5">{action}</div>}
        </div>

        {tiles.length > 0 && (
          <ul className="flex flex-wrap gap-4">
            {tiles.map((t) => (
              <li key={t.label} className="flex w-16 flex-col items-center gap-1.5 text-center">
                <IconTile icon={t.icon} tone={t.tone || "brand"} />
                <span className="text-[11px] font-medium leading-tight text-[#64748B]">{t.label}</span>
                {t.value != null && (
                  <span className="text-xs font-bold tabular-nums text-[#0F172A]">{t.value}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

// ── ActionCard ────────────────────────────────────────────────────────────────
export function ActionCard({
  icon,
  iconTone,
  title,
  description,
  tone  = "default",
  action,
  className = "",
  ...props
}) {
  const t = toneText(tone);
  return (
    <Card tone={tone} className={`flex h-full flex-col ${className}`} {...props}>
      <IconTile icon={icon} tone={iconTone || t.tile} />
      <h3 className={`mt-4 text-base font-semibold ${t.strong}`}>{title}</h3>
      {description && <p className={`mt-1.5 text-sm leading-relaxed ${t.soft}`}>{description}</p>}
      {action && <div className="mt-auto pt-5">{action}</div>}
    </Card>
  );
}

// ── ListRow ───────────────────────────────────────────────────────────────────
export function ListRow({
  icon,
  iconTone  = "brand",
  title,
  meta,
  trailing,
  as: Component = "button",
  className = "",
  ...props
}) {
  return (
    <Component
      className={[
        "group flex w-full items-center gap-3 rounded-control border border-[#E2E8F0] bg-white px-4 py-3 text-left",
        "transition-colors duration-150 hover:border-[#FED7AA] hover:bg-[#FEF3E8]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316]",
        className,
      ].join(" ")}
      {...props}
    >
      {icon && <IconTile icon={icon} tone={iconTone} size="sm" />}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[#0F172A]">{title}</span>
        {meta && <span className="block truncate text-xs text-[#64748B]">{meta}</span>}
      </span>
      {trailing}
      <ChevronRight
        className="h-4 w-4 shrink-0 text-[#94A3B8] transition-colors group-hover:text-[#F97316]"
        aria-hidden="true"
      />
    </Component>
  );
}

// ── RecordCard ────────────────────────────────────────────────────────────────
export function RecordCard({
  title,
  subtitle,
  link,
  avatar,
  icon,
  iconTone = "brand",
  trailing,
  meta         = [],
  metaColumns  = 3,
  footer,
  footerTrailing,
  actions,
  className = "",
  children,
  ...props
}) {
  const metaCols = {
    2: "grid-cols-2",
    3: "grid-cols-2 sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-4",
  };

  return (
    <Card
      padding="compact"
      className={`relative flex h-full flex-col transition-[box-shadow,border-color] duration-150 hover:border-[#FED7AA]/30 hover:shadow-soft ${className}`}
      {...props}
    >
      <div className="flex items-start gap-3">
        {avatar}
        {icon && <IconTile icon={icon} tone={iconTone} size="sm" />}
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-[#0F172A] wrap-anywhere">
            <RecordLink link={link}>{title}</RecordLink>
          </h3>
          {subtitle && <p className="mt-0.5 text-xs text-[#64748B] wrap-anywhere">{subtitle}</p>}
        </div>
        {trailing && <div className="shrink-0">{trailing}</div>}
      </div>

      {meta.length > 0 && (
        <dl className={`mt-3 grid gap-x-4 gap-y-2.5 ${metaCols[metaColumns] ?? metaCols[3]}`}>
          {meta.map((m) => (
            <div key={m.label} className="min-w-0">
              <dt className="text-[11px] font-semibold text-[#94A3B8]">{m.label}</dt>
              <dd className="mt-0.5 text-sm text-[#0F172A] wrap-anywhere">
                {m.value == null || m.value === "" ? "—" : m.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {children}

      {(footer || footerTrailing) && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-t border-[#E2E8F0] pt-2.5 text-xs text-[#64748B]">
          <span className="min-w-0 wrap-anywhere">{footer}</span>
          {footerTrailing && <span className="shrink-0">{footerTrailing}</span>}
        </div>
      )}

      {actions && (
        <div className="relative z-10 mt-auto flex flex-wrap items-center gap-2 pt-3">
          {actions}
        </div>
      )}
    </Card>
  );
}

// ── RecordRow ─────────────────────────────────────────────────────────────────
export function RecordRow({
  title,
  subtitle,
  link,
  avatar,
  icon,
  iconTone = "brand",
  meta     = [],
  trailing,
  note,
  actions,
  className = "",
  children,
  ...props
}) {
  return (
    <li
      className={`relative bg-white px-4 py-3 transition-colors duration-150 hover:bg-[#FEF3E8] ${className}`}
      {...props}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {avatar}
          {icon && <IconTile icon={icon} tone={iconTone} size="sm" />}
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-[#0F172A]">
              <RecordLink link={link}>{title}</RecordLink>
            </h3>
            {subtitle && <p className="truncate text-xs text-[#64748B]">{subtitle}</p>}
          </div>
        </div>

        {meta.length > 0 && (
          <dl className="hidden shrink-0 items-start gap-x-6 xl:flex">
            {meta.map((m) => (
              <div key={m.label} className="w-32 min-w-0">
                <dt className="text-[11px] font-semibold text-[#94A3B8]">{m.label}</dt>
                <dd className="mt-0.5 truncate text-sm text-[#0F172A]">
                  {m.value == null || m.value === "" ? "—" : m.value}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {trailing && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end xl:w-72 xl:flex-nowrap xl:justify-start">
            {trailing}
          </div>
        )}

        {actions && (
          <div className="relative z-10 flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>
      {note && <div className="mt-2 text-xs text-[#64748B] wrap-anywhere">{note}</div>}
      {children}
    </li>
  );
}

// ── RecordList ────────────────────────────────────────────────────────────────
export function RecordList({ children, label, className = "" }) {
  return (
    <ul
      aria-label={label}
      className={`divide-y divide-[#E2E8F0] overflow-hidden rounded-card border border-[#E2E8F0] shadow-[0_1px_4px_rgba(0,0,0,0.07)] ${className}`}
    >
      {children}
    </ul>
  );
}

// ── RecordGrid ────────────────────────────────────────────────────────────────
export function RecordGrid({ children, columns = 3, className = "" }) {
  const cols = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
  };
  return (
    <div className={`grid gap-3 ${cols[columns] ?? cols[3]} ${className}`}>
      {children}
    </div>
  );
}

// ── RecordLink (internal helper) ──────────────────────────────────────────────
function RecordLink({ link, children }) {
  if (!link) return children;
  const { as: Component = "a", className = "", ...rest } = link;
  return (
    <Component
      className={`rounded-sm transition-colors after:absolute after:inset-0 after:rounded-card hover:text-[#F97316] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316] ${className}`}
      {...rest}
    >
      {children}
    </Component>
  );
}

// ── StepTrack ─────────────────────────────────────────────────────────────────
export function StepTrack({ steps, currentKey, reached, label, className = "" }) {
  const hasReached = (key) =>
    reached instanceof Set ? reached.has(key) : Boolean(reached?.includes?.(key));

  return (
    <ol
      aria-label={label}
      className={`-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 scrollbar-none [&::-webkit-scrollbar]:hidden ${className}`}
    >
      {steps.map((step, i) => {
        const current = step.key === currentKey;
        const done    = !current && hasReached(step.key);
        return (
          <li
            key={step.key}
            aria-current={current ? "step" : undefined}
            className={[
              "min-w-[9.5rem] flex-1 rounded-xl border p-4",
              current
                ? "border-[#FED7AA] bg-[#FEF3E8]"
                : done
                ? "border-transparent bg-[#FEF3E8]"
                : "border-[#E2E8F0] bg-white",
            ].join(" ")}
          >
            <div className="flex items-start justify-between gap-2">
              <span
                className={`text-[11px] font-semibold tabular-nums ${
                  current ? "text-[#F97316]" : done ? "text-[#F97316]" : "text-[#94A3B8]"
                }`}
              >
                Step {String(i + 1).padStart(2, "0")}
              </span>
              {done    && <CircleCheck className="h-4 w-4 shrink-0 text-[#F97316]" aria-hidden="true" />}
              {current && <CircleDot   className="h-4 w-4 shrink-0 text-[#F97316]" aria-hidden="true" />}
            </div>
            <p className={`mt-1.5 text-sm font-semibold ${current || done ? "text-[#0F172A]" : "text-[#64748B]"}`}>
              {step.label}
              {current && <span className="sr-only"> (current step)</span>}
            </p>
            {step.meta && <p className="mt-0.5 text-[11px] text-[#64748B]">{step.meta}</p>}
          </li>
        );
      })}
    </ol>
  );
}

// ── TokenList ─────────────────────────────────────────────────────────────────
export function TokenList({ items = [], max = 6, label, className = "" }) {
  if (!items.length) return null;
  const shown = items.slice(0, max);
  const rest  = items.slice(max);
  return (
    <div className={className}>
      {label && (
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8]">
          {label}
        </p>
      )}
      <ul className={`flex flex-wrap gap-1.5 ${label ? "mt-2" : ""}`}>
        {shown.map((item) => (
          <li
            key={item}
            className="rounded-lg border border-[#E2E8F0] bg-[#F4F6F9] px-2.5 py-1 text-xs font-medium text-[#64748B]"
          >
            {item}
          </li>
        ))}
        {rest.length > 0 && (
          <li className="rounded-lg border border-dashed border-[#E2E8F0] px-2.5 py-1 text-xs font-medium text-[#94A3B8]">
            +{rest.length} more
            <span className="sr-only">: {rest.join(", ")}</span>
          </li>
        )}
      </ul>
    </div>
  );
}

// ── MetaItem ──────────────────────────────────────────────────────────────────
export function MetaItem({ icon: Icon, children, className = "" }) {
  if (children == null || children === "") return null;
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm text-[#64748B] ${className}`}>
      {Icon && <Icon className="h-4 w-4 shrink-0 text-[#94A3B8]" aria-hidden="true" />}
      {children}
    </span>
  );
}
