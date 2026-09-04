import { useState } from "react";
import { Briefcase, Plus, Trash2, CheckCircle2, Sparkles, Tag } from "lucide-react";
import api from "../../../api/client";
import { accountAuthHeader } from "../../../auth/accountAuth";
import Button from "../../../components/ui/Button";

const EMPTY_EXP = { title: "", company: "", startDate: "", endDate: "", current: false, summary: "", skills: [] };

export default function ExperienceTab({ profile, onRefresh }) {
  const [experience, setExperience] = useState(profile?.experience || []);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  const handleChange = (index, field, value) => {
    const next = [...experience];
    next[index] = { ...next[index], [field]: value };
    setExperience(next);
  };

  const handleSkillsChange = (index, commaString) => {
    const skills = commaString.split(",").map((s) => s.trim()).filter(Boolean);
    handleChange(index, "skills", skills);
  };

  const addEntry = () => {
    setExperience([...experience, { ...EMPTY_EXP }]);
  };

  const removeEntry = (index) => {
    setExperience(experience.filter((_, i) => i !== index));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.put("/candidate-dashboard/profile/experience", { experience }, { headers: accountAuthHeader() });
      setSuccess("Experience history saved successfully (10% profile strength).");
      setTimeout(() => setSuccess(""), 4000);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">Work Experience</h2>
          <p className="text-xs text-slate-500">
            Detail your past employment, responsibilities, and verified skills.
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={addEntry}>
          <Plus className="h-4 w-4" /> Add Experience
        </Button>
      </div>

      {success && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        {experience.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
            <Briefcase className="mx-auto h-10 w-10 text-slate-400" />
            <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white">No experience added</p>
            <p className="mt-0.5 text-xs text-slate-500">Adding at least one role awards 10% profile strength.</p>
            <Button size="sm" className="mt-4" onClick={addEntry}>Add Experience</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {experience.map((item, idx) => (
              <div key={idx} className="relative rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
                <button
                  type="button"
                  onClick={() => removeEntry(idx)}
                  className="absolute right-4 top-4 text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700">Job Title / Role</label>
                    <input
                      type="text"
                      required
                      value={item.title}
                      onChange={(e) => handleChange(idx, "title", e.target.value)}
                      placeholder="e.g. Lead Consultant Psychologist"
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700">Company / Organization</label>
                    <input
                      type="text"
                      required
                      value={item.company}
                      onChange={(e) => handleChange(idx, "company", e.target.value)}
                      placeholder="e.g. Apollo TeleHealth"
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700">Start Date</label>
                    <input
                      type="text"
                      value={item.startDate}
                      onChange={(e) => handleChange(idx, "startDate", e.target.value)}
                      placeholder="e.g. Jun 2021"
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700">End Date</label>
                    <input
                      type="text"
                      value={item.endDate}
                      onChange={(e) => handleChange(idx, "endDate", e.target.value)}
                      placeholder="e.g. Present"
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label className="block text-xs font-bold text-slate-700">Key Responsibilities &amp; Impact</label>
                  <textarea
                    rows={2}
                    value={item.summary}
                    onChange={(e) => handleChange(idx, "summary", e.target.value)}
                    placeholder="Describe your scope of work and key achievements…"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div className="mt-3">
                  <label className="block text-xs font-bold text-slate-700">Skills Demonstrated (comma-separated)</label>
                  <input
                    type="text"
                    value={item.skills?.join(", ") || ""}
                    onChange={(e) => handleSkillsChange(idx, e.target.value)}
                    placeholder="e.g. CBT, Neuropsychology, Diagnostic Assessments"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:text-white"
                  />
                  {item.skills?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {item.skills.map((s) => (
                        <span key={s} className="rounded-full bg-[#FFE8DC] px-2 py-0.5 text-[11px] font-semibold text-[#FF6B2C]">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save Experience"}
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
