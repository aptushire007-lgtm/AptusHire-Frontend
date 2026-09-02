import { useState } from "react";
import { GraduationCap, Plus, Trash2, CheckCircle2, Sparkles } from "lucide-react";
import api from "../../../api/client";
import { accountAuthHeader } from "../../../auth/accountAuth";
import Button from "../../../components/ui/Button";

const EMPTY_EDU = { institution: "", degree: "", fieldOfStudy: "", startYear: "", endYear: "", grade: "", current: false };

export default function EducationTab({ profile, onRefresh }) {
  const [education, setEducation] = useState(profile?.education || []);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  const handleChange = (index, field, value) => {
    const next = [...education];
    next[index] = { ...next[index], [field]: value };
    setEducation(next);
  };

  const addEntry = () => {
    setEducation([...education, { ...EMPTY_EDU }]);
  };

  const removeEntry = (index) => {
    setEducation(education.filter((_, i) => i !== index));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.put("/candidate-dashboard/profile/education", { education }, { headers: accountAuthHeader() });
      setSuccess("Education history saved successfully (+10% profile strength).");
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
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">Education History</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            List your academic degrees, certifications, and institutions.
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={addEntry}>
          <Plus className="h-4 w-4" /> Add Degree
        </Button>
      </div>

      {success && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        {education.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
            <GraduationCap className="mx-auto h-10 w-10 text-slate-400" />
            <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white">No education added</p>
            <p className="mt-0.5 text-xs text-slate-500">Adding at least one education entry awards +10% profile strength.</p>
            <Button size="sm" className="mt-4" onClick={addEntry}>Add Education</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {education.map((item, idx) => (
              <div key={idx} className="relative rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => removeEntry(idx)}
                  className="absolute right-4 top-4 text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Institution / University</label>
                    <input
                      type="text"
                      required
                      value={item.institution}
                      onChange={(e) => handleChange(idx, "institution", e.target.value)}
                      placeholder="e.g. National Institute of Mental Health and Neurosciences"
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Degree</label>
                    <input
                      type="text"
                      required
                      value={item.degree}
                      onChange={(e) => handleChange(idx, "degree", e.target.value)}
                      placeholder="e.g. M.Phil in Clinical Psychology"
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Specialization</label>
                    <input
                      type="text"
                      value={item.fieldOfStudy || ""}
                      onChange={(e) => handleChange(idx, "fieldOfStudy", e.target.value)}
                      placeholder="e.g. Computer Science"
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Graduation Year</label>
                    <input
                      type="text"
                      value={item.endYear}
                      onChange={(e) => handleChange(idx, "endYear", e.target.value)}
                      placeholder="e.g. 2022"
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Grade / GPA / Honors</label>
                    <input
                      type="text"
                      value={item.grade}
                      onChange={(e) => handleChange(idx, "grade", e.target.value)}
                      placeholder="e.g. First Class with Distinction"
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between pt-2">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                ★ Claims may be explored in AI interviews — verified claims raise your evidence score.
              </p>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save Education"}
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
