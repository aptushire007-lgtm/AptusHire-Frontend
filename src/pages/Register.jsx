import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff, MailCheck, ArrowRight } from "lucide-react";
import api from "../api/client.js";
import { Input } from "../components/ui/Field.jsx";
import Button from "../components/ui/Button.jsx";
import BrandLogo from "../components/ui/BrandLogo.jsx";
import GoogleButton from "../components/auth/GoogleButton.jsx";

/* ─────────────────────────────────────────────────────────────────────────────
   Left decorative panel — same as Login for visual consistency
   ───────────────────────────────────────────────────────────────────────────── */
function LeftPanel() {
  return (
    <div
      className="sticky top-0 hidden h-screen lg:flex lg:w-[45%] xl:w-[42%] flex-col justify-between px-10 py-12 relative overflow-hidden"
      style={{ backgroundColor: "#FFF9E8" }}
    >
      {/* Mountain/sun illustration — anchored to the bottom. A solid cream
          overlay (not just a fade) covers the whole left ~48% unconditionally,
          so the image's own baked-in text can never show through behind the
          quote/tagline regardless of viewport width or crop math. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0"
        style={{
          height: "68%",
          backgroundImage: "url('/hero-banner.png')",
          backgroundSize: "cover",
          backgroundPosition: "88% 30%",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0"
        style={{
          height: "68%",
          background: "linear-gradient(90deg, #FFF9E8 0%, #FFF9E8 48%, rgba(255,249,232,0.85) 58%, rgba(255,249,232,0) 78%)",
        }}
      />

      {/* Logo */}
      <div className="relative">
        <BrandLogo to="/welcome" variant="image" size={52} />
      </div>

      {/* Quote */}
      <div className="relative -mt-10">
        <p
          className="text-[42px] leading-[1.15] text-[#172334]"
          style={{ fontFamily: "'Caveat', cursive", fontWeight: 700 }}
        >
          &ldquo;Progress today, a brighter tomorrow.&rdquo;
        </p>
        <span className="mt-4 block h-[3px] w-11 rounded-full bg-[#F97316]" />
      </div>

      {/* Tagline */}
      <div className="relative">
        <p className="text-[22px] font-bold leading-snug text-[#172334]">
          Find the right<br />opportunity.
        </p>
        <p className="mt-3 text-[14px] leading-relaxed text-[#64748B]">
          AI-powered hiring. Fair, fast and transparent for every candidate.
        </p>
      </div>

      {/* Trust line */}
      <div className="relative">
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
    <div className="mb-7 inline-flex items-center self-center rounded-full bg-[#F1F5F9] p-1">
      <Link
        to="/login"
        className={`rounded-full px-6 py-2 text-[14px] font-semibold transition-colors ${
          active === "login"
            ? "bg-[#0F172A] text-white shadow-sm"
            : "text-[#64748B] hover:text-[#0F172A]"
        }`}
      >
        Sign In
      </Link>
      <Link
        to="/register"
        className={`rounded-full px-6 py-2 text-[14px] font-semibold transition-colors ${
          active === "register"
            ? "bg-[#0F172A] text-white shadow-sm"
            : "text-[#64748B] hover:text-[#0F172A]"
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
   Register page
   ───────────────────────────────────────────────────────────────────────────── */
export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setValidationError("");
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.password) {
      setValidationError("Complete all fields to create your account.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      setValidationError("Enter a valid email address.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/auth/register", form);
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.error || "Could not create your account");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* ── Left decorative panel ── */}
      <LeftPanel />

      {/* ── Right: form column ── */}
      <div className="flex min-h-screen w-full flex-col lg:w-[55%] xl:w-[58%]">
        {/* Glass background — soft blurred colour blobs behind a frosted panel */}
        <div
          className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-5 py-10 sm:px-10"
          style={{ backgroundColor: "#F4F6F9" }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -left-16 h-80 w-80 rounded-full blur-3xl"
            style={{ background: "radial-gradient(circle, rgba(249,115,22,0.22) 0%, rgba(249,115,22,0) 70%)" }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-28 -right-20 h-96 w-96 rounded-full blur-3xl"
            style={{ background: "radial-gradient(circle, rgba(37,99,235,0.16) 0%, rgba(37,99,235,0) 70%)" }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-1/3 right-1/4 h-64 w-64 rounded-full blur-3xl"
            style={{ background: "radial-gradient(circle, rgba(245,181,27,0.20) 0%, rgba(245,181,27,0) 70%)" }}
          />

          {/* Mobile logo (hidden on desktop — shown in left panel) */}
          <div className="relative mb-8 lg:hidden">
            <BrandLogo to="/welcome" variant="image" size={52} />
          </div>

          <div
            className={`relative w-full max-w-[400px] ${done ? "" : "rounded-3xl border border-white/60 bg-white/55 p-8 shadow-[0_8px_40px_rgba(15,23,42,0.08)] backdrop-blur-2xl sm:p-10"}`}
          >
            {done ? (
              /* ── Success state ── */
              <div className="flex flex-col items-center rounded-2xl border border-[#E2E8F0] bg-white px-8 py-12 text-center shadow-sm">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <MailCheck className="h-7 w-7" />
                </div>
                <h2 className="text-[22px] font-bold text-[#0F172A]">Account Created!</h2>
                <p className="mt-3 text-[14px] text-[#64748B]">
                  Check your email to verify your account, then{" "}
                  <Link to="/login" className="font-semibold text-[#F97316] hover:underline">
                    log in
                  </Link>
                  .
                </p>
              </div>
            ) : (
              <>
                {/* Tab toggle */}
                <div className="flex justify-center">
                  <AuthToggle active="register" />
                </div>

                {/* Heading */}
                <div className="mb-7 text-center">
                  <h1 className="text-[26px] font-bold leading-tight text-[#0F172A]">
                    Sign Up To
                  </h1>
                  <p className="mt-1 text-[22px] font-bold text-[#F97316]">
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

                {/* Error alert */}
                {(error || validationError) && (
                  <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-[12px] font-semibold text-red-700">
                    {error || validationError}
                  </p>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                  {/* Full Name */}
                  <div>
                    <label htmlFor="reg-name" className="mb-1.5 block text-[13px] font-semibold text-[#0F172A]">
                      Full Name
                    </label>
                    <Input
                      id="reg-name"
                      type="text"
                      autoComplete="name"
                      value={form.name}
                      onChange={update("name")}
                      placeholder="Your full name"
                      className="h-11 w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFA] px-4 text-[14px] text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#F97316] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F97316]/15"
                      required
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="reg-email" className="mb-1.5 block text-[13px] font-semibold text-[#0F172A]">
                      Email
                    </label>
                    <Input
                      id="reg-email"
                      type="email"
                      autoComplete="email"
                      value={form.email}
                      onChange={update("email")}
                      placeholder="Enter your email"
                      className="h-11 w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFA] px-4 text-[14px] text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#F97316] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F97316]/15"
                      required
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label htmlFor="reg-password" className="mb-1.5 block text-[13px] font-semibold text-[#0F172A]">
                      Password
                    </label>
                    <div className="relative">
                      <Input
                        id="reg-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={form.password}
                        onChange={update("password")}
                        placeholder="Create a password"
                        className="h-11 w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFA] px-4 pr-11 text-[14px] text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#F97316] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F97316]/15"
                        minLength={8}
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
                    <p className="mt-1.5 text-[11px] text-[#94A3B8]">
                      At least 8 characters with uppercase, lowercase, number and special character.
                    </p>
                  </div>

                  {/* Phone number */}
                  <div>
                    <label htmlFor="reg-phone" className="mb-1.5 block text-[13px] font-semibold text-[#0F172A]">
                      Phone Number
                    </label>
                    <Input
                      id="reg-phone"
                      type="tel"
                      autoComplete="tel"
                      value={form.phone}
                      onChange={update("phone")}
                      placeholder="+91 98765 43210"
                      className="h-11 w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFA] px-4 text-[14px] text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#F97316] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F97316]/15"
                      required
                    />
                  </div>

                  {/* Terms checkbox */}
                  <label className="flex cursor-pointer items-start gap-2.5 text-[12px] text-[#64748B]">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#E2E8F0] accent-[#F97316]"
                    />
                    <span>
                      I agree to the{" "}
                      <Link to="/welcome" className="font-semibold text-[#F97316] hover:underline">
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link to="/welcome" className="font-semibold text-[#F97316] hover:underline">
                        Privacy Policy
                      </Link>
                    </span>
                  </label>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0F172A] text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? (
                      <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a10 10 0 100 10h-4a8 8 0 01-8-8z" />
                      </svg>
                    ) : null}
                    Sign Up {!submitting && <ArrowRight className="h-4 w-4" aria-hidden />}
                  </button>
                </form>

                {/* Switch to login */}
                <p className="mt-6 text-center text-[13px] text-[#64748B]">
                  Already have an account?{" "}
                  <Link to="/login" className="font-semibold text-[#F97316] hover:underline">
                    Sign in
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <PageFooter />
      </div>
    </div>
  );
}
