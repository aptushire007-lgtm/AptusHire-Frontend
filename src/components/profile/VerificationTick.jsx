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
      bg: "bg-[#FEF3E8] dark:bg-[#FEF3E8]",
      text: "text-[#F97316] dark:text-[#F97316]",
      border: "border-[#FED7AA] dark:border-[#FED7AA]",
      icon: CheckCircle2,
      label: "Verified",
    },
    pending: {
      bg: "bg-[#FEF3E8] dark:bg-[#FEF3E8]",
      text: "text-[#F97316] dark:text-[#F97316]",
      border: "border-[#FED7AA] dark:border-[#FED7AA]",
      icon: Clock,
      label: "Pending Verification",
    },
    missing: {
      bg: "bg-[#F4F6F9] dark:bg-[#F4F6F9]",
      text: "text-[#64748B] dark:text-[#64748B]",
      border: "border-[#FED7AA] dark:border-[#FED7AA]",
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
          className="text-sm font-bold text-[#F97316] hover:text-[#F97316] dark:text-[#F97316]"
        >
          {fixLabel}
        </button>
      )}
    </div>
  );
}
