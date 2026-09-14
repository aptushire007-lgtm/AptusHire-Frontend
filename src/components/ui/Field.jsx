import { createContext, forwardRef, useContext, useId, useMemo, useRef } from "react";
import { Search as SearchIcon } from "lucide-react";

/**
 * AptusHire Form Primitives — light theme, green brand, charcoal text.
 * White backgrounds, green focus rings, no dark-mode variants.
 */

const FieldContext = createContext(null);

function useControlId(explicitId) {
  const ctx = useContext(FieldContext);
  const own = useId();
  if (explicitId) return explicitId;
  if (!ctx) return undefined;
  if (ctx.claimed.current === null) ctx.claimed.current = own;
  return ctx.claimed.current === own ? ctx.id : own;
}

function useFieldA11y(explicitId, error) {
  const ctx = useContext(FieldContext);
  const id  = useControlId(explicitId);
  return {
    id,
    "aria-invalid":     error ? "true" : undefined,
    "aria-describedby": error && ctx ? ctx.errorId : undefined,
  };
}

// Base chrome — white bg, charcoal text, orange focus ring
const fieldChrome = [
  "box-border min-w-0 max-w-full rounded-control border border-[#E2E8F0] bg-white",
  "text-sm text-[#0F172A] placeholder:text-[#94A3B8]",
  "shadow-sm transition-colors duration-150",
  "focus:border-[#F97316] focus:outline-none focus:ring-3 focus:ring-[#F97316]/15",
  "disabled:bg-[#F8FAFC] disabled:text-[#64748B] disabled:cursor-not-allowed",
].join(" ");

const fieldClass        = `${fieldChrome} px-3.5 py-2.5`;
const fieldCompactClass = `${fieldChrome} px-2.5 py-1.5`;

const HAS_WIDTH = /(?:^|\s)(?:[\w.[\]/-]+:)*(?:w-|size-)\S/;
function withWidth(cn) {
  return HAS_WIDTH.test(cn) ? "" : "w-full";
}

const errorChrome = "border-verdict-negative focus:border-verdict-negative focus:ring-verdict-negative/15";

export const Input = forwardRef(function Input({ className = "", error, id, ...props }, ref) {
  const a11y = useFieldA11y(id, error);
  return (
    <input
      ref={ref}
      {...a11y}
      className={`${withWidth(className)} ${fieldClass} ${error ? errorChrome : ""} ${className}`}
      {...props}
    />
  );
});

export const Textarea = forwardRef(function Textarea({ className = "", error, id, ...props }, ref) {
  const a11y = useFieldA11y(id, error);
  return (
    <textarea
      ref={ref}
      {...a11y}
      className={`${withWidth(className)} ${fieldClass} resize-y ${error ? errorChrome : ""} ${className}`}
      {...props}
    />
  );
});

export const Select = forwardRef(function Select({ className = "", error, id, compact = false, children, ...props }, ref) {
  const a11y = useFieldA11y(id, error);
  return (
    <select
      ref={ref}
      {...a11y}
      className={`${withWidth(className)} ${compact ? fieldCompactClass : fieldClass} whitespace-normal ${error ? errorChrome : ""} ${className}`}
      {...props}
    >
      {children}
    </select>
  );
});

export const Search = forwardRef(function Search({ className = "", id, ...props }, ref) {
  return (
    <div className="relative">
      <SearchIcon
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]"
        aria-hidden="true"
      />
      <Input ref={ref} id={id} type="search" className={`pl-10 ${className}`} {...props} />
    </div>
  );
});

export const DatePicker = forwardRef(function DatePicker({ className = "", id, ...props }, ref) {
  return <Input ref={ref} id={id} type="date" className={className} {...props} />;
});

export const Checkbox = forwardRef(function Checkbox({ className = "", error, id, ...props }, ref) {
  return (
    <input
      ref={ref}
      {...useFieldA11y(id, error)}
      type="checkbox"
      className={`h-4 w-4 rounded border-[#E2E8F0] text-[#F97316] accent-[#F97316] focus:ring-2 focus:ring-[#F97316]/20 ${className}`}
      {...props}
    />
  );
});

export const Radio = forwardRef(function Radio({ className = "", error, id, ...props }, ref) {
  return (
    <input
      ref={ref}
      {...useFieldA11y(id, error)}
      type="radio"
      className={`h-4 w-4 border-[#E2E8F0] text-[#F97316] accent-[#F97316] focus:ring-2 focus:ring-[#F97316]/20 ${className}`}
      {...props}
    />
  );
});

export const Switch = forwardRef(function Switch(
  { checked = false, onChange, className = "", disabled = false, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={[
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#F97316]/20",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked
          ? "border-[#F97316] bg-[#F97316]"
          : "border-[#E2E8F0] bg-[#F8FAFC]",
        className,
      ].join(" ")}
      {...props}
    >
      <span
        className={`h-4 w-4 rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.07)] transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
});

export function Label({ children, required, htmlFor, className = "" }) {
  const ctx = useContext(FieldContext);
  return (
    <label
      htmlFor={htmlFor || ctx?.id}
      className={`mb-1.5 block text-xs font-semibold text-[#0F172A] ${className}`}
    >
      {children}
      {required && (
        <>
          <span aria-hidden="true" className="ml-0.5 text-[#DC2626]"> *</span>
          <span className="sr-only"> (required)</span>
        </>
      )}
    </label>
  );
}

export function FieldError({ children, id }) {
  const ctx = useContext(FieldContext);
  if (!children) return null;
  return (
    <p
      id={id || ctx?.errorId}
      className="mt-1 text-xs font-medium text-[#DC2626]"
    >
      {children}
    </p>
  );
}

export function FormGroup({ children, className = "" }) {
  const id      = useId();
  const claimed = useRef(null);
  const value   = useMemo(() => ({ id, errorId: `${id}-error`, claimed }), [id]);
  return (
    <FieldContext.Provider value={value}>
      <div className={`mb-4 ${className}`}>{children}</div>
    </FieldContext.Provider>
  );
}
