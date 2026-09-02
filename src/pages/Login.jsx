import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { LogIn } from "lucide-react";
import api from "../api/client.js";
import { saveAccountAuth } from "../auth/accountAuth.js";
import { getReturnTo, clearReturnTo } from "../auth/returnTo.js";
import { Card } from "../components/ui/Card.jsx";
import { Input, Label, FormGroup } from "../components/ui/Field.jsx";
import Button from "../components/ui/Button.jsx";
import BrandLogo from "../components/ui/BrandLogo.jsx";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setNeedsVerification(false);
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
    <div className="relative flex min-h-screen items-center justify-center bg-[#ECF3EB] px-5 py-12 sm:px-8">
      <div className="w-full max-w-md">
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="mb-5 flex w-full justify-center">
            <BrandLogo to="/welcome" size="xl" textWeight="font-semibold" theme="light" />
          </div>
          <h1 className="text-[24px] leading-[30px] font-bold text-[#2E2F2D]">Welcome back</h1>
          <p className="mt-2 text-[13px] leading-5 text-[#707E79]">
            Log in to track your applications and interviews
          </p>
        </div>

        <Card
          padding="none"
          className="rounded-2xl border border-[#DFE5DF] bg-white p-6 shadow-card sm:p-8"
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <p className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>
            )}
            {needsVerification && (
              <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                {resendSent ? (
                  "A new verification link has been sent if that account exists."
                ) : (
                  <button type="button" className="font-semibold underline" onClick={handleResend}>
                    Resend verification email
                  </button>
                )}
              </p>
            )}
            <FormGroup>
              <Label required className="mb-2 text-[15px] leading-5 font-semibold text-[#2E2F2D] dark:!text-[#2E2F2D]">Email</Label>
              <Input
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={update("email")}
                className="min-h-11 rounded-[9px] border-[#DFE5DF] bg-white px-3 text-[13px] text-[#2E2F2D] dark:!border-[#DFE5DF] dark:!bg-white dark:!text-[#2E2F2D]"
                required
              />
            </FormGroup>
            <FormGroup>
              <Label required className="mb-2 text-[15px] leading-5 font-semibold text-[#2E2F2D] dark:!text-[#2E2F2D]">Password</Label>
              <Input
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={update("password")}
                className="min-h-11 rounded-[9px] border-[#DFE5DF] bg-white px-3 text-[13px] text-[#2E2F2D] dark:!border-[#DFE5DF] dark:!bg-white dark:!text-[#2E2F2D]"
                required
              />
            </FormGroup>
            <label className="flex cursor-pointer items-center gap-2 text-[13px] font-medium text-[#707E79]">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-5 w-5 rounded-md border-slate-300 text-brand-800 accent-[#0E3B2E]"
              />
              Remember me
            </label>
            <Button
              type="submit"
              size="lg"
              loading={submitting}
              className="w-full"
            >
              <LogIn className="h-5 w-5" /> Log In
            </Button>
          </form>
          <p className="mt-7 text-center text-base text-black">
            <Link to="/forgot-password" className="font-bold text-[#0E3B2E] decoration-[#F58232] decoration-2 underline-offset-4 hover:underline">
              Forgot your password?
            </Link>
          </p>
        </Card>

        <p className="mt-7 text-center text-base font-semibold text-black sm:text-lg">
          Don't have an account?{" "}
          <Link to="/register" className="font-extrabold text-[#0E3B2E] decoration-[#F58232] decoration-2 underline-offset-4 hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
