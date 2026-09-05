import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { KeyRound, CheckCircle2 } from "lucide-react";
import api from "../api/client.js";
import { Card } from "../components/ui/Card.jsx";
import { Input, Label, FormGroup } from "../components/ui/Field.jsx";
import Button from "../components/ui/Button.jsx";
import BrandLogo from "../components/ui/BrandLogo.jsx";
import ThemeToggle from "../components/ui/ThemeToggle.jsx";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      setDone(true);
      setTimeout(() => navigate("/login", { replace: true }), 2000);
    } catch (err) {
      setError(err.response?.data?.error || "Could not reset your password");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#F8FAF9] px-5 py-12 transition-colors">
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <BrandLogo to="/welcome" size="lg" />
        </div>

        <Card className="rounded-3xl border border-slate-200/90 bg-white p-6 text-center shadow-soft/90 sm:p-8">
          {done ? (
            <>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Password Reset</h1>
              <p className="mt-2 text-xs text-slate-500">
                Your password has been reset. Redirecting you to <Link to="/login" className="font-semibold text-[#176B45]">login</Link>…
              </p>
            </>
          ) : (
            <>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#E8F2EC] text-[#176B45]/60">
                <KeyRound className="h-6 w-6" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Choose a New Password</h1>
              <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-left">
                {error && (
                  <p className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">{error}</p>
                )}
                <FormGroup>
                  <Label required>New Password</Label>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
                </FormGroup>
                <Button type="submit" size="lg" loading={submitting} className="w-full">
                  Reset Password
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
