import { useState } from "react";
import { CheckCircle2, Save } from "lucide-react";
import api from "../../../api/client";
import { accountAuthHeader } from "../../../auth/accountAuth";
import Button from "../../../components/ui/Button";

function splitSkills(value) {
  return value.split(",").map((skill) => skill.trim()).filter(Boolean);
}

export default function SkillsTab({ profile, onRefresh }) {
  const [skills, setSkills] = useState((profile?.skills || []).join(", "));
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  async function handleSave(event) {
    event.preventDefault();
    const values = [...new Set(splitSkills(skills))];
    setSaving(true);
    setSuccess("");
    setError("");
    try {
      await api.patch("/candidate-dashboard/profile", { skills: values }, { headers: accountAuthHeader() });
      setSkills(values.join(", "));
      setSuccess("Skills saved successfully.");
      onRefresh();
    } catch (err) {
      setError(err?.response?.data?.error || "We could not save your skills. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">Skills</h2>
        <p className="text-xs text-slate-500">
          Add technical skills, soft skills, tools, and certifications as a comma-separated list.
        </p>
      </div>

      {success && <p role="status" className="flex items-center gap-2 rounded-xl bg-[#E8F2EC] p-3 text-xs font-semibold text-[#176B45]"><CheckCircle2 className="h-4 w-4" />{success}</p>}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">{error}</p>}

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label htmlFor="profile-skills" className="block text-xs font-bold text-slate-700">Technical skills, soft skills, tools, and certifications</label>
          <textarea
            id="profile-skills"
            rows={5}
            value={skills}
            onChange={(event) => setSkills(event.target.value)}
            placeholder="React, SQL, communication, Figma, AWS Certified Cloud Practitioner"
            className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
          />
          <p className="mt-1 text-[11px] text-slate-500">The existing profile API stores these as one searchable skills list.</p>
        </div>
        <div className="flex justify-end pt-2">
          <Button type="submit" loading={saving}><Save className="h-4 w-4" /> Save Skills</Button>
        </div>
      </form>
    </div>
  );
}
