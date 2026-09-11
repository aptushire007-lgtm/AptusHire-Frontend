import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import Button from "../ui/Button.jsx";
import BrandLogo from "../ui/BrandLogo.jsx";

const LINKS = [
  { label: "Jobs", href: "/" },
  { label: "Features", href: "/welcome#features" },
  { label: "How it Works", href: "/welcome#how-it-works" },
  { label: "About", href: "/welcome#about" },
  { label: "Contact", href: "/welcome#contact" },
];

export default function MarketingNavbar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const menuButtonRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event) {
      if (event.key !== "Escape") return;
      setOpen(false);
      menuButtonRef.current?.focus();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-[#E2E8F0] bg-white/95 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">
        <BrandLogo to="/welcome" size="lg" textWeight="font-medium" theme="light" />

        <nav className="hidden items-center gap-9 md:flex">
          {LINKS.map((link) => (
            <a key={link.label} href={link.href} className="text-[15px] font-semibold text-[#0F172A] transition-colors hover:text-[#F97316]">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button variant="ghost" size="sm" className="rounded-full px-4 text-[15px] text-[#F97316]" onClick={() => navigate("/login")}>
            Log In
          </Button>
          <Button size="sm" className="rounded-full px-5 py-2.5 text-[15px] shadow-[0_8px_20px_rgba(33,71,64,0.16)]" onClick={() => navigate("/register")}>
            Create Account
          </Button>
        </div>

        <button
          ref={menuButtonRef}
          type="button"
          className="tap-target -mr-2 inline-flex items-center justify-center rounded-lg p-2 text-[#F97316] hover:bg-[#FEF3E8] md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-[#E2E8F0] bg-white px-5 pb-5 pt-3 md:hidden">
          <nav className="flex flex-col gap-3">
            {LINKS.map((link) => (
              <a key={link.label} href={link.href} className="tap-target flex items-center py-1 text-[15px] font-semibold text-[#0F172A]" onClick={() => setOpen(false)}>
                {link.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2">
            <Button variant="outline" onClick={() => navigate("/login")}>
              Log In
            </Button>
            <Button onClick={() => navigate("/register")}>Create Account</Button>
          </div>
        </div>
      )}
    </header>
  );
}
