import { useState, useEffect } from "react";
import {
  FileText,
  Eye,
  Star,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  X,
  Loader2,
  ArrowRight,
} from "lucide-react";
import api from "../../api/client";
import { accountAuthHeader, getAccountAuth } from "../../auth/accountAuth";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";

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
  const [previewVersion, setPreviewVersion] = useState(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [consentAi, setConsentAi] = useState(true);
  const [consentData, setConsentData] = useState(true);
  const account = getAccountAuth()?.user || {};
  const nameParts = String(account.name || "").trim().split(/\s+/);
  const [firstName, setFirstName] = useState(nameParts[0] || "");
  const [lastName, setLastName] = useState(nameParts.slice(1).join(" "));
  const [email] = useState(account.email || "");

  useEffect(() => {
    if (!isOpen || !job?._id) {
      // Reset state when modal closes so stale data doesn't flash on reopen
      setVersionsData([]);
      setSelectedVersionId(null);
      setPreviewVersion(null);
      setPreviewPdfUrl("");
      setSubmitted(false);
      setError("");
      setLoading(true);
      return;
    }

    const controller = new AbortController();

    async function loadVersionScores() {
      try {
        setLoading(true);
        setError("");
        const res = await api.get(`/candidate-dashboard/jobs/${job._id}/match-versions`, {
          headers: accountAuthHeader(),
          signal: controller.signal,
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
        if (err.name === "CanceledError" || err.name === "AbortError") return;
        setError(err?.response?.data?.error || "Failed to load candidate resume versions");
      } finally {
        setLoading(false);
      }
    }

    loadVersionScores();
    return () => controller.abort();
  }, [isOpen, job]);

  useEffect(() => {
    if (!previewVersion) return undefined;
    let objectUrl = "";
    const controller = new AbortController();
    setPreviewLoading(true);
    api.get(`/candidate-dashboard/resumes/${previewVersion._id}/download`, {
      headers: accountAuthHeader(), responseType: "blob", signal: controller.signal,
    })
      .then((response) => {
        objectUrl = URL.createObjectURL(response.data);
        setPreviewPdfUrl(objectUrl);
      })
      .catch((err) => {
        if (err.name !== "CanceledError" && err.name !== "AbortError") setPreviewPdfUrl("");
      })
      .finally(() => setPreviewLoading(false));
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [previewVersion]);

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
      formData.append("name", [firstName, lastName].filter(Boolean).join(" ") || "Applicant");
      formData.append("email", email);

      const params = new URLSearchParams(window.location.search);
      if (params.get("src")) formData.append("src", params.get("src"));
      if (params.get("campaign")) formData.append("campaign", params.get("campaign"));

      const res = await api.post(`/jobs/${job._id}/apply`, formData, {
        headers: accountAuthHeader(),
      });

      if (onSuccess) {
        onSuccess(res.data);
      }
      setSubmitted(true);
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
    <Modal
      open={isOpen}
      onClose={onClose}
      showClose={false}
      size="xl"
      label={`Apply for ${job.title}`}
      panelClassName="max-h-[calc(100vh-2rem)] overflow-y-auto rounded-3xl border border-[#E5EBE7] bg-white p-6 shadow-lift sm:p-7"
    >
      <div className="relative w-full">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-0 top-0 inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="pr-8">
          <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-[#B9821E]">
            <Sparkles className="h-3.5 w-3.5" /> Target Resume Selector
          </span>
          <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-slate-900 ">
            Apply for {job.title}
          </h2>
          <p className="mt-1 text-xs text-slate-500 ">
            {job.company?.name || "AptusHire"} · Choose which targeted resume version to submit for evidence-backed AI screening.
          </p>
        </div>

        {submitted ? (
          <div className="my-5 rounded-2xl border border-[#DDEBE3] bg-[#F7FBF8] px-5 py-8 text-center sm:px-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#DCFCE7] text-[#15803D] shadow-[0_0_0_8px_rgba(220,252,231,0.45)]"><CheckCircle2 className="h-9 w-9" strokeWidth={2.2} aria-hidden="true" /></div>
            <span className="mt-6 inline-flex items-center rounded-full bg-[#DCFCE7] px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-[#166534]">Application submitted</span>
            <h3 className="mt-3 text-2xl font-bold tracking-tight text-[#0F172A]">You’re all set</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#64748B]">Your application for <span className="font-semibold text-slate-700">{job.title}</span> has been sent successfully. Track updates from Applied Jobs.</p>
            <Button type="button" className="mt-6 min-w-28 bg-[#172334] text-white hover:bg-navy-light" onClick={onClose}>Done</Button>
          </div>
        ) : error && (
          <div role="alert" className="mt-4 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700 dark:border-red-900/50">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!submitted && loading ? (
          <div className="my-8 flex flex-col items-center justify-center gap-2 text-center text-xs text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin text-[#F97316]" />
            <span>Calculating live match scores across your resume versions…</span>
          </div>
        ) : !submitted && versionsData.length === 0 ? (
          <div className="my-6 rounded-2xl border border-dashed border-slate-200 p-6 text-center ">
            <FileText className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-2 text-sm font-bold text-slate-900 ">No resume versions found</p>
            <p className="mt-1 text-xs text-slate-500">Please upload a resume in your Resume Manager first.</p>
          </div>
        ) : !submitted && (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold text-[#172334]">First Name<input value={firstName} onChange={(event) => setFirstName(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-[#E2E8F0] px-3 font-normal text-[#0F172A]" required /></label>
              <label className="text-sm font-semibold text-[#172334]">Last Name<input value={lastName} onChange={(event) => setLastName(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-[#E2E8F0] px-3 font-normal text-[#0F172A]" required /></label>
            </div>
            <label className="block text-sm font-semibold text-[#172334]">Email<input value={email} readOnly className="mt-1 h-11 w-full rounded-xl border border-[#E2E8F0] bg-[#F4F6F9] px-3 font-normal text-[#0F172A]" /></label>
            <div className="space-y-2.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 ">
                Select Resume Version
              </label>

              <div className="flex items-center gap-2">
                <select value={selectedVersionId || ""} onChange={(event) => setSelectedVersionId(event.target.value)} className="h-12 min-w-0 flex-1 rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm font-semibold text-[#0F172A]">
                  {versionsData.map((v) => <option key={v._id} value={v._id}>{v.label}{v.isDefault ? " (Default)" : ""}{v.isBestFit ? " - Best fit" : ""}</option>)}
                </select>
                <button type="button" onClick={() => setPreviewVersion(versionsData.find((version) => String(version._id) === String(selectedVersionId)) || null)} disabled={!selectedVersionId} aria-label="Preview selected resume" title="Preview selected resume" className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#CBD5E1] text-[#64748B] transition-colors hover:border-[#2563EB] hover:bg-[#EFF6FF] hover:text-[#2563EB] disabled:cursor-not-allowed disabled:opacity-40"><Eye className="h-5 w-5" /></button>
              </div>
            </div>

            {/* Compliance & Consent Disclosures */}
            <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 text-xs  /40">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentAi}
                  onChange={(e) => setConsentAi(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded text-[#F97316] accent-[#F97316]"
                />
                <span className="text-slate-600 ">
                  I consent to AI screening and evidence evaluation in accordance with the{" "}
                  <a href="/welcome" target="_blank" rel="noreferrer" className="font-semibold text-[#F97316] underline">
                    NYC LL144 &amp; DPDP Algorithmic Transparency Disclosure
                  </a>.
                </span>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentData}
                  onChange={(e) => setConsentData(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded text-[#F97316] accent-[#F97316]"
                />
                <span className="text-slate-600 ">
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
    </Modal>
    {previewVersion && (
      <div className="fixed inset-0 z-70 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-label="Resume preview" onClick={() => setPreviewVersion(null)}>
        <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Resume preview</p><h3 className="mt-0.5 truncate text-base font-bold text-[#0F172A]">{previewVersion.label}</h3></div><button type="button" onClick={() => setPreviewVersion(null)} aria-label="Close preview" className="rounded-lg p-2 text-[#64748B] hover:bg-[#F1F5F9]"><X className="h-5 w-5" /></button></div>
          <div className="min-h-0 flex-1 bg-[#F4F6F9] p-3 sm:p-5">{previewLoading ? <div className="flex h-[60vh] items-center justify-center text-sm text-[#64748B]">Loading resume preview…</div> : previewPdfUrl ? <iframe title={`${previewVersion.label} preview`} src={previewPdfUrl} className="h-[70vh] w-full rounded-lg border border-[#E2E8F0] bg-white" /> : <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap rounded-lg bg-white p-5 text-sm leading-6 text-slate-700">{previewVersion.parsedSnapshot?.rawText || "Preview is not available for this resume version."}</pre>}</div>
        </div>
      </div>
    )}
    </>
  );
}
