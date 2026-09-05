import { useCallback, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const SIZES = {
  sm:  "max-w-sm",
  md:  "max-w-md",
  lg:  "max-w-lg",
  xl:  "max-w-xl",
  "2xl": "max-w-2xl",
};

export default function Modal({
  open,
  onClose,
  title,
  description,
  label,
  size = "lg",
  placement = "center",
  panelClassName = "",
  className = "",
  showClose = true,
  children,
}) {
  const panelRef  = useRef(null);
  const restoreRef = useRef(null);
  const headingId  = useId();

  const onKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose?.(); return; }
      if (e.key !== "Tab") return;
      const nodes = panelRef.current?.querySelectorAll(FOCUSABLE);
      if (!nodes?.length) { e.preventDefault(); return; }
      const first  = nodes[0];
      const last   = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !panelRef.current.contains(active))) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault(); first.focus();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return undefined;
    restoreRef.current = document.activeElement;
    const target = panelRef.current?.querySelector(FOCUSABLE) || panelRef.current;
    target?.focus?.({ preventScroll: true });
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
      const r = restoreRef.current;
      if (r && document.contains(r)) r.focus?.({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;

  const centred = placement === "center";

  return createPortal(
    <div
      className={`fixed inset-0 z-50 ${centred ? "flex items-center justify-center p-4" : ""} ${className}`}
      onKeyDown={onKeyDown}
    >
      {/* scrim */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        onMouseDown={onClose}
        aria-hidden="true"
      />

      {/* panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        aria-labelledby={label ? undefined : title ? headingId : undefined}
        tabIndex={-1}
        className={
          centred
            ? `relative max-h-[88vh] w-full overflow-y-auto rounded-panel border border-[#E5EBE7] bg-white p-6 shadow-lift focus:outline-none ${SIZES[size] ?? SIZES.lg} ${panelClassName}`
            : `absolute inset-y-0 left-0 flex flex-col bg-white shadow-deep focus:outline-none ${panelClassName}`
        }
      >
        {title && (
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 id={headingId} className="text-base font-bold text-[#17221C]">
                {title}
              </h2>
              {description && (
                <p className="mt-1 text-sm text-[#64736A]">{description}</p>
              )}
            </div>
            {showClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="-m-1.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#64736A] transition-colors hover:bg-[#F8FAF9] hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
}
