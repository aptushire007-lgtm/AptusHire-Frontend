/* =============================================================
   AutoApplyModal.jsx
   Shown when the candidate clicks "Turn it on" in the
   Recommended Jobs page.

   Features (matching reference images exactly):
   1. Big match count + "MATCHES READY TO APPLY" header
   2. Resume picker pill (shows uploaded default resume name,
      click → opens SelectCVModal)
   3. "Also include Good matches" checkbox that toggles the
      list between strong-only and strong+good, and updates
      the count + role count button
   4. Scrollable jobs list with title / company / score %
   5. Info box (hourly checks + questions note)
   6. Cancel / "Turn on & apply" buttons
   ============================================================= */
import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { X, FileText, ChevronDown, ChevronUp, Clock, Info, Upload, Check } from "lucide-react";
import api from "../../api/client.js";
import { accountAuthHeader } from "../../auth/accountAuth.js";

/* ── colour tokens (project orange + navy) ────────────────── */
const OR   = "#F97316";
const NV   = "#1B2A3B";
const BD   = "#E2E8F0";
const TX   = "#0F172A";
const MT   = "#64748B";
const WH   = "#FFFFFF";

/* ── percent colour: ≥80 green, ≥60 blue, else grey ─────── */
function pctColor(score) {
  if (score >= 80) return "#16A34A";
  if (score >= 60) return "#2563EB";
  return MT;
}

