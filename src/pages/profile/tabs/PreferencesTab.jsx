import { useState } from "react";
import { Bell, ShieldCheck, Download, CheckCircle2, Globe, MessageSquare, Loader2 } from "lucide-react";
import api from "../../../api/client";
import { accountAuthHeader } from "../../../auth/accountAuth";
import Button from "../../../components/ui/Button";

export default function PreferencesTab({ profile, onRefresh }) {
  const [preferences, setPreferences] = useState(profile?.preferences || {
    jobAlerts: true,
    whatsappUpdates: false,
    smsUpdates: false,
    availabilityWindow: "30_days",
    aiScreeningConsent: true,
    dataRetentionConsent: true,
  });

  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [success, setSuccess] = useState("");

  const handleToggle = (key) => {
    setPreferences({ ...preferences, [key]: !preferences[key] });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.put("/candidate-dashboard/profile/preferences", preferences, {
        headers: accountAuthHeader(),
      });
      setSuccess("Candidate preferences updated successfully.");
      setTimeout(() => setSuccess(""), 4000);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadData = async () => {
    try {
      setExporting(true);
      const res = await api.get("/candidate-dashboard/profile/export-data", {
        headers: accountAuthHeader(),
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `AptusHire-Data-Export-${Date.now()}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="candidate-preferences-tab space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold text-[#FF6B2C] dark:text-[#FF6B2C]">Preferences &amp; Privacy</h2>
        <p className="text-sm text-[#6B6B6B] dark:text-[#6B6B6B]">
          Configure notification channels, job alerts, and manage your data rights under GDPR &amp; DPDP regulations.
        </p>
      </div>

      {success && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        {/* Availability */}
        <div className="rounded-2xl border border-[#FFCAAF] bg-white p-5 shadow-xs dark:border-[#FFCAAF] dark:bg-white">
          <label className="block font-display text-base font-bold text-[#FF6B2C] dark:text-[#FF6B2C]">
            Availability Notice Period
          </label>
          <p className="text-sm text-[#6B6B6B] dark:text-[#6B6B6B]">
            Let hiring teams know how quickly you can join if extended an offer.
          </p>
          <select
            value={preferences.availabilityWindow}
            onChange={(e) => setPreferences({ ...preferences, availabilityWindow: e.target.value })}
            className="mt-3 w-full max-w-xs rounded-xl border border-[#FFCAAF] bg-white px-3.5 py-2.5 text-sm font-bold text-[#FF6B2C] dark:border-[#FFCAAF] dark:bg-white dark:text-[#FF6B2C]"
          >
            <option value="immediate">Immediate Joiner (0-7 days)</option>
            <option value="15_days">15 Days Notice Period</option>
            <option value="30_days">30 Days Notice Period</option>
            <option value="60_days">60+ Days Notice Period</option>
          </select>
        </div>

        {/* Notifications & Channels */}
        <div className="rounded-2xl border border-[#FFCAAF] bg-white p-5 shadow-xs dark:border-[#FFCAAF] dark:bg-white">
          <h3 className="font-display text-base font-bold text-[#FF6B2C] dark:text-[#FF6B2C]">Communication Channels</h3>
          <div className="mt-3 space-y-3 divide-y divide-[#EAF9E1] text-sm dark:divide-[#EAF9E1]">
            <label className="flex items-center justify-between pt-2 cursor-pointer">
              <div>
                <p className="font-bold text-[#FF6B2C] dark:text-[#FF6B2C]">Recommended Job Alerts</p>
                <p className="text-[#6B6B6B]">Receive weekly emails with roles matching your resume version skills.</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.jobAlerts}
                onChange={() => handleToggle("jobAlerts")}
                className="h-4 w-4 rounded text-[#FF6B2C] accent-[#214740] dark:accent-[#214740]"
              />
            </label>

            <label className="flex items-center justify-between pt-3 cursor-pointer">
              <div>
                <p className="font-bold text-[#FF6B2C] dark:text-[#FF6B2C]">WhatsApp Interview Reminders</p>
                <p className="text-[#6B6B6B]">Get timely reminders before AI interviews and assessment deadlines.</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.whatsappUpdates}
                onChange={() => handleToggle("whatsappUpdates")}
                className="h-4 w-4 rounded text-[#FF6B2C] accent-[#214740] dark:accent-[#214740]"
              />
            </label>

            <label className="flex items-center justify-between pt-3 cursor-pointer">
              <div>
                <p className="font-bold text-[#FF6B2C] dark:text-[#FF6B2C]">SMS Notifications</p>
                <p className="text-[#6B6B6B]">Critical stage alerts sent to your verified mobile number.</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.smsUpdates}
                onChange={() => handleToggle("smsUpdates")}
                className="h-4 w-4 rounded text-[#FF6B2C] accent-[#214740] dark:accent-[#214740]"
              />
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save Preferences"}
          </Button>
        </div>
      </form>

      {/* GDPR / DPDP Download My Data Box */}
      <section className="rounded-3xl border border-[#2E4F48] bg-[#FF6B2C] p-6 text-white shadow-soft">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-accent-300" />
              <h3 className="font-display text-base font-bold text-white">Download My Data (GDPR &amp; DPDP Portability)</h3>
            </div>
            <p className="mt-1 max-w-xl text-xs text-slate-300">
              Download a complete JSON export of all your candidate profile data, resume versions, uploaded documents, application history, and interview logs.
            </p>
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={handleDownloadData}
            disabled={exporting}
            className="shrink-0 bg-white text-[#FF6B2C] hover:bg-[#FFE8DC] font-bold"
          >
            {exporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Exporting…</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span>Export My Data</span>
              </>
            )}
          </Button>
        </div>
      </section>
    </div>
  );
}
