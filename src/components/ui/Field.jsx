import { createContext, forwardRef, useContext, useId, useMemo, useRef } from "react";

/**
 * Form primitives with complete light/dark contrast compliance.
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
  const id = useControlId(explicitId);
  return {
    id,
    "aria-invalid": error ? "true" : undefined,
    "aria-describedby": error && ctx ? ctx.errorId : undefined,
  };
}

const fieldClass =
  "rounded-xl border border-[#D2ECC9] bg-[#FBFBFD] px-3.5 py-2.5 text-sm text-[#214740] placeholder:text-[#5A7B71] shadow-xs transition-colors duration-150 focus:border-[#3B5D52] focus:outline-none focus:ring-3 focus:ring-[#C1EBAD]/40 disabled:bg-[#ECF3EB] disabled:text-[#5A7B71] dark:border-[#D2ECC9] dark:bg-[#FBFBFD] dark:text-[#214740] dark:placeholder:text-[#5A7B71] dark:focus:border-[#3B5D52] dark:focus:ring-[#C1EBAD]/40 dark:disabled:bg-[#ECF3EB] dark:disabled:text-[#5A7B71]";

const HAS_WIDTH = /(?:^|\s)(?:[\w.[\]/-]+:)*(?:w-|size-)\S/;
function withWidth(className) {
  return HAS_WIDTH.test(className) ? "" : "w-full";
}

export const Input = forwardRef(function Input({ className = "", error, id, ...props }, ref) {
  const a11y = useFieldA11y(id, error);
  return (
    <input
      ref={ref}
      {...a11y}
      className={`${withWidth(className)} ${fieldClass} ${error ? "border-red-400 focus:border-red-500 focus:ring-red-100 dark:border-red-600" : ""} ${className}`}
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
      className={`${withWidth(className)} ${fieldClass} resize-y ${error ? "border-red-400 focus:border-red-500 focus:ring-red-100 dark:border-red-600" : ""} ${className}`}
      {...props}
    />
  );
});

export const Select = forwardRef(function Select({ className = "", error, id, children, ...props }, ref) {
  const a11y = useFieldA11y(id, error);
  return (
    <select
      ref={ref}
      {...a11y}
      className={`${withWidth(className)} ${fieldClass} ${error ? "border-red-400 dark:border-red-600" : ""} ${className}`}
      {...props}
    >
      {children}
    </select>
  );
});

export function Label({ children, required, htmlFor, className = "" }) {
  const ctx = useContext(FieldContext);
  return (
    <label htmlFor={htmlFor || ctx?.id} className={`mb-1.5 block text-sm font-bold text-[#2E4F48] dark:text-[#2E4F48] ${className}`}>
      {children}
      {required && (
        <>
          <span aria-hidden="true" className="text-red-500"> *</span>
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
    <p id={id || ctx?.errorId} className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
      {children}
    </p>
  );
}

export function FormGroup({ children, className = "" }) {
  const id = useId();
  const claimed = useRef(null);
  const value = useMemo(() => ({ id, errorId: `${id}-error`, claimed }), [id]);
  return (
    <FieldContext.Provider value={value}>
      <div className={`mb-4 ${className}`}>{children}</div>
    </FieldContext.Provider>
  );
}
