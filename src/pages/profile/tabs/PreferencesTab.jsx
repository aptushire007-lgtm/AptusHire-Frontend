import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
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

  return (
    <div className="candidate-preferences-tab space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold text-[#172334] dark:text-[#172334]">Preferences &amp; Privacy</h2>
        <p className="text-sm text-[#64748B] dark:text-[#64748B]">
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
        <div className="rounded-2xl border border-[#F5B51B]/50 bg-white p-5 shadow-xs dark:border-[#F5B51B]/50 dark:bg-white">
          <label className="block font-display text-base font-bold text-[#172334] dark:text-[#172334]">
            Availability Notice Period
          </label>
          <p className="text-sm text-[#64748B] dark:text-[#64748B]">
            Let hiring teams know how quickly you can join if extended an offer.
          </p>
          <select
            value={preferences.availabilityWindow}
            onChange={(e) => setPreferences({ ...preferences, availabilityWindow: e.target.value })}
            className="mt-3 w-full max-w-xs rounded-xl border border-[#F5B51B]/50 bg-white px-3.5 py-2.5 text-sm font-bold text-[#E5A514] dark:border-[#F5B51B]/50 dark:bg-white dark:text-[#E5A514]"
          >
            <option value="immediate">Immediate Joiner (0-7 days)</option>
            <option value="15_days">15 Days Notice Period</option>
            <option value="30_days">30 Days Notice Period</option>
            <option value="60_days">60+ Days Notice Period</option>
          </select>
        </div>

        {/* Notifications & Channels */}
        <div className="rounded-2xl border border-[#F5B51B]/50 bg-white p-5 shadow-xs dark:border-[#F5B51B]/50 dark:bg-white">
          <h3 className="font-display text-base font-bold text-[#172334] dark:text-[#172334]">Communication Channels</h3>
          <div className="mt-3 space-y-3 divide-y divide-[#FFF4CC] text-sm dark:divide-[#FFF4CC]">
            <label className="flex items-center justify-between pt-2 cursor-pointer">
              <div>
                <p className="font-bold text-[#172334] dark:text-[#172334]">Recommended Job Alerts</p>
                <p className="text-[#64748B]">Receive weekly emails with roles matching your resume version skills.</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.jobAlerts}
                onChange={() => handleToggle("jobAlerts")}
                className="h-4 w-4 rounded text-[#E5A514] accent-[#F5B51B] dark:accent-[#F5B51B]"
              />
            </label>

            <label className="flex items-center justify-between pt-3 cursor-pointer">
              <div>
                <p className="font-bold text-[#172334] dark:text-[#172334]">WhatsApp Interview Reminders</p>
                <p className="text-[#64748B]">Get timely reminders before AI interviews and assessment deadlines.</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.whatsappUpdates}
                onChange={() => handleToggle("whatsappUpdates")}
                className="h-4 w-4 rounded text-[#E5A514] accent-[#F5B51B] dark:accent-[#F5B51B]"
              />
            </label>

            <label className="flex items-center justify-between pt-3 cursor-pointer">
              <div>
                <p className="font-bold text-[#172334] dark:text-[#172334]">SMS Notifications</p>
                <p className="text-[#64748B]">Critical stage alerts sent to your verified mobile number.</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.smsUpdates}
                onChange={() => handleToggle("smsUpdates")}
                className="h-4 w-4 rounded text-[#E5A514] accent-[#F5B51B] dark:accent-[#F5B51B]"
              />
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={saving}
            data-profile-action="true"
            className="bg-[#F5B51B]! text-[#172334]! hover:bg-[#E5A514]! focus-visible:ring-[#F5B51B]/25!"
          >
            {saving ? "Saving…" : "Save Preferences"}
          </Button>
        </div>
      </form>

    </div>
  );
}

