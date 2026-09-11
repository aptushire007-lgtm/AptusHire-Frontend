import { useState } from "react";
import {
  FileCheck,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Clock,
  Globe,
  Shield,
  Loader2,
  Lock,
  ExternalLink,
} from "lucide-react";
import api from "../../../api/client";
import { accountAuthHeader } from "../../../auth/accountAuth";
import Button from "../../../components/ui/Button";

export default function DocumentsTab({ profile, documents = [], onRefresh }) {
  const [docType, setDocType] = useState("aadhaar");
  const [docNumber, setDocNumber] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleDocumentUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError("");
      const formData = new FormData();
      formData.append("document", file);
      formData.append("docType", docType);
      formData.append("docNumber", docNumber);

      await api.post("/candidate-dashboard/profile/documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data", ...accountAuthHeader() },
      });

      setSuccess("Document uploaded and verified via Aptus AI OCR.");
      setDocNumber("");
      setTimeout(() => setSuccess(""), 4000);
      onRefresh();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const ver = profile?.verification || {};
  const pref = profile?.preferences || {};

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">Documents &amp; Verification</h2>
        <p className="text-xs text-slate-500">
          Upload official government credentials and connect professional accounts to achieve verified candidate status.
        </p>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700 dark:border-red-900/50">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div role="status" className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* Upload Gov Document Box */}
      <section className="rounded-2xl border border-[#E2E8F0] bg-[#F4F6F9] p-5">
        <h3 className="font-display text-sm font-bold text-[#0F172A]">Upload Government ID</h3>
        <p className="mt-0.5 text-xs text-[#64748B]">
          AI OCR automatically verifies your name and date of birth in seconds. Your document number is always masked.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-bold text-[#0F172A]">Document Type</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs text-[#0F172A]"
            >
              <option value="aadhaar">Aadhaar Card (India)</option>
              <option value="passport">Passport</option>
              <option value="driving_license">Driver's License</option>
              <option value="pan">PAN Card</option>
              <option value="national_id">National ID Card</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0F172A]">Document Number (Optional)</label>
            <input
              type="text"
              value={docNumber}
              onChange={(e) => setDocNumber(e.target.value)}
              placeholder="e.g. 1234 5678 9012"
              className="mt-1 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs text-[#0F172A]"
            />
          </div>

          <div className="flex items-end">
            <input
              type="file"
              id="gov-doc-upload"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleDocumentUpload}
              className="hidden"
              disabled={uploading}
            />
            <label
              htmlFor="gov-doc-upload"
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#F97316] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#F97316]-dark dark:bg-[#F97316] dark:text-white"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>OCR Scanning…</span>
                </>
              ) : (
                <>
                  <UploadCloud className="h-4 w-4" />
                  <span>Upload &amp; Verify (20%)</span>
                </>
              )}
            </label>
          </div>
        </div>
      </section>

      {/* Verified Document List */}
      <section className="space-y-3">
        <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">Uploaded Documents ({documents.length})</h3>
        {documents.length === 0 ? (
          <p className="text-xs text-slate-400">No documents uploaded yet. Upload a document above to verify your profile.</p>
        ) : (
          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200/90 bg-white dark:divide-slate-800">
            {documents.map((doc) => (
              <div key={doc._id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                    <FileCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                        {doc.docType.replace("_", " ")}
                      </p>
                      <span className="rounded-full bg-[#FEF3E8] px-2 py-0.5 text-[10px] font-extrabold text-[#F97316]">
                        Verified via OCR
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Masked No: <span className="font-mono">{doc.maskedNumber}</span> · Uploaded on {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* LinkedIn Verification */}
      <section className="rounded-2xl border border-slate-200/90 bg-white p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0077B5]/10 text-[#0077B5]">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">LinkedIn Account</h3>
              <p className="text-xs text-slate-500">
                Connect your LinkedIn profile to auto-verify career milestones (10% strength).
              </p>
            </div>
          </div>

          <div>
            {ver.linkedinLinked ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#E8FBF5] px-3 py-1 text-xs font-bold text-[#0E9A74] dark:bg-[#062E26] dark:text-[#4DD6B0]">
                <CheckCircle2 className="h-3.5 w-3.5" /> Linked
              </span>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => alert("LinkedIn OAuth connected.")}>
                Connect LinkedIn
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Consent Center */}
      <section className="rounded-2xl border border-slate-200/90 bg-white p-5">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-[#F97316]" />
          <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">Consent Center &amp; Privacy Audit</h3>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          All consent actions are timestamped and cryptographically recorded for DPDP and GDPR compliance.
        </p>

        <div className="mt-4 space-y-3 divide-y divide-slate-100 text-xs dark:divide-slate-800">
          <div className="flex items-center justify-between pt-2">
            <div>
              <p className="font-bold text-slate-800">AI Screening &amp; Evidence Processing</p>
              <p className="text-slate-500">Allow Aptus AI algorithms to evaluate resume credentials against hiring rubrics.</p>
            </div>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">Active</span>
          </div>

          <div className="flex items-center justify-between pt-3">
            <div>
              <p className="font-bold text-slate-800">Candidate Data Retention</p>
              <p className="text-slate-500">Retain verified profile across multiple tenant applications.</p>
            </div>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">Active</span>
          </div>
        </div>
      </section>
    </div>
  );
}
