import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff, UserPlus, MailCheck } from "lucide-react";
import api from "../api/client.js";
import { Card } from "../components/ui/Card.jsx";
import { Input, Label, FormGroup } from "../components/ui/Field.jsx";
import Button from "../components/ui/Button.jsx";
import BrandLogo from "../components/ui/BrandLogo.jsx";
import GoogleButton from "../components/auth/GoogleButton.jsx";

const labelClass = "mb-2 text-[15px] leading-5 font-semibold text-text-strong dark:!text-text-strong";
const inputClass = "min-h-11 rounded-[9px] border-border bg-white px-3 text-[14px] text-text-strong dark:!border-border  dark:!text-text-strong";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState("");

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
    <div className="relative flex min-h-screen items-center justify-center bg-canvas px-5 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandLogo to="/welcome" size="lg" textWeight="font-semibold" theme="light" className="uppercase" />
          <h1 className="mt-7 text-[24px] leading-[30px] font-bold text-text-strong">Create your account</h1>
        </div>

        <Card className="rounded-2xl border border-border bg-white p-6 shadow-card sm:p-8">
          {done ? (
            <div className="flex flex-col items-center py-4 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <MailCheck className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-text-strong">Account Created</h3>
              <p className="mt-2 text-[14px] text-text-muted">
                Your account is ready —{" "}
                <Link to="/login" className="font-semibold text-primary hover:underline">
                  log in
                </Link>{" "}
                to continue.
              </p>
            </div>
          ) : (
            <>
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {(error || validationError) && (
                <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">{error || validationError}</p>
              )}
              <FormGroup>
                <Label required className={labelClass}>Full Name</Label>
                <Input className={inputClass} value={form.name} onChange={update("name")} required />
              </FormGroup>
              <FormGroup>
                <Label required className={labelClass}>Email</Label>
                <Input className={inputClass} type="email" value={form.email} onChange={update("email")} required />
              </FormGroup>
              <FormGroup>
                <Label required className={labelClass}>Phone Number</Label>
                <Input className={inputClass} type="tel" value={form.phone} onChange={update("phone")} placeholder="+91 98765 43210" required />
              </FormGroup>
              <FormGroup>
                <Label htmlFor="register-password" required className={labelClass}>Password</Label>
                <div className="relative">
                  <Input id="register-password" className={`${inputClass} pr-11`} type={showPassword ? "text" : "password"} value={form.password} onChange={update("password")} minLength={8} required />
                  <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-1 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-text-muted hover:bg-canvas hover:text-primary">
                    {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                  </button>
                </div>
              </FormGroup>
              <p className="text-[13px] leading-5 text-text-muted">
                At least 8 characters, with an uppercase letter, a lowercase letter, a number, and a special character.
              </p>
              <Button type="submit" size="lg" loading={submitting} className="w-full dark:!bg-primary dark:!text-white">
                <UserPlus className="h-4 w-4" /> Create Account
              </Button>
            </form>
            <div className="my-6 flex items-center gap-3 text-[11px] text-text-muted"><span className="h-px flex-1 bg-border" /><span>OR</span><span className="h-px flex-1 bg-border" /></div>
            <GoogleButton onError={setError} />
            </>
          )}
        </Card>

        {!done && (
          <p className="mt-6 text-center text-[14px] text-text-muted">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Log in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
