import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, LogIn } from "lucide-react";
import api from "../api/client.js";
import { saveAccountAuth } from "../auth/accountAuth.js";
import { getReturnTo, clearReturnTo } from "../auth/returnTo.js";
import { Card } from "../components/ui/Card.jsx";
import { Input, Label, FormGroup } from "../components/ui/Field.jsx";
import Button from "../components/ui/Button.jsx";
import BrandLogo from "../components/ui/BrandLogo.jsx";
import GoogleButton from "../components/auth/GoogleButton.jsx";

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
    <div className="flex min-h-screen items-center justify-center bg-[#F5F5F0] px-5 py-12 sm:px-8">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandLogo to="/welcome" size="lg" textWeight="font-semibold" theme="light" className="uppercase" />
          <h1 className="mt-7 text-[24px] leading-[30px] font-bold text-[#1A1A1A]">Find the right opportunity.</h1>
        </div>

        <Card padding="none" className="rounded-2xl border border-[#E8E8E4] bg-white p-6 shadow-[0_1px_4px_rgba(27,67,50,0.07)] sm:p-8">
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {(error || validationError) && (
              <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">
                {error || validationError}
              </p>
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
              <Label htmlFor="login-email" required className="mb-2 text-[13px] leading-5 font-semibold text-[#1A1A1A] dark:!text-[#1A1A1A]">Email</Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={update("email")}
                className="min-h-11 rounded-[9px] border-[#E8E8E4] bg-white px-3 text-[13px] text-[#1A1A1A] dark:!border-[#E8E8E4]  dark:!text-[#1A1A1A]"
                required
              />
            </FormGroup>
            <FormGroup>
              <div className="flex items-center justify-between">
                <Label htmlFor="login-password" required className="mb-2 text-[13px] leading-5 font-semibold text-[#1A1A1A] dark:!text-[#1A1A1A]">Password</Label>
                <Link to="/forgot-password" className="mb-2 text-[12px] font-semibold text-[#FF6B2C] hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={form.password}
                  onChange={update("password")}
                  className="min-h-11 rounded-[9px] border-[#E8E8E4] bg-white px-3 pr-11 text-[13px] text-[#1A1A1A] dark:!border-[#E8E8E4]  dark:!text-[#1A1A1A]"
                  required
                />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-1 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#6B6B6B] hover:bg-[#F5F5F0] hover:text-[#FF6B2C]">
                  {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
            </FormGroup>
            <label className="flex cursor-pointer items-center gap-2 text-[12px] font-medium text-[#6B6B6B]">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-5 w-5 rounded-md border-[#E8E8E4] text-[#FF6B2C] accent-primary"
              />
              Remember me
            </label>
            <Button
              type="submit"
              size="lg"
              loading={submitting}
              className="w-full"
            >
              <LogIn className="h-4 w-4" /> Login
            </Button>
          </form>
          <div className="my-6 flex items-center gap-3 text-[11px] text-[#6B6B6B]"><span className="h-px flex-1 bg-border" /><span>OR</span><span className="h-px flex-1 bg-border" /></div>
          <GoogleButton onError={setError} />
        </Card>

        <p className="mt-6 text-center text-[13px] text-[#6B6B6B]">
          Don't have an account?{" "}
          <Link to="/register" className="font-semibold text-[#FF6B2C] hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
