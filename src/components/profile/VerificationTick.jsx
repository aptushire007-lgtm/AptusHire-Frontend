import { CheckCircle2, Clock, Minus, AlertCircle } from "lucide-react";

/**
 * VerificationTick component
 * 
 * Implements the official AptusHire trust widget specification:
 * - verified: bg #EAF8E4, icon #147A40 (Green-700 for 5.8:1 contrast)
 * - pending:  bg #FFF6E0, icon #B97D10 (Amber-700)
 * - missing:  bg #F3F7F1, icon #5B6B63 (Slate-600)
 * - failed:   bg #FDECEC, icon #D4534A (Rose-600) + inline action
 */
export default function VerificationTick({
  status = "missing", // "verified" | "pending" | "missing" | "failed"
  tooltip = "",
  onFix,
  fixLabel = "Verify",
  size = "md",
}) {
  const configs = {
    verified: {
      bg: "bg-[#FFE8DC] dark:bg-[#FFE8DC]",
      text: "text-[#FF6B2C] dark:text-[#FF6B2C]",
      border: "border-[#FFCAAF] dark:border-[#FFCAAF]",
      icon: CheckCircle2,
      label: "Verified",
    },
    pending: {
      bg: "bg-[#FFE8DC] dark:bg-[#FFE8DC]",
      text: "text-[#FF6B2C] dark:text-[#FF6B2C]",
      border: "border-[#FFCAAF] dark:border-[#FFCAAF]",
      icon: Clock,
      label: "Pending Verification",
    },
    missing: {
      bg: "bg-[#F5F5F0] dark:bg-[#F5F5F0]",
      text: "text-[#6B6B6B] dark:text-[#6B6B6B]",
      border: "border-[#FFCAAF] dark:border-[#FFCAAF]",
      icon: Minus,
      label: "Not Verified",
    },
    failed: {
      bg: "bg-[#FDECEC] dark:bg-[#3D1A1A]",
      text: "text-[#D4534A] dark:text-[#F87171]",
      border: "border-[#D4534A]/30",
      icon: AlertCircle,
      label: "Mismatch / Action Required",
    },
  };

  const cfg = configs[status] || configs.missing;
  const Icon = cfg.icon;

  const sizeClasses = size === "sm" ? "h-6 w-6" : "h-7 w-7";
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <div className="inline-flex items-center gap-2" title={tooltip || cfg.label}>
      <span
        className={`inline-flex ${sizeClasses} shrink-0 items-center justify-center rounded-full border ${cfg.border} ${cfg.bg} ${cfg.text} shadow-2xs transition-transform hover:scale-105`}
        aria-label={tooltip || cfg.label}
      >
        <Icon className={iconSize} />
      </span>
      {status === "failed" && onFix && (
        <button
          type="button"
          onClick={onFix}
          className="text-xs font-bold text-red-600 underline hover:text-red-700"
        >
          Fix
        </button>
      )}
      {status === "missing" && onFix && (
        <button
          type="button"
          onClick={onFix}
          className="text-sm font-bold text-[#FF6B2C] hover:text-[#FF6B2C] dark:text-[#FF6B2C]"
        >
          {fixLabel}
        </button>
      )}
    </div>
  );
}
