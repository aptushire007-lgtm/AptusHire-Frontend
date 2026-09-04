import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import api from "../api/client.js";
import { saveAccountAuth } from "../auth/accountAuth.js";
import { getReturnTo, clearReturnTo } from "../auth/returnTo.js";
import { Card } from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import BrandLogo from "../components/ui/BrandLogo.jsx";
import ThemeToggle from "../components/ui/ThemeToggle.jsx";

export default function VerifyEmail() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("verifying");
  const [error, setError] = useState("");
  const destination = getReturnTo() || "/dashboard";

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      try {
        const res = await api.post("/auth/verify-email", { token });
        if (cancelled) return;
        saveAccountAuth({ token: res.data.token, refreshToken: res.data.refreshToken, user: res.data.user });
        setStatus("done");
      } catch (err) {
        if (cancelled) return;
        setError(err.response?.data?.error || "This verification link is invalid or has expired.");
        setStatus("failed");
      }
    }

    verify();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (status !== "done") return;
    const timer = setTimeout(() => {
      clearReturnTo();
      navigate(destination, { replace: true });
    }, 1500);
    return () => clearTimeout(timer);
  }, [status, destination, navigate]);

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-5 py-12 transition-colors">
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <BrandLogo to="/welcome" size="lg" />
        </div>

        <Card className="rounded-3xl border border-border bg-surface p-6 text-center shadow-soft sm:p-8">
          {status === "verifying" && (
            <>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-primary/60">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
              <h1 className="text-xl font-bold text-text-strong">Verifying Your Email</h1>
              <p className="mt-2 text-xs text-text-muted">Please wait a moment…</p>
            </>
          )}

          {status === "failed" && (
            <>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                <XCircle className="h-6 w-6" />
              </div>
              <h1 className="text-xl font-bold text-text-strong">Verification Failed</h1>
              <p className="mt-2 text-xs text-text-muted">{error}</p>
              <p className="mt-4 text-xs">
                <Link to="/login" className="font-semibold text-primary hover:underline">
                  Request a new link from login
                </Link>
              </p>
            </>
          )}

          {status === "done" && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h1 className="text-xl font-bold text-text-strong">Email Verified</h1>
              <p className="mt-2 text-xs text-text-muted">
                Your email has been verified and you're now logged in. Redirecting you back…
              </p>
              <Button
                onClick={() => {
                  clearReturnTo();
                  navigate(destination, { replace: true });
                }}
                className="mt-5 w-full"
              >
                Continue
              </Button>
            </motion.div>
          )}
        </Card>
      </div>
    </div>
  );
}
