import { useState, useEffect } from "react";
import {
  FileText,
  Star,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  X,
  Loader2,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import api from "../../api/client";
import { accountAuthHeader } from "../../auth/accountAuth";
import Button from "../../components/ui/Button";

export default function ApplyVersionModal({
  job,
  isOpen,
  onClose,
  onSuccess,
}) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [versionsData, setVersionsData] = useState([]);
  const [selectedVersionId, setSelectedVersionId] = useState(null);

  const [consentAi, setConsentAi] = useState(true);
  const [consentData, setConsentData] = useState(true);

  useEffect(() => {
    if (!isOpen || !job?._id) return;

    async function loadVersionScores() {
      try {
        setLoading(true);
        setError("");
        const res = await api.get(`/candidate-dashboard/jobs/${job.slug || job._id}/match-versions`, {
          headers: accountAuthHeader(),
        });
        const versions = res.data.versions || [];
        setVersionsData(versions);

        // Preselect Best Fit, or Default, or first available
        const bestFit = versions.find((v) => v.isBestFit);
        const defaultVer = versions.find((v) => v.isDefault);
        if (bestFit) {
          setSelectedVersionId(bestFit._id);
        } else if (defaultVer) {
          setSelectedVersionId(defaultVer._id);
        } else if (versions.length > 0) {
          setSelectedVersionId(versions[0]._id);
        }
      } catch (err) {
        setError(err?.response?.data?.error || "Failed to load candidate resume versions");
      } finally {
        setLoading(false);
      }
    }

    loadVersionScores();
  }, [isOpen, job]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVersionId) {
      setError("Please select a resume version to submit.");
      return;
    }
    if (!consentAi || !consentData) {
      setError("Please accept the data processing & AI screening consent disclosures.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const formData = new FormData();
      formData.append("resumeVersionId", selectedVersionId);
      formData.append("consentAiProcessing", true);
      formData.append("consentDataProcessing", true);
      // Prepopulate name from candidate profile
      formData.append("name", "Applicant");

      const params = new URLSearchParams(window.location.search);
      if (params.get("src")) formData.append("src", params.get("src"));
      if (params.get("campaign")) formData.append("campaign", params.get("campaign"));

      const res = await api.post(`/jobs/${job.slug || job._id}/apply`, formData, {
        headers: { "Content-Type": "multipart/form-data", ...accountAuthHeader() },
      });

      if (onSuccess) {
        onSuccess(res.data);
      }
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-lift dark:border-slate-800 dark:bg-slate-900 sm:p-7">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-5 top-5 inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="pr-8">
          <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-brand-700 dark:text-accent-400">
            <Sparkles className="h-3.5 w-3.5" /> Target Resume Selector
          </span>
          <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Apply for {job.title}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {job.company?.name || "AptusHire"} · Choose which targeted resume version to submit for evidence-backed AI screening.
          </p>
        </div>

        {error && (
          <div role="alert" className="mt-4 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="my-8 flex flex-col items-center justify-center gap-2 text-center text-xs text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin text-brand-700 dark:text-accent-400" />
            <span>Calculating live match scores across your resume versions…</span>
          </div>
        ) : versionsData.length === 0 ? (
          <div className="my-6 rounded-2xl border border-dashed border-slate-200 p-6 text-center dark:border-slate-800">
            <FileText className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white">No resume versions found</p>
            <p className="mt-1 text-xs text-slate-500">Please upload a resume in your Resume Manager first.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="space-y-2.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Select Resume Version
              </label>

              {versionsData.map((v) => {
                const isSelected = selectedVersionId === v._id;
                return (
                  <div
                    key={v._id}
                    onClick={() => setSelectedVersionId(v._id)}
                    className={`cursor-pointer rounded-2xl border p-3.5 transition-all ${
                      isSelected
                        ? "border-brand-800 bg-[#FAFCF8] ring-2 ring-brand-800/15 dark:border-[#7CDE4A] dark:bg-slate-800/90 dark:ring-[#7CDE4A]/20"
                        : "border-slate-200/90 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="resume_version"
                          checked={isSelected}
                          onChange={() => setSelectedVersionId(v._id)}
                          className="h-4 w-4 text-brand-800 accent-[#0E3B2E] dark:accent-[#7CDE4A]"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                              {v.label}
                            </span>
                            {v.isDefault && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                <Star className="h-2.5 w-2.5 fill-current" /> Default
                              </span>
                            )}
                          </div>
                          {v.tags?.length > 0 && (
                            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                              Tags: {v.tags.join(", ")}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {v.isBestFit && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#D4F056] px-2.5 py-0.5 text-[11px] font-extrabold text-[#0C1F1B] shadow-2xs">
                            <Sparkles className="h-3 w-3" /> Best Fit
                          </span>
                        )}
                        <span className="rounded-full bg-[#EAF8E4] px-2.5 py-0.5 text-xs font-extrabold text-[#147A40] dark:bg-[#143B2A] dark:text-[#7CDE4A]">
                          {v.matchScore}% match
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Compliance & Consent Disclosures */}
            <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 text-xs dark:border-slate-800 dark:bg-slate-800/40">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentAi}
                  onChange={(e) => setConsentAi(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded text-brand-800 accent-[#0E3B2E] dark:accent-[#7CDE4A]"
                />
                <span className="text-slate-600 dark:text-slate-300">
                  I consent to AI screening and evidence evaluation in accordance with the{" "}
                  <a href="/welcome" target="_blank" rel="noreferrer" className="font-semibold text-brand-700 underline dark:text-accent-400">
                    NYC LL144 &amp; DPDP Algorithmic Transparency Disclosure
                  </a>.
                </span>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentData}
                  onChange={(e) => setConsentData(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded text-brand-800 accent-[#0E3B2E] dark:accent-[#7CDE4A]"
                />
                <span className="text-slate-600 dark:text-slate-300">
                  I consent to sharing my selected resume snapshot and verified profile credentials with the hiring team.
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || versionsData.length === 0}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Sealing Application…</span>
                  </>
                ) : (
                  <>
                    <span>Submit Application</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
