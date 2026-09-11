import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import api from "../api/client.js";
import { saveAccountAuth } from "../auth/accountAuth.js";
import { getReturnTo, clearReturnTo } from "../auth/returnTo.js";
import { Input, Label, FormGroup } from "../components/ui/Field.jsx";
import Button from "../components/ui/Button.jsx";
import BrandLogo from "../components/ui/BrandLogo.jsx";
import GoogleButton from "../components/auth/GoogleButton.jsx";

/* ─────────────────────────────────────────────────────────────────────────────
   Left decorative panel — gradient bg, brand, tagline, trust badges
   ───────────────────────────────────────────────────────────────────────────── */
function LeftPanel() {
  return (
    <div
      className="sticky top-0 hidden h-screen lg:flex lg:w-[30%] xl:w-[28%] flex-col justify-between px-10 py-12 relative overflow-hidden"
      style={{
        background: "linear-gradient(160deg, #cce8f4 0%, #dff0f8 40%, #eef7fb 70%, #f6fbfd 100%)",
      }}
    >
      {/* Subtle circle decoration */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -left-32 h-80 w-80 rounded-full"
        style={{ background: "radial-gradient(circle, #b3d9ef 0%, transparent 70%)", opacity: 0.5 }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full"
        style={{ background: "radial-gradient(circle, #c8e8f5 0%, transparent 70%)", opacity: 0.4 }}
      />

      {/* Logo */}
      <BrandLogo to="/welcome" size="md" textSize={24} theme="light" />

      {/* Tagline */}
      <div>
        <p className="text-[22px] font-bold leading-snug text-[#F97316]">
          Find the right<br />opportunity.
        </p>
        <p className="mt-3 text-[14px] leading-relaxed text-[#4a7a6a]">
          AI-powered hiring. Fair, fast and transparent for every candidate.
        </p>
      </div>

      {/* Trust badges */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          {/* GDPR badge */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-blue-300 bg-blue-700 text-[9px] font-bold leading-tight text-white text-center">
            <span>GDPR</span>
          </div>
          {/* SOC 2 badge */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-blue-300 bg-blue-800 text-[8px] font-bold leading-tight text-white text-center px-1">
            <span>SOC 2</span>
          </div>
        </div>
        <p className="text-[11px] text-[#5A6E6A]">
          Always free for candidates. Secure &amp; compliant.
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Sign-In / Sign-Up tab toggle
   ───────────────────────────────────────────────────────────────────────────── */
function AuthToggle({ active }) {
  return (
    <div className="mb-7 inline-flex items-center self-center rounded-full bg-[#0F172A] p-1">
      <Link
        to="/login"
        className={`rounded-full px-6 py-2 text-[14px] font-semibold transition-colors ${
          active === "login"
            ? "bg-white text-[#0F172A] shadow-sm"
            : "text-white/70 hover:text-white"
        }`}
      >
        Sign In
      </Link>
      <Link
        to="/register"
        className={`rounded-full px-6 py-2 text-[14px] font-semibold transition-colors ${
          active === "register"
            ? "bg-white text-[#0F172A] shadow-sm"
            : "text-white/70 hover:text-white"
        }`}
      >
        Sign Up
      </Link>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Page footer
   ───────────────────────────────────────────────────────────────────────────── */
function PageFooter() {
  return (
    <div className="mt-auto border-t border-[#E2E8F0] pt-4 pb-6 px-6 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-[#94A3B8]">
        <div className="flex flex-wrap gap-4">
          <Link to="/welcome" className="hover:text-[#0F172A]">Privacy Policy</Link>
          <Link to="/welcome" className="hover:text-[#0F172A]">Terms of Service</Link>
        </div>
        <span>© {new Date().getFullYear()} AptusHire. All rights reserved.</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Login page
   ───────────────────────────────────────────────────────────────────────────── */
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState("");

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setValidationError("");
    setNeedsVerification(false);
    if (!form.email.trim() || !form.password) {
      setValidationError("Enter your email and password to continue.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      setValidationError("Enter a valid email address.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post("/auth/login", form);
      saveAccountAuth({ token: res.data.token, refreshToken: res.data.refreshToken, user: res.data.user, remember });
      const redirectTo = location.state?.from || getReturnTo() || "/dashboard";
      clearReturnTo();
      navigate(redirectTo, { replace: true });
    } catch (err) {
      if (err.response?.data?.code === "EMAIL_NOT_VERIFIED") {
        setNeedsVerification(true);
      }
      setError(err.response?.data?.error || "Could not log in");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    try {
      await api.post("/auth/resend-verification", { email: form.email });
      setResendSent(true);
    } catch {
      setResendSent(true);
    }
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* ── Left decorative panel (desktop only) ── */}
      <LeftPanel />

      {/* ── Right: form column ── */}
      <div className="flex min-h-screen w-full flex-col lg:w-[70%] xl:w-[72%]">
        {/* dot-grid background pattern */}
        <div
          className="flex flex-1 flex-col items-center justify-center px-5 py-10 sm:px-10"
          style={{
            backgroundImage: "radial-gradient(circle, #d4d4d4 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            backgroundColor: "#fff",
          }}
        >
          {/* Mobile logo (hidden on desktop — shown in left panel) */}
          <div className="mb-8 lg:hidden">
            <BrandLogo to="/welcome" size="md" textSize={24} theme="light" />
          </div>

          <div className="w-full max-w-[400px]">
            {/* Tab toggle */}
            <div className="flex justify-center">
              <AuthToggle active="login" />
            </div>

            {/* Heading */}
            <div className="mb-7 text-center">
              <h1 className="text-[26px] font-bold leading-tight text-[#0F172A]">
                Sign In To
              </h1>
              <p className="mt-1 text-[22px] font-bold text-[#2563EB]">
                Your Candidate Account
              </p>
            </div>

            {/* Google button */}
            <div className="mb-3">
              <GoogleButton onError={setError} />
            </div>

            {/* OR divider */}
            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-[#E2E8F0]" />
              <span className="text-[12px] text-[#94A3B8]">or</span>
              <span className="h-px flex-1 bg-[#E2E8F0]" />
            </div>

            {/* Error / verification alerts */}
            {(error || validationError) && (
              <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-[12px] font-semibold text-red-700">
                {error || validationError}
              </p>
            )}
            {needsVerification && (
              <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-[12px] text-amber-800">
                {resendSent ? (
                  "A new verification link has been sent if that account exists."
                ) : (
                  <button type="button" className="font-semibold underline" onClick={handleResend}>
                    Resend verification email
                  </button>
                )}
              </p>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <label htmlFor="login-email" className="mb-1.5 block text-[13px] font-semibold text-[#0F172A]">
                  Email
                </label>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={update("email")}
                  placeholder="Enter your email"
                  className="h-11 w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFA] px-4 text-[14px] text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#F97316] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F97316]/15"
                  required
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="login-password" className="text-[13px] font-semibold text-[#0F172A]">
                    Password
                  </label>
                  <Link to="/forgot-password" className="text-[12px] font-semibold text-[#F97316] hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={form.password}
                    onChange={update("password")}
                    placeholder="Enter your password"
                    className="h-11 w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFA] px-4 pr-11 text-[14px] text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#F97316] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F97316]/15"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A]"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <label className="flex cursor-pointer items-center gap-2.5 text-[13px] font-medium text-[#64748B]">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-[#E2E8F0] accent-[#F97316]"
                />
                Remember me
              </label>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="mt-2 flex h-12 w-full items-center justify-center rounded-full bg-[#0F172A] text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a10 10 0 100 10h-4a8 8 0 01-8-8z" />
                  </svg>
                ) : null}
                Sign In
              </button>
            </form>

            {/* Switch to signup */}
            <p className="mt-6 text-center text-[13px] text-[#64748B]">
              Don't have an account?{" "}
              <Link to="/register" className="font-semibold text-[#F97316] hover:underline">
                Sign up free
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <PageFooter />
      </div>
    </div>
  );
}
