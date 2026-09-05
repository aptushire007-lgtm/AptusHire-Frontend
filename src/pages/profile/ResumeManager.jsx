import { useState, useEffect, useRef } from "react";
import {
  FileText,
  UploadCloud,
  Star,
  Archive,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Share2,
  Tag,
  Plus,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Download,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import api from "../../api/client";
import { accountAuthHeader } from "../../auth/accountAuth";
import { Card } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { PageHero } from "../../components/ui/Panels";

export default function ResumeManager() {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  // Review modal state after upload
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [pendingVersion, setPendingVersion] = useState(null);
  const [customLabel, setCustomLabel] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState([]);
  const [extractedSkills, setExtractedSkills] = useState([]);
  const [newSkillInput, setNewSkillInput] = useState("");
  const [replaceTarget, setReplaceTarget] = useState(null);

  const fileInputRef = useRef(null);

  const fetchVersions = async () => {
    try {
      setLoading(true);
      const res = await api.get("/candidate-dashboard/resumes?archived=true", {
        headers: accountAuthHeader(),
      });
      setVersions(res.data.versions || []);
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to load resume versions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVersions();
  }, []);

  const activeVersions = versions.filter((v) => !v.isArchived);
  const archivedVersions = versions.filter((v) => v.isArchived);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (activeVersions.length >= 5) {
      setError("Maximum limit of 5 active resume versions reached. Please archive an older version to upload a new one.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("File size exceeds 5MB limit. Please upload a smaller PDF or DOCX.");
      return;
    }

    const formData = new FormData();
    formData.append("resume", file);
    formData.append("label", file.name);

    try {
      setUploading(true);
      setError("");
      const res = await api.post("/candidate-dashboard/resumes/upload", formData, {
        headers: { "Content-Type": "multipart/form-data", ...accountAuthHeader() },
      });

      const uploaded = res.data;
      if (replaceTarget) {
        await api.patch(`/candidate-dashboard/resumes/${replaceTarget}/archive`, {}, { headers: accountAuthHeader() });
      }
      setPendingVersion(uploaded);
      setCustomLabel(uploaded.label || file.name);
      setTags(uploaded.tags || ["Targeted"]);
      setExtractedSkills(uploaded.parsedSnapshot?.skills || []);
      setReviewModalOpen(true);
      setReplaceTarget(null);
      await fetchVersions();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to upload and parse resume");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const startReplace = (id) => {
    setReplaceTarget(id);
    fileInputRef.current?.click();
  };

  const handleSaveReview = async () => {
    if (!pendingVersion) return;
    try {
      await api.patch(
        `/candidate-dashboard/resumes/${pendingVersion._id}`,
        {
          label: customLabel,
          tags,
          skills: extractedSkills,
        },
        { headers: accountAuthHeader() }
      );
      setReviewModalOpen(false);
      setSuccessMsg("Resume version configured successfully.");
      setTimeout(() => setSuccessMsg(""), 4000);
      await fetchVersions();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to save version settings");
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await api.patch(`/candidate-dashboard/resumes/${id}/default`, {}, { headers: accountAuthHeader() });
      setSuccessMsg("Default resume updated. Quick Apply will now use this version.");
      setTimeout(() => setSuccessMsg(""), 3000);
      await fetchVersions();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to set default resume");
    }
  };

  const handleArchive = async (id) => {
    try {
      await api.patch(`/candidate-dashboard/resumes/${id}/archive`, {}, { headers: accountAuthHeader() });
      setSuccessMsg("Resume version archived.");
      setTimeout(() => setSuccessMsg(""), 3000);
      await fetchVersions();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to archive resume version");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this resume version?")) return;
    try {
      await api.delete(`/candidate-dashboard/resumes/${id}`, { headers: accountAuthHeader() });
      setSuccessMsg("Resume version deleted.");
      setTimeout(() => setSuccessMsg(""), 3000);
      await fetchVersions();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to delete resume version");
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (t) => {
    setTags(tags.filter((item) => item !== t));
  };

  const addSkill = () => {
    if (newSkillInput.trim() && !extractedSkills.includes(newSkillInput.trim())) {
      setExtractedSkills([...extractedSkills, newSkillInput.trim()]);
      setNewSkillInput("");
    }
  };

  const removeSkill = (s) => {
    setExtractedSkills(extractedSkills.filter((item) => item !== s));
  };

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Resume Library"
        eyebrowIcon={FileText}
        title="Resume Version Manager"
        description="Maintain up to 5 targeted resume versions for different industries and roles. Quick Apply automatically selects your default version."
        points={[
          "Exactly 1 Default version for Quick Apply",
          "Parsed skill snapshots for instant match scores",
          "Immutable application submission audit lock",
        ]}
      />

      {error && (
        <div role="alert" className="flex items-center gap-2.5 rounded-2xl border-2 border-[#B42318] bg-[#FDECEC] p-4 text-sm font-semibold text-[#8F1D14]">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError("")} className="ml-auto text-xs underline">Dismiss</button>
        </div>
      )}

      {successMsg && (
        <div role="status" className="flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Upload Dropzone & Active Count Header */}
      <section className="rounded-3xl border border-[#E5EBE7] bg-white p-6 shadow-soft dark:border-[#E5EBE7] dark:bg-white">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">Active Versions</h2>
            <p className="text-xs text-slate-500">
              You are using <strong className="text-slate-900 dark:text-white">{activeVersions.length}</strong> of{" "}
              <strong className="text-slate-900 dark:text-white">5</strong> active version slots.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              id="resume-version-upload"
              disabled={uploading || activeVersions.length >= 5}
            />
            <label
              htmlFor="resume-version-upload"
              onClick={() => setReplaceTarget(null)}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold !text-white transition-all shadow-xs ${
                activeVersions.length >= 5
                  ? "cursor-not-allowed bg-slate-100 text-slate-400 dark:text-slate-500"
                  : "cursor-pointer bg-[#176B45] text-white hover:bg-[#176B45]-dark dark:bg-[#176B45] dark:text-white"
              }`}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Parsing Document…</span>
                </>
              ) : (
                <>
                  <UploadCloud className="h-4 w-4" />
                  <span>Upload New Version</span>
                </>
              )}
            </label>
          </div>
        </div>

        {/* Active Version Cards */}
        {loading ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-48 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : activeVersions.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-[#C7DDD1] bg-white p-8 text-center dark:border-[#C7DDD1] dark:bg-white">
            <FileText className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">No active resume versions yet</h3>
            <p className="mt-1 text-xs text-slate-500">
              Upload a targeted resume (e.g. Clinical, Engineering, Management) to unlock live match scoring.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {activeVersions.map((version) => (
              <ResumeVersionCard
                key={version._id}
                version={version}
                onSetDefault={() => handleSetDefault(version._id)}
                onArchive={() => handleArchive(version._id)}
                onDelete={() => handleDelete(version._id)}
                onReplace={() => startReplace(version._id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Archived Versions Section */}
      {archivedVersions.length > 0 && (
        <section className="rounded-3xl border border-[#E5EBE7] bg-white p-6 shadow-soft dark:border-[#E5EBE7] dark:bg-white">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="flex w-full items-center justify-between text-left text-sm font-bold text-slate-700"
          >
            <span>Archived Versions ({archivedVersions.length})</span>
            {showArchived ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showArchived && (
            <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
              {archivedVersions.map((av) => (
                <div key={av._id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{av.label}</p>
                      <p className="text-xs text-slate-500">Used in {av.applyCount || 0} applications</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => handleSetDefault(av._id)}>
                      Restore &amp; Set Default
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Post-Upload Review Modal */}
      {reviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#F8FAF9]-deep/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-[#E5EBE7] bg-white p-6 shadow-lift">
            <div className="flex items-center gap-2 text-[#176B45]">
              <Sparkles className="h-5 w-5" />
              <h3 className="font-display text-lg font-bold text-[#17221C]">Review Extracted Version</h3>
            </div>
            <p className="mt-1 text-xs text-[#64736A]">
              Aptus AI parsed your document with <strong>94% confidence</strong>. Verify labels and tags before saving.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#17221C]">Version Label</label>
                <input
                  type="text"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] px-3 py-2 text-sm text-[#17221C]"
                  placeholder="e.g. Clinical_Psychology_v2.pdf"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#17221C]">Target Role Tags</label>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                      {t}
                      <button onClick={() => removeTag(t)} className="text-slate-400 hover:text-slate-600">&times;</button>
                    </span>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                    placeholder="Add tag (e.g. Frontend, Clinical)"
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                  />
                  <Button size="sm" variant="secondary" onClick={addTag}>Add</Button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Extracted Skills ({extractedSkills.length})</label>
                <div className="mt-1 max-h-28 overflow-y-auto flex flex-wrap gap-1.5 rounded-xl border border-slate-100 bg-slate-50/50 p-2.5/50">
                  {extractedSkills.map((s) => (
                    <span key={s} className="inline-flex items-center gap-1 rounded-full bg-[#E8F2EC] px-2.5 py-0.5 text-xs font-semibold text-[#176B45]">
                      {s}
                      <button onClick={() => removeSkill(s)} className="text-slate-400 hover:text-slate-600">&times;</button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setReviewModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveReview}>Save Version</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ResumeVersionCard({ version, onSetDefault, onArchive, onDelete, onReplace }) {
  const [shareLogOpen, setShareLogOpen] = useState(false);
  const skills = version.parsedSnapshot?.skills || [];
  const shareLog = version.shareLog || [];

  return (
    <div className={`relative flex flex-col justify-between rounded-2xl border p-5 transition-all shadow-xs ${
      version.isDefault
        ? "border-[#C7DDD1] bg-white dark:border-[#C7DDD1] dark:bg-white"
        : "border-[#E5EBE7] bg-white dark:border-[#E5EBE7] dark:bg-white"
    }`}>
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h3 className="min-w-0 flex-1 font-display text-sm font-bold [overflow-wrap:anywhere] text-slate-900 dark:text-white">
                  {version.label}
                </h3>
                {version.isDefault && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#C1EBAD] px-2 py-0.5 text-[11px] font-extrabold text-[#176B45] shadow-2xs">
                    <Star className="h-3 w-3 fill-current" /> Default
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Uploaded {new Date(version.createdAt).toLocaleDateString()} · Used in {version.applyCount || 0} applications
              </p>
            </div>
          </div>
        </div>

        {/* Tags */}
        {version.tags?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {version.tags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                <Tag className="h-2.5 w-2.5" /> {tag}
              </span>
            ))}
          </div>
        )}

        {/* Extracted Skills Summary */}
        <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
          {skills.slice(0, 5).map((skill) => (
            <span key={skill} className="rounded-full bg-[#E8F2EC] px-2 py-0.5 text-[11px] font-semibold text-[#176B45]">
              {skill}
            </span>
          ))}
          {skills.length > 5 && (
            <span className="text-[11px] font-medium text-slate-400">+{skills.length - 5} more</span>
          )}
        </div>
      </div>

      <div className="mt-5 border-t border-slate-100 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {!version.isDefault ? (
            <button
              onClick={onSetDefault}
              className="tap-target inline-flex items-center gap-1 text-xs font-bold text-[#176B45] hover:text-[#176B45]"
            >
              <Star className="h-3.5 w-3.5" /> Set as Default
            </button>
          ) : (
            <span className="text-xs font-semibold text-slate-400">Active Default</span>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onReplace}
              title="Replace version"
              className="tap-target rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <UploadCloud className="h-4 w-4" />
            </button>
            {shareLog.length > 0 && (
              <button
                onClick={() => setShareLogOpen(!shareLogOpen)}
                className="tap-target inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                <Share2 className="h-3.5 w-3.5" /> Shared ({shareLog.length})
              </button>
            )}
            <button
              onClick={onArchive}
              title="Archive version"
              className="tap-target rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <Archive className="h-4 w-4" />
            </button>
            <button
              onClick={onDelete}
              title="Delete version"
              className="tap-target rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Share log list */}
        {shareLogOpen && shareLog.length > 0 && (
          <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/80 p-2.5 text-xs/60">
            <p className="font-bold text-slate-700">Share History (Audit Log)</p>
            <ul className="mt-1.5 space-y-1 text-slate-600">
              {shareLog.map((log, idx) => (
                <li key={idx} className="flex justify-between">
                  <span>{log.companyName} — {log.jobTitle}</span>
                  <span className="text-slate-400">{new Date(log.sharedAt).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
