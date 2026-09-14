import { Sun, Moon } from "lucide-react";
import { useTheme } from "../../context/ThemeContext.jsx";

export default function ThemeToggle({ className = "", compact = false }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative inline-flex items-center justify-center rounded-xl border border-slate-200/80 bg-white/80 p-2 text-slate-600 shadow-sm backdrop-blur transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316]/80 dark:hover:border-slate-700 dark:hover:text-white ${
        compact ? "h-8 w-8" : "h-9 w-9"
      } ${className}`}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      <Sun
        className={`h-4 w-4 transition-transform duration-300 ${
          isDark ? "scale-0 rotate-90 opacity-0 absolute" : "scale-100 rotate-0 opacity-100 text-amber-500"
        }`}
        aria-hidden="true"
      />
      <Moon
        className={`h-4 w-4 transition-transform duration-300 ${
          isDark ? "scale-100 rotate-0 opacity-100 text-brand-300" : "scale-0 -rotate-90 opacity-0 absolute"
        }`}
        aria-hidden="true"
      />
    </button>
  );
}
