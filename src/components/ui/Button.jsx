import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

/**
 * AptusHire Button — Orange #F97316 + Navy #1B2A3B design system
 */

const DISABLED =
  "disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed disabled:active:scale-100";

const variants = {
  primary:
    `bg-[#F97316] text-white shadow-sm hover:bg-[#EA6C0A] active:bg-[#EA6C0A] focus-visible:ring-4 focus-visible:ring-[#F97316]/25 ${DISABLED}`,
  secondary:
    `border border-[#F97316] bg-white text-[#F97316] hover:bg-[#FEF3E8] active:bg-[#FEF3E8] focus-visible:ring-4 focus-visible:ring-[#F97316]/20 disabled:opacity-50 disabled:cursor-not-allowed`,
  outline:
    `border border-[#E2E8F0] bg-transparent text-[#64748B] hover:border-[#F97316] hover:bg-[#FEF3E8] hover:text-[#F97316] focus-visible:ring-4 focus-visible:ring-[#F97316]/20 disabled:opacity-40 disabled:cursor-not-allowed`,
  ghost:
    `bg-transparent text-[#64748B] hover:bg-[#FEF3E8] hover:text-[#F97316] focus-visible:ring-4 focus-visible:ring-[#F97316]/20 disabled:opacity-40 disabled:cursor-not-allowed`,
  danger:
    `bg-red-600 text-white shadow-sm hover:bg-red-700 active:bg-red-800 focus-visible:ring-4 focus-visible:ring-red-400/30 ${DISABLED}`,
  navy:
    `bg-[#1B2A3B] text-white shadow-sm hover:bg-[#243447] active:bg-[#131F2E] focus-visible:ring-4 focus-visible:ring-[#1B2A3B]/30 ${DISABLED}`,
  /* backward-compat aliases → all map to orange primary */
  gold:
    `bg-[#F97316] text-white shadow-sm hover:bg-[#EA6C0A] focus-visible:ring-4 focus-visible:ring-[#F97316]/25 ${DISABLED}`,
  accent:
    `bg-[#F97316] text-white shadow-sm hover:bg-[#EA6C0A] focus-visible:ring-4 focus-visible:ring-[#F97316]/25 ${DISABLED}`,
  orange:
    `bg-[#F97316] text-white shadow-sm hover:bg-[#EA6C0A] focus-visible:ring-4 focus-visible:ring-[#F97316]/25 ${DISABLED}`,
  link:
    `bg-transparent text-[#F97316] underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-[#F97316]/30 disabled:opacity-40 disabled:cursor-not-allowed`,
};

const sizes = {
  xs: "h-7 px-2.5 text-[11px]",
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-4 text-[13px]",
  lg: "h-11 px-5 text-sm",
};

const Button = forwardRef(function Button(
  { as: Component = "button", variant = "primary", size = "md", loading = false, className = "", children, disabled, ...props },
  ref
) {
  return (
    <Component
      ref={ref}
      disabled={disabled || loading}
      className={[
        "tap-target inline-flex min-w-0 max-w-full items-center justify-center gap-2 rounded-control font-semibold whitespace-normal break-words text-center",
        "transition-[background-color,border-color,color,box-shadow,transform] duration-150",
        "focus-visible:outline-none active:scale-[0.98]",
        variants[variant] ?? variants.primary,
        sizes[size] ?? sizes.md,
        className,
      ].filter(Boolean).join(" ")}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </Component>
  );
});

export default Button;
