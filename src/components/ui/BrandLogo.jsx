import { Link } from "react-router-dom";

/* Orange-themed AptusHire mark */
export function AptusMark({ size = 32, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none"
      xmlns="http://www.w3.org/2000/svg" className={`shrink-0 ${className}`} aria-hidden="true">
      <defs>
        <linearGradient id="aG1" x1="15%" y1="0%" x2="85%" y2="100%">
          <stop offset="0%" stopColor="#FB923C" />
          <stop offset="55%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#EA6C0A" />
        </linearGradient>
        <linearGradient id="aG2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#EA6C0A" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#EA6C0A" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M60 14C64 14 67.5 16.5 69.5 20.5L103 86C105.5 91 103 97 97.5 99C94 100.2 90 98.8 87.8 95L60 41 32.2 95C30 98.8 26 100.2 22.5 99 17 97 14.5 91 17 86L50.5 20.5C52.5 16.5 56 14 60 14Z" fill="url(#aG1)" />
      <path d="M60 14C64 14 67.5 16.5 69.5 20.5L60 41 50.5 20.5C52.5 16.5 56 14 60 14Z" fill="url(#aG2)" />
      <circle cx="60" cy="61" r="9" fill="#FB923C" opacity="0.9" />
    </svg>
  );
}

export function BrandLogo({
  to,
  theme,
  variant = "full",
  size = "md",
  textSize,
  textWeight = "font-extrabold",
  showTagline = false,
  className = "",
  onClick,
  // Overrides the "Aptus" half's colour when the default (white on dark theme,
  // near-black on light) isn't the point — e.g. blue on a white strip that
  // otherwise has no accent of its own to read against.
  nameColorClassName,
}) {
  const dark = theme === "dark";
  const textColor  = nameColorClassName || (dark ? "text-white" : "text-[#0F172A]");
  const hireColor  = "text-[#F97316]";
  const tagColor   = dark ? "text-slate-300" : "text-[#64748B]";

  const iconSizes  = { sm: 24, md: 32, lg: 40, xl: 48, "2xl": 60 };
  const textSizes  = { sm: "text-base", md: "text-lg", lg: "text-2xl", xl: "text-3xl", "2xl": "text-4xl" };
  const tagSizes   = { sm: "text-[10px]", md: "text-xs", lg: "text-sm", xl: "text-base", "2xl": "text-lg" };

  const markSize  = typeof size === "number" ? size : (iconSizes[size] || 32);
  const textClass = textSizes[size] || "text-lg";
  const tagClass  = tagSizes[size]  || "text-xs";
  // Explicit pixel override for the wordmark only — independent of the icon/tagline
  // scale above, for spots that need one exact size regardless of the `size` preset.
  const textStyle = textSize ? { fontSize: `${textSize}px` } : undefined;

  const content = (
    <div className={`inline-flex items-center gap-2.5 font-display font-bold tracking-tight select-none ${className}`}>
      {variant !== "text" && (
        variant === "icon"
          ? <img src="/brand/aptushire-app-icon.png" alt="AptusHire" width={markSize} height={markSize} className="rounded-lg shadow-xs shrink-0" />
          : <AptusMark size={markSize} />
      )}
      {variant !== "mark" && (
        <div className="flex flex-col leading-none">
          <span className={`${textStyle ? "" : textClass} ${textWeight} ${textColor} flex items-center transition-colors`} style={textStyle}>
            Aptus<span className={hireColor}>Hire</span>
          </span>
          {showTagline && (
            <span className={`font-sans font-medium tracking-wide mt-1 ${tagClass} ${tagColor} transition-colors`}>
              Intelligence for every hire.
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (to) {
    return (
      <Link to={to} onClick={onClick}
        className="inline-flex items-center rounded-lg transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316]">
        {content}
      </Link>
    );
  }
  return content;
}

export default BrandLogo;