/* ── SelectCV sub-modal ──────────────────────────────────── */
function SelectCVModal({ resumes, onSelect, onClose }) {
  const [selected, setSelected] = useState(
    resumes.find((r) => r.isDefault)?._id || resumes[0]?._id || null
  );
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleUploadFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("resume", file);
    fd.append("label", file.name);
    try {
      setUploading(true);
      const res = await api.post("/candidate-dashboard/resumes/upload", fd, {
        headers: { "Content-Type": "multipart/form-data", ...accountAuthHeader() },
      });
      const uploaded = res.data;
      // Pass the newly uploaded resume back
      onSelect({ _id: uploaded._id, label: uploaded.label || file.name, isDefault: false });
      onClose();
    } catch {
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return createPortal(
    /* Backdrop — sits above parent modal */
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-[#0F172A] text-white hover:opacity-80"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="text-[18px] font-bold text-[#0F172A]">Select a CV</h2>
        <p className="mt-1 text-[13px] text-[#64748B]">
          Select the CV you want to use for this role.
        </p>

        {/* Your CVs */}
        <p className="mt-5 text-[12px] font-semibold text-[#0F172A]">
          Your CVs {resumes.length}
        </p>

        <div className="mt-2 space-y-2">
          {resumes.filter((r) => !r.isArchived).map((r) => (
            <label
              key={r._id}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                selected === r._id
                  ? "border-[#0F172A] bg-white"
                  : "border-[#E2E8F0] bg-white hover:border-[#0F172A]"
              }`}
            >
              <input
                type="radio"
                name="cv-select"
                value={r._id}
                checked={selected === r._id}
                onChange={() => setSelected(r._id)}
                className="h-4 w-4 accent-[#0F172A]"
              />
              <FileText className="h-4 w-4 shrink-0 text-[#64748B]" />
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#0F172A]">
                {r.label}
              </span>
              {r.isDefault && (
                <span className="shrink-0 rounded-full bg-[#0F172A] px-2.5 py-0.5 text-[10px] font-bold text-white">
                  Default
                </span>
              )}
            </label>
          ))}
        </div>

        {/* Upload new */}
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.doc,.docx"
          className="hidden"
          onChange={handleUploadFile}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="mt-3 flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] py-5 text-[13px] text-[#64748B] hover:border-[#94A3B8] transition-colors"
        >
          <Upload className="h-5 w-5" />
          <span className="font-medium text-[#0F172A]">
            {uploading ? "Uploading…" : "Click to upload"}
          </span>
          <span className="text-[12px] text-[#94A3B8]">(PDF, Doc, Docx — up to 10MB)</span>
        </button>

        {/* Use CV */}
        <button
          type="button"
          disabled={!selected}
          onClick={() => {
            const r = resumes.find((x) => x._id === selected);
            if (r) { onSelect(r); onClose(); }
          }}
          className="mt-4 flex h-12 w-full items-center justify-center rounded-full bg-[#0F172A] text-[14px] font-semibold text-white disabled:opacity-40 hover:opacity-90"
        >
          Use CV
        </button>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 flex h-11 w-full items-center justify-center rounded-full border border-[#E2E8F0] text-[13px] font-medium text-[#64748B] hover:bg-[#F8FAFC]"
        >
          Cancel
        </button>
      </div>
    </div>,
    document.body
  );
}

/* ── Main AutoApply Modal ─────────────────────────────────── */
export default function AutoApplyModal({
  onClose,
  onConfirm,
  strongJobs = [],    // Strong match jobs (score >= 80 or pos < 5)
  goodJobs   = [],    // Good match jobs (score 60-79 or pos 5-15)
}) {
  const [resumes,         setResumes]         = useState([]);
  const [selectedResume,  setSelectedResume]  = useState(null);
  const [includeGood,     setIncludeGood]     = useState(false);
  const [showRoles,       setShowRoles]       = useState(true);
  const [showCVPicker,    setShowCVPicker]    = useState(false);
  const [confirming,      setConfirming]      = useState(false);

  /* Fetch resumes on mount */
  useEffect(() => {
    api.get("/candidate-dashboard/resumes", { headers: accountAuthHeader() })
      .then((res) => {
        const all = res.data.versions || [];
        setResumes(all.filter((r) => !r.isArchived));
        const def = all.find((r) => r.isDefault && !r.isArchived);
        if (def) setSelectedResume(def);
        else if (all.length > 0) setSelectedResume(all.find((r) => !r.isArchived) || null);
      })
      .catch(() => {});
  }, []);

  /* Jobs to display */
  const displayJobs = includeGood ? [...strongJobs, ...goodJobs] : strongJobs;
  const matchCount  = includeGood ? strongJobs.length + goodJobs.length : strongJobs.length;

  /* Days estimate: 10 per day */
  const daysNeeded  = Math.ceil(matchCount / 10);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await onConfirm({
        resumeId:    selectedResume?._id,
        resumeLabel: selectedResume?.label || "Resume",
        includeGood,
      });
    } finally {
      setConfirming(false);
    }
  };

  /* Trap focus / Escape */
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.5)", backdropFilter: "blur(3px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl"
        style={{ maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close × */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-[#0F172A] text-white hover:opacity-80"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-6 pb-6 pt-8">
          {/* ── Big count header ─────────────────────────── */}
          <div className="text-center">
            <p className="text-[56px] font-extrabold leading-none tracking-tight text-[#0F172A]">
              {matchCount}
            </p>
            <p className="mt-1 text-[12px] font-bold uppercase tracking-[0.1em] text-[#16A34A]">
              {matchCount === 1 ? "Strong match ready" : "Matches ready to apply"}
            </p>
            <p className="mt-1.5 text-[13px] text-[#64748B]">
              {matchCount <= 10
                ? `then up to 10 a day, sent hourly`
                : `We send up to 10 a day — all ${matchCount} in about ${daysNeeded} day${daysNeeded > 1 ? "s" : ""}`}
              {" "}
              <button className="inline-flex items-center">
                <Info className="h-3.5 w-3.5 text-[#94A3B8]" />
              </button>
            </p>
          </div>

          {/* ── Three-pill control row ────────────────────── */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {/* Resume pill */}
            <button
              type="button"
              onClick={() => setShowCVPicker(true)}
              className="flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-3.5 py-2 text-[13px] font-medium text-[#0F172A] hover:border-[#94A3B8] transition-colors"
            >
              <FileText className="h-4 w-4 shrink-0 text-[#64748B]" />
              <span className="max-w-[140px] truncate">
                {selectedResume?.label || "Select resume"}
              </span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#94A3B8]" />
            </button>

            {/* Also include Good matches checkbox */}
            <button
              type="button"
              onClick={() => setIncludeGood((v) => !v)}
              className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors ${
                includeGood
                  ? "border-[#0F172A] bg-[#0F172A] text-white"
                  : "border-[#E2E8F0] bg-white text-[#0F172A] hover:border-[#94A3B8]"
              }`}
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                  includeGood
                    ? "border-white bg-white"
                    : "border-[#CBD5E1] bg-white"
                }`}
              >
                {includeGood && <Check className="h-3 w-3 text-[#0F172A]" />}
              </span>
              Also include Good matches
            </button>

            {/* Roles count pill */}
            <button
              type="button"
              onClick={() => setShowRoles((v) => !v)}
              className="flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-3.5 py-2 text-[13px] font-medium text-[#0F172A] hover:border-[#94A3B8] transition-colors"
            >
              {matchCount} {matchCount === 1 ? "role" : "roles"}
              {showRoles
                ? <ChevronUp className="h-3.5 w-3.5 shrink-0 text-[#94A3B8]" />
                : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#94A3B8]" />
              }
            </button>
          </div>

          {/* ── Jobs list ─────────────────────────────────── */}
          {showRoles && displayJobs.length > 0 && (
            <div
              className="mt-3 overflow-y-auto rounded-xl border border-[#E2E8F0]"
              style={{ maxHeight: 220 }}
            >
              {displayJobs.map((job, i) => {
                const score = job.ats?.overallScore ?? job.matchScore ?? null;
                const isGood = !strongJobs.includes(job);
                return (
                  <div
                    key={job._id || i}
                    className={`flex items-center justify-between px-4 py-3 text-[13px] ${
                      i > 0 ? "border-t border-[#F1F5F9]" : ""
                    }`}
                  >
                    <div className="flex min-w-0 items-baseline gap-2">
                      <span className="font-semibold text-[#0F172A] truncate">
                        {job.title}
                      </span>
                      <span className="shrink-0 text-[#94A3B8]">
                        {job.company?.name}
                      </span>
                    </div>
                    {score != null && (
                      <span
                        className="ml-3 shrink-0 font-semibold"
                        style={{ color: pctColor(score) }}
                      >
                        {score}%
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Info box ──────────────────────────────────── */}
          <div className="mt-4 rounded-xl bg-[#F8FAFC] p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-[#60A5FA]">
                <Clock className="h-3.5 w-3.5 text-[#3B82F6]" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[#0F172A]">
                  Checks for new matches hourly
                </p>
                <p className="mt-0.5 text-[12px] text-[#64748B]">
                  We look for new matching jobs every hour and apply for you automatically.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-[#60A5FA]">
                <Info className="h-3.5 w-3.5 text-[#3B82F6]" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[#0F172A]">
                  Some roles ask you a few questions
                </p>
                <p className="mt-0.5 text-[12px] text-[#64748B]">
                  We still apply for you — those go out shortly, and your tracker shows which
                  ones need your answers to be complete.
                </p>
              </div>
            </div>
          </div>

          {/* ── Action buttons ────────────────────────────── */}
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex h-12 flex-1 items-center justify-center rounded-full border border-[#E2E8F0] text-[14px] font-semibold text-[#0F172A] hover:bg-[#F8FAFC] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={confirming || !selectedResume}
              className="flex h-12 flex-1 items-center justify-center rounded-full bg-[#0F172A] text-[14px] font-semibold text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              {confirming ? "Turning on…" : "Turn on & apply"}
            </button>
          </div>
        </div>

        {/* SelectCV sub-modal */}
        {showCVPicker && (
          <SelectCVModal
            resumes={resumes}
            onSelect={(r) => { setSelectedResume(r); }}
            onClose={() => setShowCVPicker(false)}
          />
        )}
      </div>
    </div>,
    document.body
  );
}
