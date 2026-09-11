import { useState } from "react";
import { User, Mail, Phone, Calendar, MapPin, CheckCircle2, ShieldCheck, Sparkles, Loader2 } from "lucide-react";
import VerificationTick from "../../../components/profile/VerificationTick";
import Button from "../../../components/ui/Button";
import api from "../../../api/client";
import { accountAuthHeader } from "../../../auth/accountAuth";

export default function PersonalTab({ profile, onRefresh }) {
  const [formData, setFormData] = useState({
    firstName: profile?.personal?.firstName || "",
    lastName: profile?.personal?.lastName || "",
    dob: profile?.personal?.dob ? profile.personal.dob.split("T")[0] : "",
    phone: profile?.personal?.phone || "",
    locationCity: profile?.personal?.locationCity || profile?.location || "",
    headline: profile?.personal?.headline || profile?.headline || "",
    bio: profile?.personal?.bio || profile?.bio || "",
  });

  const [saving, setSaving] = useState(false);
  const [otpModal, setOtpModal] = useState({ open: false, channel: "email", code: "", sending: false, verifying: false, error: "" });
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.put("/candidate-dashboard/profile/personal", formData, {
        headers: accountAuthHeader(),
      });
      setSuccess("Personal profile updated successfully.");
      setTimeout(() => setSuccess(""), 4000);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const startOtpFlow = async (channel) => {
    try {
      setOtpModal({ open: true, channel, code: "", sending: true, verifying: false, error: "" });
      const res = await api.post("/candidate-dashboard/profile/otp/send", { channel }, { headers: accountAuthHeader() });
      if (res.data.debugCode) {
        setOtpModal((prev) => ({ ...prev, sending: false, code: res.data.debugCode }));
      } else {
        setOtpModal((prev) => ({ ...prev, sending: false }));
      }
    } catch (err) {
      setOtpModal((prev) => ({ ...prev, sending: false, error: "Failed to send OTP code" }));
    }
  };

  const confirmOtp = async () => {
    try {
      setOtpModal((prev) => ({ ...prev, verifying: true, error: "" }));
      await api.post(
        "/candidate-dashboard/profile/otp/verify",
        { channel: otpModal.channel, code: otpModal.code },
        { headers: accountAuthHeader() }
      );
      setOtpModal({ open: false, channel: "email", code: "", sending: false, verifying: false, error: "" });
      setSuccess(`${otpModal.channel === "email" ? "Email" : "Phone"} verified successfully.`);
      setTimeout(() => setSuccess(""), 4000);
      onRefresh();
    } catch (err) {
      setOtpModal((prev) => ({ ...prev, verifying: false, error: err?.response?.data?.error || "Invalid OTP code" }));
    }
  };

  const ver = profile?.verification || {};

  return (
    <div className="candidate-personal-tab space-y-6">
      <div>
        <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">Personal Information</h2>
        <p className="text-xs text-slate-500">
          Core identity credentials with instant OCR &amp; OTP trust signals.
        </p>
      </div>

      {success && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">First Name</label>
              <VerificationTick
                size="sm"
                status={ver.nameMatch || "missing"}
                tooltip={ver.nameMatch === "verified" ? "Matches Government Document OCR" : "Upload document to verify"}
              />
            </div>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              placeholder="e.g. Sankalp"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">Last Name</label>
              <VerificationTick
                size="sm"
                status={ver.nameMatch || "missing"}
                tooltip={ver.nameMatch === "verified" ? "Matches Government Document OCR" : "Upload document to verify"}
              />
            </div>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              placeholder="e.g. Joshi"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">Email Address</label>
              <VerificationTick
                size="sm"
                status={ver.emailVerified ? "verified" : "missing"}
                fixLabel="Verify Email"
                onFix={() => startOtpFlow("email")}
                tooltip={ver.emailVerified ? "Email verified via OTP" : "Click to verify email"}
              />
            </div>
            <div className="relative mt-1">
              <input
                type="email"
                disabled
                value={profile?.user?.email || "candidate@aptushire.com"}
                className="w-full rounded-xl border border-slate-200 bg-slate-100/70 px-3.5 py-2.5 text-sm text-slate-600/60"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">Phone Number</label>
              <VerificationTick
                size="sm"
                status={ver.phoneVerified ? "verified" : "missing"}
                fixLabel="Verify Phone"
                onFix={() => startOtpFlow("phone")}
                tooltip={ver.phoneVerified ? "Phone verified via SMS / WhatsApp" : "Click to verify phone"}
              />
            </div>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="e.g. +91 98765 43210"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">Date of Birth</label>
              <VerificationTick
                size="sm"
                status={ver.govDocVerified ? "verified" : "missing"}
                tooltip={ver.govDocVerified ? "DOB verified against document" : "Verified via Gov Document OCR"}
              />
            </div>
            <input
              type="date"
              name="dob"
              value={formData.dob}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700">Location / City</label>
            <input
              type="text"
              name="locationCity"
              value={formData.locationCity}
              onChange={handleChange}
              placeholder="e.g. Bengaluru, India"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700">Professional Headline</label>
          <input
            type="text"
            name="headline"
            value={formData.headline}
            onChange={handleChange}
            placeholder="e.g. Senior Clinical Psychologist · 6+ yrs experience"
            className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700">Short Bio</label>
          <textarea
            name="bio"
            rows={3}
            value={formData.bio}
            onChange={handleChange}
            placeholder="Brief summary of your specialization, methodology, and career goals…"
            className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving Changes…" : "Save Personal Info"}
          </Button>
        </div>
      </form>

      {/* OTP Verification Modal */}
      {otpModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#F4F6F9]-deep/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-lift">
            <div className="flex items-center gap-2 text-[#F97316]">
              <ShieldCheck className="h-5 w-5" />
              <h3 className="font-display text-base font-bold text-[#0F172A]">
                Verify {otpModal.channel === "email" ? "Email Address" : "Phone Number"}
              </h3>
            </div>
            <p className="mt-1 text-xs text-[#64748B]">
              Enter the 6-digit verification code sent to your {otpModal.channel}.
            </p>

            {otpModal.error && (
              <p className="mt-2 text-xs font-bold text-red-600">{otpModal.error}</p>
            )}

            <div className="mt-4">
              <input
                type="text"
                maxLength={6}
                value={otpModal.code}
                onChange={(e) => setOtpModal({ ...otpModal, code: e.target.value })}
                placeholder="6-digit OTP"
                className="w-full text-center tracking-widest text-lg font-bold rounded-xl border border-[#E2E8F0] bg-[#F4F6F9] py-2.5 text-[#0F172A]"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setOtpModal({ ...otpModal, open: false })}>
                Cancel
              </Button>
              <Button size="sm" onClick={confirmOtp} disabled={otpModal.verifying || otpModal.code.length < 6}>
                {otpModal.verifying ? "Verifying…" : "Confirm Code"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
