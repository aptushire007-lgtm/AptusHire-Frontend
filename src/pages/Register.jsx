import { useState } from "react";
import { Link } from "react-router-dom";
import { UserPlus, MailCheck } from "lucide-react";
import api from "../api/client.js";
import { Card } from "../components/ui/Card.jsx";
import { Input, Label, FormGroup } from "../components/ui/Field.jsx";
import Button from "../components/ui/Button.jsx";
import BrandLogo from "../components/ui/BrandLogo.jsx";

const labelClass = "mb-2 text-[15px] leading-5 font-semibold text-[#2E2F2D] dark:!text-[#2E2F2D]";
const inputClass = "min-h-11 rounded-[9px] border-[#DFE5DF] bg-white px-3 text-[14px] text-[#2E2F2D] dark:!border-[#DFE5DF] dark:!bg-white dark:!text-[#2E2F2D]";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
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
    <div className="relative flex min-h-screen items-center justify-center bg-[#ECF3EB] px-5 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandLogo to="/welcome" size="xl" textWeight="font-semibold" theme="light" className="mb-4" />
          <h1 className="text-[24px] leading-[30px] font-bold text-[#2E2F2D]">Create Your Account</h1>
          <p className="mt-1 text-[13px] text-[#707E79]">Start applying to AI-screened jobs in minutes</p>
        </div>

        <Card className="rounded-2xl border border-[#DFE5DF] bg-white p-6 shadow-card sm:p-8">
          {done ? (
            <div className="flex flex-col items-center py-4 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <MailCheck className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-[#2E2F2D]">Account Created</h3>
              <p className="mt-2 text-[14px] text-[#707E79]">
                Your account is ready —{" "}
                <Link to="/login" className="font-semibold text-brand-700 hover:underline dark:text-brand-300">
                  log in
                </Link>{" "}
                to continue.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <p className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>
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
                <Label required className={labelClass}>Password</Label>
                <Input className={inputClass} type="password" value={form.password} onChange={update("password")} minLength={8} required />
              </FormGroup>
              <p className="text-[13px] leading-5 text-[#5A7B71]">
                At least 8 characters, with an uppercase letter, a lowercase letter, a number, and a special character.
              </p>
              <Button type="submit" size="lg" loading={submitting} className="w-full dark:!bg-[#214740] dark:!text-white">
                <UserPlus className="h-4 w-4" /> Create Account
              </Button>
            </form>
          )}
        </Card>

        {!done && (
          <p className="mt-6 text-center text-[14px] text-[#707E79]">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-[#214740] hover:underline">
              Log in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
