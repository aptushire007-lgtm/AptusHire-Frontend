/* ============================================================
   JobListings — dual-mode:
   • /?recommended=1  → Flowmingo-style split-panel layout
   • /                → Legacy full-page job browse layout

   All API calls, auth logic, save/unsave, search, filters and
   routing are preserved exactly. Only UI changes here.
   ============================================================ */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  MapPin, Search, X, Bookmark, Briefcase, DollarSign,
  ArrowRight, Clock, GraduationCap, SlidersHorizontal,
  CheckCircle2, Zap, Globe, ChevronDown, MoreHorizontal,
} from "lucide-react";
import AutoApplyModal from "../components/jobs/AutoApplyModal.jsx";
import api from "../api/client.js";
import { accountAuthHeader } from "../auth/accountAuth.js";
import { useAccountAuth } from "../auth/useAccountAuth.js";
import { Card, EmptyState, Skeleton } from "../components/ui/Card.jsx";
import { PageHero, TokenList, MetaItem } from "../components/ui/Panels.jsx";

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers (no state, no side-effects)
// ─────────────────────────────────────────────────────────────────────────────
function companyInitials(name) {
  return String(name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function experienceLabel(years) {
  if (years == null) return null;
  return years > 0 ? `${years}+ yrs experience` : "No minimum experience";
}

function fuzzyScore(value, term) {
  const text = String(value || "").toLowerCase();
  const needle = term.toLowerCase();
  const exactAt = text.indexOf(needle);
  if (exactAt >= 0) return 100 - Math.min(exactAt, 40);
  let at = 0, gaps = 0;
  for (const char of needle) {
    const next = text.indexOf(char, at);
    if (next < 0) return 0;
    gaps += next - at;
    at = next + 1;
  }
  return Math.max(1, 45 - gaps);
}

function jobSearchScore(job, query) {
  const fields = [
    job.title, job.company?.name, job.department, job.location,
    job.description, job.requiredEducation, ...(job.requiredSkills || []),
  ];
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .reduce((total, term) => {
      if (total < 0) return total;
      const best = Math.max(...fields.map((f) => fuzzyScore(f, term)));
      return best ? total + best : -1;
    }, 0);
}

/** Derive match strength from recommendation rank */
function getMatchLabel(job, recommendedOrder) {
  const pos = recommendedOrder.indexOf(String(job._id));
  const score = job.ats?.overallScore ?? job.matchScore ?? null;
  if (pos === -1) return null;
  if (pos < 5 || (score != null && score >= 80)) return "Strong match";
  if (pos < 15 || (score != null && score >= 60)) return "Good match";
  return "Match";
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared sub-components
// ─────────────────────────────────────────────────────────────────────────────
function CompanyLogo({ company, size = 44 }) {
  const [failed, setFailed] = useState(false);
  const logo = company?.logoPath;
  return (
    <div
      style={{ width: size, height: size, minWidth: size }}
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#E2E8F0] bg-white"
    >
      {logo && !failed ? (
        <img
          src={logo}
          alt={company?.name || ""}
          className="h-full w-full object-contain p-1"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-[#FEF3E8] text-[12px] font-bold text-[#F97316]">
          {companyInitials(company?.name)}
        </span>
      )}
    </div>
  );
}

function MatchBadge({ label }) {
  if (!label) return null;
  const isStrong = label === "Strong match";
  const isGood   = label === "Good match";
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${
        isStrong
          ? "bg-[#DCFCE7] text-[#166534]"
          : isGood
          ? "bg-[#FEF9C3] text-[#854D0E]"
          : "bg-[#F1F5F9] text-[#475569]"
      }`}
    >
      {label}
      <ChevronDown className="h-3 w-3 opacity-50" aria-hidden />
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LEFT PANEL — scrollable job list card
// ─────────────────────────────────────────────────────────────────────────────
function ListCard({ job, active, onClick, saved, onToggleSave, saving, matchLabel: mLabel }) {
  const salary = job.salary || job.salaryRange || job.compensation;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative w-full cursor-pointer border-b border-[#F0F2F4] px-4 py-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#F97316] ${
        active ? "bg-[#F4F6F9]" : "hover:bg-[#F8F9FB]"
      }`}
    >
      {/* Save (shows on hover, out of the way of title/badges) */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggleSave(job); }}
        disabled={saving}
        aria-label={saved ? "Unsave" : "Save"}
        className={`absolute right-3 top-3 z-10 p-0.5 text-[#94A3B8] transition-colors hover:text-[#F97316] focus-visible:outline-none ${
          saved ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
        }`}
      >
        <Bookmark
          className={`h-3.5 w-3.5 ${saved ? "fill-[#F97316] text-[#F97316]" : ""}`}
          aria-hidden
        />
      </button>

      <div className="flex items-start gap-3">
        <CompanyLogo company={job.company} size={40} />

        <div className="min-w-0 flex-1">
          {/* Title + status column */}
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-2 text-[13px] font-semibold leading-[1.35] text-[#0F172A]">
              {job.title}
            </p>
            <div className="flex shrink-0 flex-col items-end gap-1 pl-1">
              {job.alreadyApplied && (
                <span className="text-[11px] font-semibold text-[#2563EB]">Applied</span>
              )}
              {mLabel && <MatchBadge label={mLabel} />}
            </div>
          </div>

          {/* Company */}
          <p className="mt-0.5 text-[12px] text-[#64748B]">{job.company?.name}</p>

          {/* Location + Salary */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            {job.location && (
              <span className="inline-flex items-center gap-1 text-[11px] text-[#94A3B8]">
                <MapPin className="h-3 w-3 shrink-0" aria-hidden /> {job.location}
              </span>
            )}
            {salary && (
              <span className="inline-flex items-center gap-1 text-[11px] text-[#94A3B8]">
                <DollarSign className="h-3 w-3 shrink-0" aria-hidden /> {salary}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RIGHT PANEL — job detail
// ─────────────────────────────────────────────────────────────────────────────
function JobDetailPanel({ job, navigate, onRemove }) {
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the menu when a different job is selected
  useEffect(() => { setMenuOpen(false); }, [job?._id]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function handleOutside(e) {
      if (!e.target.closest("[data-job-menu]")) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [menuOpen]);

  if (!job) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-12 text-center">
        <Briefcase className="h-12 w-12 text-[#E2E8F0]" aria-hidden />
        <p className="text-[15px] font-semibold text-[#0F172A]">Select a job</p>
        <p className="text-[13px] text-[#94A3B8]">
          Pick a role from the list to see full details here.
        </p>
      </div>
    );
  }

  const salary    = job.salary || job.salaryRange || job.compensation;
  const jobType   = job.jobType || job.employmentType;
  const workplace = job.workplaceType || job.workPlace;
  const seniority = job.seniorityLevel || job.experienceLevel;
  const applyTo   = `/jobs/${job.slug || job._id}/apply`;
  const website   = job.company?.website;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Scrollable body ── */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="p-6 pb-2">
          {/* Title + 3-dot */}
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-[22px] font-bold leading-snug text-[#0F172A]">
              {job.title}
            </h1>
            {/* 3-dot menu */}
            <div className="relative mt-1 shrink-0" data-job-menu>
              <button
                type="button"
                aria-label="More options"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                onClick={() => setMenuOpen((v) => !v)}
                className="rounded-lg p-1 text-[#94A3B8] hover:bg-[#F4F6F9] hover:text-[#0F172A]"
              >
                <MoreHorizontal className="h-5 w-5" aria-hidden />
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-1 min-w-[190px] overflow-hidden rounded-xl border border-[#F1F5F9] bg-white shadow-lg"
                >
                  <button
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onRemove?.(job._id);
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] font-medium text-[#EF4444] hover:bg-[#FFF5F5]"
                  >
                    {/* Trash icon */}
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4h6v2" />
                    </svg>
                    Remove — not suitable
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Company info */}
          <div className="mt-4 flex items-center gap-3">
            <CompanyLogo company={job.company} size={52} />
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-[#0F172A]">
                {job.company?.name}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-3">
                {website && (
                  <a
                    href={website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-[12px] text-[#64748B] hover:text-[#F97316]"
                  >
                    <Globe className="h-3.5 w-3.5" aria-hidden />
                    {website.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}
                  </a>
                )}
                {job.company?.linkedin && (
                  <a
                    href={job.company.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-[#BFDBFE] bg-[#EFF6FF] px-2.5 py-0.5 text-[11px] font-semibold text-[#1D4ED8]"
                  >
                    {/* LinkedIn "in" icon */}
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                    LinkedIn
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="mt-5 h-px bg-[#F0F2F4]" />

          {/* Description */}
          {job.description && (
            <div className="mt-5 text-[14px] leading-7 text-[#3D4A45] whitespace-pre-line">
              {job.description}
            </div>
          )}

          {/* Requirements */}
          {job.requirements && (
            <div className="mt-5">
              <h2 className="text-[15px] font-bold text-[#0F172A]">Requirements</h2>
              <div className="mt-2 text-[14px] leading-7 text-[#3D4A45] whitespace-pre-line">
                {job.requirements}
              </div>
            </div>
          )}

          {/* Required Skills */}
          {job.requiredSkills?.length > 0 && (
            <div className="mt-5">
              <h2 className="text-[15px] font-bold text-[#0F172A]">Required Skills</h2>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {job.requiredSkills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full border border-[#E2E8F0] bg-white px-3 py-1 text-[12px] font-medium text-[#F97316]"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Meta grid — matches Flowmingo 4-column row */}
          <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-[#F0F2F4] pt-5 sm:grid-cols-4">
            {[
              { label: "Salary",           value: salary },
              { label: "Workplace Type",   value: workplace },
              { label: "Employment type",  value: jobType },
              { label: "Seniority Level",  value: seniority },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[11px] font-medium text-[#94A3B8]">{label}</p>
                <p className="mt-1 inline-flex rounded-lg bg-[#EFF6FF] px-2.5 py-1 text-[13px] font-semibold text-[#2563EB]">
                  {value || "—"}
                </p>
              </div>
            ))}
          </div>

          {/* Bottom padding so content doesn't hide behind sticky button */}
          <div className="h-6" />
        </div>
      </div>

      {/* ── Sticky Apply Now ── */}
      <div className="shrink-0 border-t border-[#F0F2F4] bg-white px-6 py-4">
        {job.alreadyApplied ? (
          <button
            type="button"
            onClick={() => navigate("/applied-jobs")}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#DBEAFE] text-[14px] font-semibold text-[#2563EB] transition-opacity hover:opacity-80"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            Applied
          </button>
        ) : (
          <button
            type="button"
            onClick={() => navigate(applyTo)}
            className="flex h-12 w-full items-center justify-center rounded-full bg-[#0F172A] text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            Apply Now
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FILTERS PANEL — overlays the left list column
// All filter options are derived dynamically from actual job data.
// A location/company only appears if at least one job has that value.
// ─────────────────────────────────────────────────────────────────────────────
function FiltersPanel({ filters, onApply, onClose, totalJobs, jobs }) {
  const [local, setLocal] = useState({
    matchFilter:     filters.matchFilter     || "",
    minSalary:       filters.minSalary       || "Any",
    location:        filters.location        || "",
    workArrangement: filters.workArrangement || "",
    employmentType:  filters.employmentType  || "",
    company:         filters.company         || "",
  });

  const SALARY_OPTS = ["Any", "$300+", "$500+", "$1k+", "$2k+", "$4k+"];
  const MATCH_OPTS  = [
    "Strong matches only",
    "Hide jobs I applied to",
    "No screening questions",
  ];

  // ── Static option lists (always shown, Flowmingo-matching labels) ──
  // Counts are computed from live job data where the field exists;
  // show 0 gracefully when the field is not yet populated.
  const WORK_ARRANGEMENT_OPTS = ["On-site", "Remote", "Hybrid"];
  const EMPLOYMENT_TYPE_OPTS  = ["Full-time", "Contract", "Part-time", "Internship", "Temporary", "Volunteer"];

  // ── Dynamic counts from live job data ─────────────────────────────
  function buildCounts(extract) {
    const map = {};
    for (const j of jobs) {
      const val = extract(j);
      if (val && val.trim()) map[val.trim()] = (map[val.trim()] || 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }

  // Case-insensitive count lookup helper
  function countFor(map, label) {
    const key = Object.keys(map).find((k) => k.toLowerCase() === label.toLowerCase());
    return key ? map[key] : 0;
  }

  const locationOptions = useMemo(() => buildCounts((j) => j.location), [jobs]); // eslint-disable-line
  const companyOptions  = useMemo(() => buildCounts((j) => j.company?.name), [jobs]); // eslint-disable-line

  // Build count maps for work arrangement and employment type
  const workArrangementCounts = useMemo(() => {
    const map = {};
    for (const j of jobs) {
      const val = j.workplaceType || j.workPlace || j.workArrangement;
      if (val) map[val.trim()] = (map[val.trim()] || 0) + 1;
    }
    return map;
  }, [jobs]);

  const employmentTypeCounts = useMemo(() => {
    const map = {};
    for (const j of jobs) {
      const val = j.jobType || j.employmentType || j.contractType;
      if (val) map[val.trim()] = (map[val.trim()] || 0) + 1;
    }
    return map;
  }, [jobs]);

  function toggle(key, val) {
    setLocal((p) => ({ ...p, [key]: p[key] === val ? "" : val }));
  }

  const hasAnyLocal =
    local.matchFilter || local.minSalary !== "Any" ||
    local.location || local.workArrangement || local.employmentType || local.company;

  // ── Reusable checkbox row ──────────────────────────────────────────
  function CheckRow({ stateKey, value, label, count }) {
    const checked = local[stateKey] === value;
    return (
      <label className="flex cursor-pointer items-center justify-between gap-2 py-1 group">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded border transition-colors ${
              checked ? "border-[#F97316] bg-[#F97316]" : "border-[#C7D4CC] group-hover:border-[#F97316]"
            }`}
            aria-hidden
          >
            {checked && (
              <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <input
            type="checkbox"
            className="sr-only"
            checked={checked}
            onChange={() => toggle(stateKey, value)}
          />
          <span className={`truncate text-[13px] ${checked ? "font-semibold text-[#F97316]" : "text-[#0F172A]"}`}>
            {label}
          </span>
        </div>
        {count != null && (
          <span className="shrink-0 text-[12px] text-[#94A3B8]">{count}</span>
        )}
      </label>
    );
  }

  // ── Section header ─────────────────────────────────────────────────
  function SectionHead({ label }) {
    return (
      <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.09em] text-[#94A3B8]">
        {label}
      </p>
    );
  }

  return (
    <div className="absolute inset-0 z-30 flex flex-col overflow-hidden bg-white shadow-[4px_0_24px_rgba(0,0,0,0.10)]">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-[#F0F2F4] px-5 py-3.5">
        <p className="text-[13px] font-bold text-[#0F172A]">Filters</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close filters"
          className="rounded-lg p-1 text-[#94A3B8] hover:bg-[#F4F6F9] hover:text-[#0F172A]"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">

        {/* MATCH */}
        <div>
          <SectionHead label="Match" />
          <div className="space-y-0.5">
            {MATCH_OPTS.map((opt) => (
              <CheckRow key={opt} stateKey="matchFilter" value={opt} label={opt} />
            ))}
          </div>
        </div>

        {/* MINIMUM SALARY */}
        <div>
          <SectionHead label="Minimum Salary" />
          <div className="flex flex-wrap gap-2">
            {SALARY_OPTS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setLocal((p) => ({ ...p, minSalary: opt }))}
                className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors ${
                  (local.minSalary || "Any") === opt
                    ? "bg-[#0F172A] text-white"
                    : "border border-[#E2E8F0] text-[#64748B] hover:border-[#0F172A] hover:text-[#0F172A]"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-[#94A3B8]">
            Approx. USD per month. Jobs with no salary listed are hidden.
          </p>
        </div>

        {/* LOCATION — only shown when at least 1 job has a location */}
        {locationOptions.length > 0 && (
          <div>
            <SectionHead label="Location" />
            <div className="space-y-0.5">
              {locationOptions.map(([loc, count]) => (
                <CheckRow
                  key={loc}
                  stateKey="location"
                  value={loc}
                  label={loc}
                  count={count}
                />
              ))}
            </div>
          </div>
        )}

        {/* WORK ARRANGEMENT — always shown, static options, dynamic counts */}
        <div>
          <SectionHead label="Work arrangement" />
          <div className="space-y-0.5">
            {WORK_ARRANGEMENT_OPTS.map((val) => {
              const cnt = countFor(workArrangementCounts, val);
              return (
                <CheckRow
                  key={val}
                  stateKey="workArrangement"
                  value={val}
                  label={val}
                  count={cnt > 0 ? cnt : undefined}
                />
              );
            })}
          </div>
        </div>

        {/* EMPLOYMENT TYPE — always shown, static options, dynamic counts */}
        <div>
          <SectionHead label="Employment type" />
          <div className="space-y-0.5">
            {EMPLOYMENT_TYPE_OPTS.map((val) => {
              const cnt = countFor(employmentTypeCounts, val);
              return (
                <CheckRow
                  key={val}
                  stateKey="employmentType"
                  value={val}
                  label={val}
                  count={cnt > 0 ? cnt : undefined}
                />
              );
            })}
          </div>
        </div>

        {/* COMPANY */}
        {companyOptions.length > 0 && (
          <div>
            <SectionHead label="Company" />
            <div className="space-y-0.5">
              {companyOptions.map(([name, count]) => (
                <CheckRow
                  key={name}
                  stateKey="company"
                  value={name}
                  label={name}
                  count={count}
                />
              ))}
            </div>
          </div>
        )}

        {/* Clear all */}
        {hasAnyLocal && (
          <button
            type="button"
            onClick={() =>
              setLocal({
                matchFilter: "", minSalary: "Any",
                location: "", workArrangement: "", employmentType: "", company: "",
              })
            }
            className="text-[12px] font-semibold text-[#F97316] hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Apply button */}
      <div className="shrink-0 border-t border-[#F0F2F4] p-4">
        <button
          type="button"
          onClick={() => { onApply(local); onClose(); }}
          className="flex h-11 w-full items-center justify-center rounded-full bg-[#0F172A] text-[13px] font-semibold text-white hover:opacity-90"
        >
          Show {totalJobs} jobs
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT EXPORT — main component
// ─────────────────────────────────────────────────────────────────────────────
export default function JobListings() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const recommendationsOnly = searchParams.get("recommended") === "1";
  const { isAuthenticated } = useAccountAuth();

  // ── Data state (all API calls preserved) ──
  const [jobs,             setJobs]             = useState([]);
  const [savedIds,         setSavedIds]         = useState(new Set());
  const [savingId,         setSavingId]         = useState(null);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState("");
  const [recommendedOrder, setRecommendedOrder] = useState([]);

  // ── UI state ──
  const [searchInput, setSearchInput] = useState("");
  const [query,       setQuery]       = useState("");
  const [filters,     setFilters]     = useState({
    location: "", matchFilter: "", minSalary: "Any",
    experience: "", skills: "", company: "", department: "",
    workArrangement: "", employmentType: "",
  });
  const [tab,          setTab]         = useState("top");   // "top" | "all"
  const [showFilters,  setShowFilters]  = useState(false);
  const [showSearch,   setShowSearch]   = useState(false);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [autoApplyOpen, setAutoApplyOpen] = useState(false);
  // tracks whether auto-apply is active + which jobs it covers
  const [autoApplyState, setAutoApplyState] = useState(null);
  // null = off  |  { includeGood, resumeLabel, jobIds: Set } = on

  // ── Fetch jobs + dashboard (API calls unchanged) ──
  useEffect(() => {
    Promise.all([
      api.get("/jobs/published"),
      isAuthenticated
        ? api.get("/candidate-dashboard", { headers: accountAuthHeader() }).catch(() => null)
        : Promise.resolve(null),
    ])
      .then(([jobsRes, dashRes]) => {
        if (!Array.isArray(jobsRes.data)) throw new Error("unexpected response");
        setJobs(jobsRes.data);
        if (dashRes) {
          setSavedIds(new Set((dashRes.data.savedJobs || []).map((j) => String(j._id || j))));
          setRecommendedOrder((dashRes.data.recommendedJobs || []).map((j) => String(j._id)));
        }
      })
      .catch(() => setError("We couldn't load jobs right now. Please try again."))
      .finally(() => setLoading(false));
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Filtered + sorted job list ──
  const filteredJobs = useMemo(() => {
    let list = [...jobs];

    // Recommended tab filter
    if (tab === "top" && recommendedOrder.length > 0) {
      list = list.filter((j) => recommendedOrder.includes(String(j._id)));
    }
    if (recommendationsOnly) {
      list = list.filter((j) => recommendedOrder.includes(String(j._id)));
    }

    // Location filter
    if (filters.location) list = list.filter((j) => j.location === filters.location);

    // Work arrangement filter (on-site / remote / hybrid)
    if (filters.workArrangement) {
      const wa = filters.workArrangement.toLowerCase();
      list = list.filter((j) => (j.workplaceType || j.workPlace || "").toLowerCase() === wa);
    }

    // Employment type filter
    if (filters.employmentType) {
      const et = filters.employmentType.toLowerCase();
      list = list.filter((j) => (j.jobType || j.employmentType || "").toLowerCase() === et);
    }

    // Company filter
    if (filters.company) list = list.filter((j) => j.company?.name === filters.company);

    // Text search
    if (query.trim()) {
      list = list
        .map((j) => ({ job: j, score: jobSearchScore(j, query) }))
        .filter(({ score }) => score >= 0)
        .sort((a, b) => b.score - a.score)
        .map(({ job }) => job);
    } else if (tab === "top" || recommendationsOnly) {
      list.sort(
        (a, b) =>
          recommendedOrder.indexOf(String(a._id)) -
          recommendedOrder.indexOf(String(b._id)),
      );
    }

    return list;
  }, [jobs, tab, recommendationsOnly, recommendedOrder, filters, query]);

  // Auto-select first job when list loads
  useEffect(() => {
    if (!loading && filteredJobs.length > 0 && !selectedJobId) {
      setSelectedJobId(String(filteredJobs[0]._id));
    }
  }, [loading, filteredJobs, selectedJobId]);

  const topMatches = useMemo(
    () =>
      filteredJobs.filter((j) => {
        const pos = recommendedOrder.indexOf(String(j._id));
        return pos !== -1 && pos < 10;
      }),
    [filteredJobs, recommendedOrder],
  );

  const moreJobs = useMemo(
    () =>
      filteredJobs.filter((j) => {
        const pos = recommendedOrder.indexOf(String(j._id));
        return pos === -1 || pos >= 10;
      }),
    [filteredJobs, recommendedOrder],
  );

  const selectedJob = useMemo(
    () => jobs.find((j) => String(j._id) === selectedJobId) || null,
    [jobs, selectedJobId],
  );

  const newCount = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 3600 * 1000;
    return jobs.filter((j) => new Date(j.createdAt || 0).getTime() > cutoff).length;
  }, [jobs]);

  // ── Strong / Good match splits for AutoApplyModal ──
  const strongJobs = useMemo(() =>
    filteredJobs.filter((j) => {
      const pos   = recommendedOrder.indexOf(String(j._id));
      const score = j.ats?.overallScore ?? j.matchScore ?? null;
      return pos !== -1 && (pos < 5 || (score != null && score >= 80));
    }),
    [filteredJobs, recommendedOrder],
  );

  const goodJobs = useMemo(() =>
    filteredJobs.filter((j) => {
      const pos   = recommendedOrder.indexOf(String(j._id));
      const score = j.ats?.overallScore ?? j.matchScore ?? null;
      if (pos === -1) return false;
      const isStrong = pos < 5 || (score != null && score >= 80);
      const isGood   = !isStrong && (pos < 15 || (score != null && score >= 60));
      return isGood;
    }),
    [filteredJobs, recommendedOrder],
  );

  // ── Auto-apply confirm handler ──
  async function handleAutoApply({ resumeId, resumeLabel, includeGood }) {
    // Build the set of job IDs that are being auto-applied to
    const chosenJobs = includeGood ? [...strongJobs, ...goodJobs] : strongJobs;
    const jobIds = new Set(chosenJobs.map((j) => String(j._id)));

    // Store active state — this drives the filtered view below
    setAutoApplyState({ includeGood, resumeLabel: resumeLabel || "Resume", jobIds });
    setAutoApplyOpen(false);

    // Backend call (fire-and-forget; route doesn't exist yet but wire is ready)
    try {
      await api.post(
        "/candidate-dashboard/auto-apply",
        { resumeId, includeGood, jobIds: [...jobIds] },
        { headers: accountAuthHeader() },
      ).catch(() => {}); // swallow until backend implements it
    } catch (_) {}
  }

  // ── Save / unsave (API call unchanged) ──
  async function toggleSave(job) {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: "/" } });
      return;
    }
    const id = String(job._id);
    setSavingId(id);
    try {
      const res = await api.post(
        `/candidate-dashboard/saved-jobs/${job._id}`,
        {},
        { headers: accountAuthHeader() },
      );
      setSavedIds((prev) => {
        const next = new Set(prev);
        res.data.saved ? next.add(id) : next.delete(id);
        return next;
      });
    } catch (err) {
      setError(err?.response?.data?.error || "Could not update saved jobs.");
    } finally {
      setSavingId(null);
    }
  }

  // ── Remove from recommendations ("not suitable") ──
  async function handleRemoveRecommendation(jobId) {
    const id = String(jobId);
    // Optimistically remove from local state so the card disappears immediately
    setRecommendedOrder((prev) => prev.filter((x) => x !== id));
    // Move selection to next job (if available)
    setSelectedJobId((prev) => {
      if (prev !== id) return prev;
      const remaining = filteredJobs.filter((j) => String(j._id) !== id);
      return remaining.length > 0 ? String(remaining[0]._id) : null;
    });
    // Persist to backend (fire-and-forget; silently ignore failures)
    try {
      await api.post(
        `/candidate-dashboard/recommended-jobs/${jobId}/dismiss`,
        {},
        { headers: accountAuthHeader() },
      );
    } catch (_) {
      // non-critical — local state is already updated
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // NON-RECOMMENDED: legacy full-page layout (unchanged functionality)
  // ═══════════════════════════════════════════════════════════════
  if (!recommendationsOnly) {
    return (
      <LegacyFullPageLayout
        jobs={jobs}
        filteredJobs={filteredJobs}
        savedIds={savedIds}
        savingId={savingId}
        loading={loading}
        error={error}
        filters={filters}
        setFilters={setFilters}
        query={query}
        setQuery={setQuery}
        searchInput={searchInput}
        setSearchInput={setSearchInput}
        toggleSave={toggleSave}
        navigate={navigate}
      />
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // RECOMMENDED JOBS: Flowmingo-exact split-panel layout
  // ═══════════════════════════════════════════════════════════════
  return (
    /*
      Escape the AppShell's px-5 py-6 padding so we can go edge-to-edge.
      h-[calc(100vh-68px)] matches the sticky header height (68px).
    */
    <div className="-mx-5 -my-6 flex h-[calc(100vh-68px)] flex-col overflow-hidden sm:-mx-8 sm:-my-8">

      {/* ── Page header ───────────────────────────────────────── */}
      <div className="shrink-0 border-b border-[#EAEEF0] bg-white px-5 pb-4 pt-5 sm:px-6">
        {/* Title + count badges */}
        <div className="flex flex-wrap items-baseline gap-2.5">
          <h1 className="text-[26px] font-extrabold tracking-tight text-[#0F172A]">Recommended Jobs</h1>
          {!loading && (
            <>
              <span className="rounded-full bg-[#EFF6FF] px-2.5 py-0.5 text-[12px] font-semibold text-[#2563EB]">
                {filteredJobs.length} Jobs
              </span>
              {newCount > 0 && (
                <span className="rounded-full bg-[#DCFCE7] px-2.5 py-0.5 text-[12px] font-semibold text-[#16A34A]">
                  +{newCount} New
                </span>
              )}
            </>
          )}
        </div>
        <p className="mt-1 text-[13px] leading-5 text-[#64748B]">
          Job opportunities matched to your profile. The door is open — apply with your CV.
          New matches arrive every hour.
        </p>

        {/* Auto-apply banner — shows two states: inactive / active */}
        {!autoApplyState ? (
          /* ── INACTIVE: invite to turn on ── */
          <div className="mt-3.5 flex items-center justify-between gap-4 rounded-xl border border-[#DBEAFE] bg-gradient-to-r from-[#EFF6FF] to-[#F8FBFF] px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-[0_1px_3px_rgba(37,99,235,0.25)]">
                <Zap className="h-4 w-4 fill-[#2563EB] text-[#2563EB]" aria-hidden />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[#0F172A]">
                  Auto-apply to my strong matches
                </p>
                <p className="text-[12px] text-[#64748B]">
                  We send your CV the moment a Strong match appears — no more checking back.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAutoApplyOpen(true)}
              className="shrink-0 rounded-full bg-[#0F172A] px-4 py-2 text-[12px] font-semibold text-white hover:opacity-90"
            >
              Turn it on
            </button>
          </div>
        ) : (
          /* ── ACTIVE: show what's running + allow turn-off ── */
          <div className="mt-3.5 flex items-center justify-between gap-4 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-[0_1px_3px_rgba(22,163,74,0.20)]">
                <Zap className="h-4 w-4 fill-[#16A34A] text-[#16A34A]" aria-hidden />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[#0F172A]">
                  Auto-apply is on
                  <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-[#16A34A] px-2 py-0.5 text-[10px] font-bold text-white">
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                    Active
                  </span>
                </p>
                <p className="text-[12px] text-[#64748B]">
                  Using <span className="font-semibold text-[#0F172A]">{autoApplyState.resumeLabel}</span>
                  {" · "}
                  {autoApplyState.jobIds.size} role{autoApplyState.jobIds.size !== 1 ? "s" : ""}
                  {autoApplyState.includeGood ? " (strong + good matches)" : " (strong matches only)"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAutoApplyState(null)}
              className="shrink-0 rounded-full border border-[#16A34A] px-4 py-2 text-[12px] font-semibold text-[#16A34A] hover:bg-[#DCFCE7] transition-colors"
            >
              Turn off
            </button>
          </div>
        )}
      </div>

      {/* ── Two-column body ───────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">

        {/* ── LEFT: job list ──────────────────────────────────── */}
        <div
          className={`relative flex shrink-0 flex-col border-r border-[#EAEEF0] bg-white ${
            selectedJobId ? "w-full md:w-[360px] lg:w-[400px]" : "w-full"
          }`}
        >
          {/* Filter / tab bar */}
          <div className="shrink-0 border-b border-[#EAEEF0] px-3 py-2.5">
            <div className="flex items-center gap-2">
              {/* Tab segmented control */}
              <div className="flex flex-1 gap-1 overflow-x-auto rounded-full bg-[#F1F5F9] p-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setTab("top")}
                  className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold whitespace-nowrap transition-colors ${
                    tab === "top"
                      ? "bg-white text-[#0F172A] shadow-[0_1px_3px_rgba(15,23,42,0.12)]"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  Top matches{topMatches.length > 0 ? ` (${topMatches.length})` : ""}
                </button>
                <a
                  href="/jobs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full px-3.5 py-1.5 text-[12px] font-semibold whitespace-nowrap text-[#64748B] transition-colors hover:text-[#0F172A]"
                >
                  All jobs
                </a>
              </div>

              {/* Search icon button */}
              <button
                type="button"
                onClick={() => setShowSearch((v) => !v)}
                aria-label={showSearch ? "Close search" : "Search jobs"}
                className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
                  showSearch
                    ? "border-[#F97316] bg-[#FEF3E8] text-[#F97316]"
                    : "border-[#E2E8F0] text-[#64748B] hover:border-[#F97316] hover:text-[#F97316]"
                }`}
              >
                <Search className="h-3.5 w-3.5" aria-hidden />
              </button>

              {/* Filters button */}
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                className={`flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold transition-colors ${
                  showFilters
                    ? "border-[#F97316] bg-[#FEF3E8] text-[#F97316]"
                    : "border-[#E2E8F0] text-[#64748B] hover:border-[#F97316] hover:text-[#F97316]"
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
                Filters
              </button>
            </div>

            {/* Expandable search box */}
            {showSearch && (
              <div className="relative mt-2">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]"
                  aria-hidden
                />
                <input
                  type="search"
                  value={searchInput}
                  autoFocus
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    setQuery(e.target.value.trim());
                  }}
                  placeholder="Search job title or company name"
                  className="h-10 w-full rounded-xl border border-[#E2E8F0] bg-[#F4F6F9] pl-9 pr-9 text-[13px] text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#F97316] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F97316]/12"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => { setSearchInput(""); setQuery(""); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A]"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Job list body */}
          {loading ? (
            <div className="flex-1 overflow-y-auto">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex gap-3 border-b border-[#F0F2F4] px-4 py-4">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-5 text-center text-[13px] font-medium text-[#DC2626]">{error}</div>
          ) : filteredJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 p-10 text-center">
              <Briefcase className="h-8 w-8 text-[#E2E8F0]" aria-hidden />
              <p className="text-[13px] font-semibold text-[#0F172A]">No matching jobs</p>
              <p className="text-[12px] text-[#94A3B8]">
                Try different filters or check back later.
              </p>
            </div>
          ) : autoApplyState ? (
            /* ── AUTO-APPLY ACTIVE: show only the selected jobs ── */
            <div className="min-h-0 flex-1 overflow-y-auto">
              {/* Active filter chip strip */}
              <div className="flex items-center gap-2 border-b border-[#EAEEF0] bg-[#F0FDF4] px-4 py-2">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#16A34A]">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                </span>
                <p className="min-w-0 flex-1 text-[11px] font-semibold text-[#16A34A]">
                  Showing {autoApplyState.jobIds.size} auto-applied role{autoApplyState.jobIds.size !== 1 ? "s" : ""}
                  {autoApplyState.includeGood ? " (strong + good)" : " (strong only)"}
                </p>
                <button
                  type="button"
                  onClick={() => setAutoApplyState(null)}
                  className="shrink-0 text-[11px] font-semibold text-[#64748B] hover:text-[#0F172A]"
                >
                  Clear
                </button>
              </div>

              {/* Jobs in the auto-apply set */}
              {filteredJobs
                .filter((j) => autoApplyState.jobIds.has(String(j._id)))
                .map((job) => (
                  <ListCard
                    key={job._id}
                    job={job}
                    active={String(job._id) === selectedJobId}
                    onClick={() => setSelectedJobId(String(job._id))}
                    saved={savedIds.has(String(job._id))}
                    onToggleSave={toggleSave}
                    saving={savingId === String(job._id)}
                    matchLabel={getMatchLabel(job, recommendedOrder)}
                  />
                ))}

              {/* Empty guard */}
              {filteredJobs.filter((j) => autoApplyState.jobIds.has(String(j._id))).length === 0 && (
                <div className="flex flex-col items-center justify-center gap-2 p-10 text-center">
                  <Briefcase className="h-8 w-8 text-[#E2E8F0]" aria-hidden />
                  <p className="text-[13px] font-semibold text-[#0F172A]">No jobs in this set</p>
                  <p className="text-[12px] text-[#94A3B8]">Turn off auto-apply to see all matches.</p>
                </div>
              )}
            </div>
          ) : (
            /* ── NORMAL: all filtered jobs ── */
            <div className="min-h-0 flex-1 overflow-y-auto">
              {/* Top matches section */}
              {topMatches.length > 0 &&
                topMatches.map((job) => (
                  <ListCard
                    key={job._id}
                    job={job}
                    active={String(job._id) === selectedJobId}
                    onClick={() => setSelectedJobId(String(job._id))}
                    saved={savedIds.has(String(job._id))}
                    onToggleSave={toggleSave}
                    saving={savingId === String(job._id)}
                    matchLabel={getMatchLabel(job, recommendedOrder)}
                  />
                ))}

              {/* "More jobs you might like" divider */}
              {moreJobs.length > 0 && (
                <>
                  {topMatches.length > 0 && (
                    <p className="bg-[#F4F6F9] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">
                      More jobs you might like
                    </p>
                  )}
                  {moreJobs.map((job) => (
                    <ListCard
                      key={job._id}
                      job={job}
                      active={String(job._id) === selectedJobId}
                      onClick={() => setSelectedJobId(String(job._id))}
                      saved={savedIds.has(String(job._id))}
                      onToggleSave={toggleSave}
                      saving={savingId === String(job._id)}
                      matchLabel={getMatchLabel(job, recommendedOrder)}
                    />
                  ))}
                </>
              )}
            </div>
          )}

          {/* Filters overlay (slides over list) */}
          {showFilters && (
            <FiltersPanel
              filters={filters}
              onApply={(f) => setFilters((prev) => ({ ...prev, ...f }))}
              onClose={() => setShowFilters(false)}
              totalJobs={filteredJobs.length}
              jobs={jobs}
            />
          )}
        </div>

        {/* ── RIGHT: job detail (desktop) ─────────────────────── */}
        <div className="hidden min-h-0 flex-1 overflow-hidden bg-white md:flex md:flex-col">
          <JobDetailPanel job={selectedJob} navigate={navigate} onRemove={handleRemoveRecommendation} />
        </div>
      </div>

      {/* ── AutoApply Modal ───────────────────────────────────── */}
      {autoApplyOpen && (
        <AutoApplyModal
          strongJobs={strongJobs}
          goodJobs={goodJobs}
          onClose={() => setAutoApplyOpen(false)}
          onConfirm={handleAutoApply}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY FULL-PAGE LAYOUT (for regular / job browse — ?recommended=1 is absent)
// All original functionality preserved 1:1
// ─────────────────────────────────────────────────────────────────────────────
function LegacyCompanySticker({ company }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const logo = company?.logoPath;
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-control border border-[#E2E8F0] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.07)]">
      {logo && !logoFailed ? (
        <img
          src={logo}
          alt={`${company?.name || "Company"} logo`}
          className="h-full w-full object-contain p-1.5"
          onError={() => setLogoFailed(true)}
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-[#FEF3E8] text-[15px] font-bold text-[#F97316]">
          {companyInitials(company?.name)}
        </span>
      )}
    </div>
  );
}

function LegacyJobCard({ job, saved, onToggleSave, saving }) {
  const to = `/jobs/${job.slug || job._id}`;
  return (
    <Card interactive className="relative flex h-full flex-col border-[#E2E8F0] bg-white">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] leading-6 font-semibold text-[#0F172A]">
            <Link
              to={to}
              className="hover:text-[#F97316] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F97316]"
            >
              {job.title}
            </Link>
          </h2>
          <p className="mt-1 truncate text-[14px] text-[#F97316]">
            {job.company?.name && (
              <span className="font-medium text-[#F97316]">{job.company.name}</span>
            )}
            {job.company?.name && job.department ? " · " : ""}
            {job.department}
          </p>
        </div>
        <div className="flex shrink-0 items-start gap-2">
          <LegacyCompanySticker company={job.company} />
          <button
            type="button"
            onClick={() => onToggleSave(job)}
            disabled={saving}
            aria-label={saved ? `Unsave ${job.title}` : `Save ${job.title}`}
            aria-pressed={saved}
            className={`tap-target inline-flex h-9 w-9 items-center justify-center rounded-control border transition-colors ${
              saved
                ? "border-brand-300 bg-[#FEF3E8] text-[#F97316]"
                : "border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#FEF3E8] hover:text-[#F97316]"
            }`}
          >
            {saved ? (
              <Bookmark className="h-4 w-4 fill-current" aria-hidden="true" />
            ) : (
              <Bookmark className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[#F97316]">
        <MetaItem icon={MapPin}>{job.location}</MetaItem>
        <MetaItem icon={Clock}>{experienceLabel(job.minExperienceYears)}</MetaItem>
        <MetaItem icon={GraduationCap}>{job.requiredEducation}</MetaItem>
      </div>

      {job.description && (
        <p className="mt-3 line-clamp-1 text-[14px] leading-5 text-[#64748B]">
          {job.description}
        </p>
      )}

      <TokenList className="mt-3" items={job.requiredSkills} max={6} />

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#E2E8F0] pt-3">
        <Link
          to={to}
          className="inline-flex min-h-10 items-center gap-2 rounded-control bg-[#F97316] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-4"
        >
          View Job <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
        {saved && <span className="text-[12px] font-medium text-[#64748B]">Saved</span>}
      </div>
    </Card>
  );
}

function LegacyFullPageLayout({
  jobs, filteredJobs, savedIds, savingId, loading, error,
  filters, setFilters, query, setQuery, searchInput, setSearchInput,
  toggleSave, navigate,
}) {
  const [sort, setSort] = useState("match");
  const hasFilters = Object.values(filters).some(Boolean) || query;

  function updateFilter(name, value) {
    setFilters((c) => ({ ...c, [name]: value }));
  }

  return (
    <div className="space-y-6">
      <PageHero
        title="Open positions"
        descriptionClassName="text-[13px] font-normal text-[#64748B]"
        description="Apply once — AI screening and interviews take it from there."
        points={["One application per role", "Evidence-backed screening", "Track every stage"]}
        pointsClassName="text-[12px]"
      />

      {/* Search bar */}
      <form
        role="search"
        onSubmit={(e) => { e.preventDefault(); setQuery(searchInput.trim()); }}
        className="flex flex-col gap-3 rounded-card border border-[#E2E8F0] bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.07)] sm:flex-row"
      >
        <label className="sr-only" htmlFor="job-search">Search open roles</label>
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#F97316]"
            aria-hidden="true"
          />
          <input
            id="job-search"
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search jobs, skills, companies..."
            className="h-12 w-full rounded-control border border-[#E2E8F0] bg-white py-3 pl-11 pr-11 text-[15px] text-[#0F172A] placeholder:text-[#64748B] focus:border-[#F97316] focus:outline-none focus:ring-3 focus:ring-[#F97316]/20"
          />
          {(searchInput || query) && (
            <button
              type="button"
              onClick={() => { setSearchInput(""); setQuery(""); }}
              className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-control text-[#64748B] hover:bg-[#FEF3E8] hover:text-[#F97316]"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
        <button
          type="submit"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-control bg-[#F97316] px-6 text-[15px] font-semibold text-white transition-colors hover:opacity-90"
        >
          <Search className="h-4 w-4" aria-hidden="true" /> Search jobs
        </button>
      </form>

      {/* Filters panel */}
      <section
        aria-label="Job filters"
        className="rounded-card border border-[#E2E8F0] bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.07)]"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-[#0F172A]">
            <SlidersHorizontal className="h-4 w-4 text-[#F97316]" /> Filters
          </div>
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setFilters({ location: "", experience: "", skills: "", company: "", department: "", matchFilter: "", minSalary: "Any", workArrangement: "", employmentType: "" });
                setQuery(""); setSearchInput("");
              }}
              className="text-[12px] font-semibold text-[#F97316] hover:underline"
            >
              Clear all
            </button>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-[12px] font-semibold text-[#64748B]">
            Location
            <input value={filters.location} onChange={(e) => updateFilter("location", e.target.value)} placeholder="City or region" className="mt-1 h-10 w-full rounded-[9px] border border-[#E2E8F0] bg-white px-3 text-[13px] font-normal text-[#0F172A]" />
          </label>
          <label className="text-[12px] font-semibold text-[#64748B]">
            Experience
            <select value={filters.experience} onChange={(e) => updateFilter("experience", e.target.value)} className="mt-1 h-10 w-full rounded-[9px] border border-[#E2E8F0] bg-white px-3 text-[13px] font-normal text-[#0F172A]">
              <option value="">Any experience</option>
              <option value="0">Entry level</option>
              <option value="2">2+ years</option>
              <option value="5">5+ years</option>
              <option value="8">8+ years</option>
            </select>
          </label>
          <label className="text-[12px] font-semibold text-[#64748B]">
            Skills
            <input value={filters.skills} onChange={(e) => updateFilter("skills", e.target.value)} placeholder="e.g. React, SQL" className="mt-1 h-10 w-full rounded-[9px] border border-[#E2E8F0] bg-white px-3 text-[13px] font-normal text-[#0F172A]" />
          </label>
          <label className="text-[12px] font-semibold text-[#64748B]">
            Company
            <input value={filters.company} onChange={(e) => updateFilter("company", e.target.value)} placeholder="Company name" className="mt-1 h-10 w-full rounded-[9px] border border-[#E2E8F0] bg-white px-3 text-[13px] font-normal text-[#0F172A]" />
          </label>
        </div>
      </section>

      {error && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-[#DC2626]">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <Skeleton className="h-11 w-11 rounded-2xl" />
              <Skeleton className="mt-4 h-5 w-2/3" />
              <Skeleton className="mt-2 h-4 w-1/3" />
              <Skeleton className="mt-5 h-12 w-full" />
            </Card>
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No open positions right now"
          description="Check back soon — new roles are posted regularly."
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-[#64748B]">
              <span className="font-semibold text-[#0F172A]">{filteredJobs.length}</span>
              {" "}{filteredJobs.length === 1 ? "role is" : "roles are"} open right now.
            </p>
            <label className="flex min-w-0 flex-wrap items-center gap-2 text-[12px] font-semibold text-[#64748B]">
              Sort by
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="box-border min-w-[8.5rem] max-w-full h-9 rounded-[9px] border border-[#E2E8F0] bg-white px-2 text-[12px] font-semibold text-[#0F172A]"
              >
                <option value="match">Best Match</option>
                <option value="newest">Newest</option>
              </select>
            </label>
          </div>

          {filteredJobs.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No matching roles"
              description="Try a different role, skill, company, location, or a shorter search phrase."
            />
          ) : (
            <ul className="grid list-none items-stretch gap-4">
              {filteredJobs.map((job) => (
                <li key={job._id} className="min-w-0">
                  <LegacyJobCard
                    job={job}
                    saved={savedIds.has(String(job._id))}
                    saving={savingId === String(job._id)}
                    onToggleSave={toggleSave}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
