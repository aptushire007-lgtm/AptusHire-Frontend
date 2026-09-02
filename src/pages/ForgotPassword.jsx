import { useState } from "react";
import { Link } from "react-router-dom";
import { MailQuestion, CheckCircle2 } from "lucide-react";
import api from "../api/client.js";
import { Card } from "../components/ui/Card.jsx";
import { Input, Label, FormGroup } from "../components/ui/Field.jsx";
import Button from "../components/ui/Button.jsx";
import BrandLogo from "../components/ui/BrandLogo.jsx";
import ThemeToggle from "../components/ui/ThemeToggle.jsx";

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
    <div className="relative flex min-h-screen items-center justify-center bg-[#FAFCF8] px-5 py-12 transition-colors dark:bg-[#081210]">
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <BrandLogo to="/welcome" size="lg" />
        </div>

        <Card className="rounded-3xl border border-slate-200/90 bg-white p-6 text-center shadow-soft dark:border-slate-800/90 dark:bg-slate-900 sm:p-8">
          {done ? (
            <>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Check Your Email</h1>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                If an account exists for that email, a password reset link has been sent.
              </p>
              <Link to="/login" className="mt-5 inline-block text-xs font-semibold text-brand-700 hover:underline dark:text-brand-300">
                Back to login
              </Link>
            </>
          ) : (
            <>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-800 dark:bg-brand-950/60 dark:text-brand-300">
                <MailQuestion className="h-6 w-6" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Forgot Password</h1>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                Enter your email and we'll send you a link to reset your password.
              </p>
              <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-left">
                <FormGroup>
                  <Label required>Email Address</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </FormGroup>
                <Button type="submit" size="lg" loading={submitting} className="w-full">
                  Send Reset Link
                </Button>
              </form>
              <p className="mt-5 text-center">
                <Link to="/login" className="text-xs font-semibold text-brand-700 hover:underline dark:text-brand-300">
                  Back to login
                </Link>
              </p>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
