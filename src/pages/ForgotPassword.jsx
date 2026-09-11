import { useState } from "react";
import { Link } from "react-router-dom";
import { MailQuestion, CheckCircle2, ArrowLeft } from "lucide-react";
import api from "../api/client.js";
import { Input } from "../components/ui/Field.jsx";
import BrandLogo from "../components/ui/BrandLogo.jsx";

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

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/auth/forgot-password", { email });
    } finally {
      setSubmitting(false);
      setDone(true);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div
        className="flex flex-1 flex-col items-center justify-center px-5 py-12"
        style={{
          backgroundImage: "radial-gradient(circle, #d4d4d4 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          backgroundColor: "#fff",
        }}
      >
        <div className="mb-8">
          <BrandLogo to="/welcome" size="md" theme="light" />
        </div>

        <div className="w-full max-w-[400px] rounded-2xl border border-[#E2E8F0] bg-white px-8 py-10 shadow-sm">
          {done ? (
            <div className="flex flex-col items-center text-center">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h1 className="text-[22px] font-bold text-[#0F172A]">Check Your Email</h1>
              <p className="mt-3 text-[14px] text-[#64748B]">
                If an account exists for that email, a password reset link has been sent.
              </p>
              <Link
                to="/login"
                className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#F97316] hover:underline"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6 flex flex-col items-center text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#FEF3E8] text-[#F97316]">
                  <MailQuestion className="h-6 w-6" />
                </div>
                <h1 className="text-[22px] font-bold text-[#0F172A]">Forgot Password</h1>
                <p className="mt-2 text-[14px] text-[#64748B]">
                  Enter your email and we'll send you a link to reset your password.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="fp-email" className="mb-1.5 block text-[13px] font-semibold text-[#0F172A]">
                    Email Address
                  </label>
                  <Input
                    id="fp-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="h-11 w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFA] px-4 text-[14px] text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#F97316] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F97316]/15"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex h-12 w-full items-center justify-center rounded-full bg-[#0F172A] text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {submitting ? "Sending…" : "Send Reset Link"}
                </button>
              </form>

              <p className="mt-6 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#F97316] hover:underline"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to Sign In
                </Link>
              </p>
            </>
          )}
        </div>
      </div>

      <PageFooter />
    </div>
  );
}
