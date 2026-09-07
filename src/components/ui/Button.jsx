import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

/**
 * AptusHire Button — premium light-mode design system
 *
 * Variants:
 *   primary   — filled green, main CTAs
 *   secondary — green-bordered, bg-white
 *   outline   — grey-bordered, transparent
 *   ghost     — no border, hover tint
 *   danger    — filled red for destructive actions
 *   gold      — filled warm gold for accent/highlight CTAs
 *   link      — inline text link style
 *
 * Every filled variant disables to the same neutral so a disabled button
 * cannot visually out-shout an enabled one beside it.
 */

const DISABLED_FILL =
  "disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed disabled:active:scale-100";

const variants = {
  primary:
    `bg-[#176B45] text-white shadow-[0_1px_4px_rgba(27,67,50,0.07)] hover:bg-[#176B45]-dark active:bg-[#176B45]-dark focus-visible:ring-4 focus-visible:ring-primary/25 ${DISABLED_FILL}`,

  secondary:
    `border border-[#176B45] bg-white text-[#176B45] hover:bg-[#DDECE3] active:bg-[#E8F2EC] focus-visible:ring-4 focus-visible:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100`,

  outline:
    `border border-[#E5EBE7] bg-transparent text-[#64736A] hover:border-[#C7DDD1] hover:bg-[#DDECE3] hover:text-[#176B45] focus-visible:ring-4 focus-visible:ring-primary/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100`,

  ghost:
    `bg-transparent text-[#64736A] hover:bg-[#DDECE3] hover:text-[#176B45] focus-visible:ring-4 focus-visible:ring-primary/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100`,

  danger:
    `bg-verdict-negative text-white shadow-[0_1px_4px_rgba(27,67,50,0.07)] hover:bg-red-700 active:bg-red-800 focus-visible:ring-4 focus-visible:ring-red-400/30 ${DISABLED_FILL}`,

  gold:
    `bg-[#176B45] text-white shadow-[0_1px_4px_rgba(27,67,50,0.07)] hover:bg-[#176B45]-dark active:bg-[#176B45]-dark focus-visible:ring-4 focus-visible:ring-accent-orange/30 ${DISABLED_FILL}`,

  /* backward-compat aliases */
  accent:
    `bg-[#176B45] text-white shadow-[0_1px_4px_rgba(27,67,50,0.07)] hover:bg-[#176B45]-dark focus-visible:ring-4 focus-visible:ring-primary/25 ${DISABLED_FILL}`,
  orange:
    `bg-[#176B45] text-white shadow-[0_1px_4px_rgba(27,67,50,0.07)] hover:bg-[#176B45]-dark focus-visible:ring-4 focus-visible:ring-accent-orange/30 ${DISABLED_FILL}`,

  link:
    `bg-transparent text-[#176B45] underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-40 disabled:cursor-not-allowed`,
};

const sizes = {
  xs: "h-7 px-2.5 text-[11px]",
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-4 text-[13px]",
  lg: "h-11 px-5 text-sm",
};

const Button = forwardRef(function Button(
  {
    as: Component = "button",
    variant = "primary",
    size = "md",
    loading = false,
    className = "",
    children,
    disabled,
    ...props
  },
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
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {loading && (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      )}
      {children}
    </Component>
  );
});

export default Button;
