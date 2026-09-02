import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

// Focus rings are one step darker than a "tint" would suggest, across every
// variant. A ring is only an affordance if it is visible against the surface
// BEHIND the control, and the surface is bone (#f6f2ea): tint-weight rings
// measured 1.4–1.9:1 against it, i.e. the loudest treatment in the system had
// quietly become the faintest. Each value below clears the 3:1 floor WCAG 2.2
// sets for a focus indicator — brand-300 3.37:1, slate-400 3.04:1, red-500
// 3.37:1, accent-500 3.33:1.
//
// Every FILLED variant disables to the same greige, and that uniformity is the
// point. Each used to disable into its own ramp's 300, which worked while those
// were tints and broke the moment brand-300 became the (necessarily dark) petrol
// focus step: a disabled primary rendered as a solid mid-teal block that read as
// a live button — louder than the real secondary beside it. A disabled control
// must not be able to out-shout an enabled one, so the disabled surface is
// neutral and shared, and the label goes muted with it rather than staying
// white. slate-500 on slate-200 is 4.14:1: unmistakably inert, still readable.
const DISABLED_FILL = "disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none dark:disabled:bg-slate-800 dark:disabled:text-slate-600";

const variants = {
  primary:
    `bg-brand-800 text-white shadow-soft hover:bg-brand-900 focus-visible:ring-brand-500 dark:bg-brand-400 dark:text-brand-950 dark:hover:bg-brand-300 dark:focus-visible:ring-brand-400 ${DISABLED_FILL}`,
  secondary:
    "bg-white text-slate-800 border border-slate-200 hover:bg-brand-50 hover:text-brand-800 focus-visible:ring-brand-500 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-800 dark:hover:bg-slate-800 disabled:opacity-50",
  outline:
    "bg-transparent text-slate-700 border border-slate-200 hover:bg-slate-100 focus-visible:ring-slate-400 dark:text-slate-200 dark:border-slate-800 dark:hover:bg-slate-900 disabled:opacity-50",
  ghost: "bg-transparent text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-400 dark:text-slate-300 dark:hover:bg-slate-900 disabled:opacity-50",
  danger: `bg-verdict-negative text-white hover:bg-red-700 focus-visible:ring-red-500 ${DISABLED_FILL}`,
  accent:
    `bg-brand-400 text-brand-950 font-bold shadow-soft hover:bg-brand-300 focus-visible:ring-brand-400 ${DISABLED_FILL}`,
  orange:
    "bg-[#214740] text-white shadow-card hover:bg-[#2E4F48] focus-visible:ring-[#5A7B71] disabled:opacity-60 disabled:shadow-none",
};

const sizes = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5 text-[13px]",
  lg: "px-5 py-3 text-[13px]",
};

const Button = forwardRef(function Button(
  { as: Component = "button", variant = "primary", size = "md", loading = false, className = "", children, disabled, ...props },
  ref
) {
  return (
    <Component
      ref={ref}
      disabled={disabled || loading}
      // Properties are named rather than `transition-all` so the focus ring
      // (a box-shadow) appears instantly — a ring that fades in leaves keyboard
      // users with no indicator at the start of the transition.
      //
      // `tap-target` (index.css) raises this to the 44px comfort floor only on
      // coarse pointers. Candidates apply from whatever device they have, and a
      // "Start interview" button their thumb misses is the worst possible miss.
      //
      // `motion-reduce:active:scale-100` keeps the press *feedback* (the colour
      // still changes) while removing the movement, rather than removing both.
      className={`tap-target inline-flex items-center justify-center gap-2 rounded-[9px] font-semibold transition-[background-color,border-color,color,transform] duration-150 focus-visible:outline-none focus-visible:ring-4 active:scale-[0.98] motion-reduce:active:scale-100 disabled:cursor-not-allowed disabled:active:scale-100 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </Component>
  );
});

export default Button;
