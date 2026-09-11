import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff, MailCheck } from "lucide-react";
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
      className="hidden lg:flex lg:w-[30%] xl:w-[28%] flex-col justify-between px-10 py-12 relative overflow-hidden"
      style={{
        background: "linear-gradient(160deg, #cce8f4 0%, #dff0f8 40%, #eef7fb 70%, #f6fbfd 100%)",
      }}
    >
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

      <BrandLogo to="/welcome" size="md" theme="light" />

      <div>
        <p className="text-[22px] font-bold leading-snug text-[#F97316]">
          Start your journey<br />today.
        </p>
        <p className="mt-3 text-[14px] leading-relaxed text-[#4a7a6a]">
          Create your account and get matched to opportunities that fit your skills.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-blue-300 bg-blue-700 text-[9px] font-bold leading-tight text-white text-center">
            <span>GDPR</span>
          </div>
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
    <div className="mb-7 inline-flex items-center self-center rounded-full bg-[#F0F0F0] p-1">
      <Link
        to="/login"
        className={`rounded-full px-6 py-1.5 text-[13px] font-semibold transition-colors ${
          active === "login"
            ? "bg-white text-[#0F172A] shadow-sm"
            : "text-[#64748B] hover:text-[#0F172A]"
        }`}
      >
        Sign In
      </Link>
      <Link
        to="/register"
        className={`rounded-full px-6 py-1.5 text-[13px] font-semibold transition-colors ${
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
      <div className="flex min-h-screen w-full flex-col lg:w-[70%] xl:w-[72%]">
        <div
          className="flex flex-1 flex-col items-center justify-center px-5 py-10 sm:px-10"
          style={{
            backgroundImage: "radial-gradient(circle, #d4d4d4 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            backgroundColor: "#fff",
          }}
        >
          {/* Mobile logo */}
          <div className="mb-8 lg:hidden">
            <BrandLogo to="/welcome" size="md" theme="light" />
          </div>

          <div className="w-full max-w-[400px]">
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
                    className="mt-2 flex h-12 w-full items-center justify-center rounded-full bg-[#0F172A] text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? (
                      <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a10 10 0 100 10h-4a8 8 0 01-8-8z" />
                      </svg>
                    ) : null}
                    Sign Up
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
