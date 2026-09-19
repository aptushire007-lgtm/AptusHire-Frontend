import { useEffect, useMemo, useState } from "react";
import { Bookmark, Briefcase, Building2, Calendar, MapPin, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../api/client.js";
import { fetchDashboard, peekDashboard } from "../api/dashboardCache.js";
import { accountAuthHeader } from "../auth/accountAuth.js";
import { Badge, Card, EmptyState, IconTile, Skeleton } from "../components/ui/Card.jsx";
import { Select } from "../components/ui/Field.jsx";
import Button from "../components/ui/Button.jsx";

const EXPERIENCE_BANDS = [
  { value: "1", label: "1+ years" },
  { value: "2", label: "2+ years" },
  { value: "3", label: "3+ years" },
  { value: "5", label: "5+ years" },
  { value: "8", label: "8+ years" },
];

const SORTS = [
  { value: "recent", label: "Recently saved" },
  { value: "oldest", label: "Oldest saved" },
  { value: "title", label: "Job title (A-Z)" },
  { value: "company", label: "Company (A-Z)" },
];

function formatSavedOn(value) {
  if (!value) return "Date unavailable";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function SavedJobs() {
  const [jobs, setJobs] = useState(() => {
    const unique = new Map();
    for (const job of peekDashboard()?.savedJobs || []) if (job?._id) unique.set(String(job._id), job);
    return [...unique.values()];
  });
  const [loading, setLoading] = useState(() => !peekDashboard());
  const [savingId, setSavingId] = useState(null);
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [experience, setExperience] = useState("");
  const [company, setCompany] = useState("");
  const [sort, setSort] = useState("recent");
  const [error, setError] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    fetchDashboard()
      .then(({ data }) => {
        const unique = new Map();
        for (const job of data.savedJobs || []) if (job?._id) unique.set(String(job._id), job);
        setJobs([...unique.values()]);
      })
      .catch((err) => {
        setError(err?.response?.data?.error || "We couldn't load your saved jobs. Please try again.");
      })
      .finally(() => setLoading(false));
  }, []);

  const locations = useMemo(() => [...new Set(jobs.map((job) => job.location).filter(Boolean))].sort(), [jobs]);
  const companies = useMemo(() => [...new Set(jobs.map((job) => job.company?.name).filter(Boolean))].sort(), [jobs]);
  const activeFilterCount = [location, experience, company].filter(Boolean).length;

  const visibleJobs = useMemo(() => {
    const value = query.trim().toLowerCase();
    let list = jobs;
    if (value) list = list.filter((job) => `${job.title || ""} ${job.company?.name || ""} ${job.department || ""} ${job.location || ""}`.toLowerCase().includes(value));
    if (location) list = list.filter((job) => job.location === location);
    if (company) list = list.filter((job) => job.company?.name === company);
    if (experience) list = list.filter((job) => Number(job.minExperienceYears || 0) >= Number(experience));

    const sorted = [...list];
    if (sort === "recent") sorted.sort((a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0));
    else if (sort === "oldest") sorted.sort((a, b) => new Date(a.savedAt || 0) - new Date(b.savedAt || 0));
    else if (sort === "title") sorted.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    else if (sort === "company") sorted.sort((a, b) => (a.company?.name || "").localeCompare(b.company?.name || ""));
    return sorted;
  }, [jobs, query, location, company, experience, sort]);

  async function unsave(job) {
    const id = String(job._id);
    setSavingId(id);
    setError("");
    try {
      const response = await api.post(`/candidate-dashboard/saved-jobs/${job._id}`, {}, { headers: accountAuthHeader() });
      if (!response.data.saved) setJobs((current) => current.filter((entry) => String(entry._id) !== id));
    } catch (err) {
      setError(err?.response?.data?.error || "We couldn't update your saved jobs. Please try again.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="min-h-[calc(100vh-7rem)] w-full space-y-7 pb-10">
      <div>
        <h1 className="text-[30px] font-semibold text-[#0F172A]">Saved Jobs</h1>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          <Trash2 className="h-4 w-4" />
          {error}
        </div>
      )}

      {loading && (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((item) => (
            <Card key={item}>
              <Skeleton className="h-11 w-11" />
              <Skeleton className="mt-4 h-5 w-2/3" />
              <Skeleton className="mt-3 h-4 w-1/2" />
              <Skeleton className="mt-6 h-10 w-full" />
            </Card>
          ))}
        </div>
      )}

      {!loading && jobs.length === 0 && (
        <EmptyState icon={Bookmark} tone="yellow" title="No saved jobs yet" description="Bookmark roles you want to revisit and they'll appear here." action={<Button as={Link} to="/" size="sm" variant="yellow">Find jobs</Button>} />
      )}

      {!loading && jobs.length > 0 && (
        <>
          <Card padding="compact" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <IconTile icon={Bookmark} tone="yellow" />
                <div>
                  <p className="text-lg font-bold leading-none text-[#0F172A]">{jobs.length}</p>
                  <p className="mt-1 text-xs font-medium text-[#64748B]">{jobs.length === 1 ? "Saved Job" : "Saved Jobs"}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFiltersOpen((open) => !open)}
                aria-expanded={filtersOpen}
                aria-controls="saved-jobs-filters"
                className="tap-target inline-flex items-center gap-1.5 rounded-control border border-[#E2E8F0] px-3 py-2 text-xs font-semibold text-[#0F172A] transition-colors hover:bg-[#F1F5F9] sm:hidden"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#F97316] px-1 text-[10px] font-bold text-white">{activeFilterCount}</span>
                )}
              </button>
            </div>

            <div
              id="saved-jobs-filters"
              className={`${filtersOpen ? "flex" : "hidden"} w-full flex-col gap-2 sm:flex sm:w-auto sm:flex-row sm:flex-wrap sm:items-center`}
            >
              <label className="flex min-h-11 w-full items-center gap-2 rounded-control border border-[#E0E5E2] bg-white px-3 text-sm text-[#77807D] focus-within:border-[#EAB308] focus-within:ring-2 focus-within:ring-[#FEF9C3] sm:w-48">
                <Search className="h-4 w-4 shrink-0" />
                <span className="sr-only">Search saved jobs</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search saved jobs..."
                  className="w-full border-0 bg-transparent p-0 text-sm outline-none placeholder:text-[#77807D] focus:ring-0"
                />
              </label>
              <Select compact value={location} onChange={(event) => setLocation(event.target.value)} className="w-full sm:w-auto">
                <option value="">All Locations</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </Select>
              <Select compact value={experience} onChange={(event) => setExperience(event.target.value)} className="w-full sm:w-auto">
                <option value="">All Experience</option>
                {EXPERIENCE_BANDS.map((band) => (
                  <option key={band.value} value={band.value}>{band.label}</option>
                ))}
              </Select>
              <Select compact value={company} onChange={(event) => setCompany(event.target.value)} className="w-full sm:w-auto">
                <option value="">All Companies</option>
                {companies.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </Select>
              <Select compact value={sort} onChange={(event) => setSort(event.target.value)} className="w-full sm:w-auto">
                {SORTS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
            </div>
          </Card>

          {visibleJobs.length === 0 ? (
            <EmptyState icon={Search} tone="yellow" title="No matching saved jobs" description="Try a different company, role, department, or location." />
          ) : (
            <>
              <div className="hidden w-full overflow-x-auto rounded-[16px] border border-[#E2E8F0] bg-white shadow-[0_5px_18px_rgba(33,71,64,.05)] md:block">
                <table className="w-full min-w-[820px] table-fixed border-collapse text-left">
                  <thead className="bg-[#FBFCFB]">
                    <tr className="text-[11px] font-bold text-[#14233A]">
                      <th className="w-[22%] px-3 py-3 sm:px-4">Company</th>
                      <th className="w-[24%] px-3 py-3 sm:px-4">Job Title</th>
                      <th className="w-[22%] px-3 py-3 sm:px-4">Location / Experience</th>
                      <th className="w-[14%] px-3 py-3 sm:px-4">Saved On</th>
                      <th className="w-[18%] px-3 py-3 text-right sm:px-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleJobs.map((job) => (
                      <SavedJobRow key={job._id} job={job} onUnsave={unsave} saving={savingId === String(job._id)} />
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 md:hidden">
                {visibleJobs.map((job) => (
                  <SavedJobCard key={job._id} job={job} onUnsave={unsave} saving={savingId === String(job._id)} />
                ))}
              </div>
            </>
          )}

        </>
      )}
    </div>
  );
}

function SavedJobRow({ job, onUnsave, saving }) {
  const to = `/jobs/${job.slug || job._id}`;
  return (
    <tr className="border-t border-[#E2E8F0] text-sm text-[#0F172A] hover:bg-[#FBFCFB]">
      <td className="break-words px-3 py-4 sm:px-4">
        <div className="flex items-center gap-2.5">
          <IconTile icon={Building2} tone="slate" size="sm" />
          <span className="font-semibold">{job.company?.name || "Company unavailable"}</span>
        </div>
      </td>
      <td className="break-words px-3 py-4 sm:px-4">
        <Link to={to} className="font-medium hover:text-[#CA8A04]">{job.title || "Open position"}</Link>
        {job.department && (
          <div className="mt-1.5">
            <Badge tone="slate">{job.department}</Badge>
          </div>
        )}
      </td>
      <td className="break-words px-3 py-4 text-xs text-[#64748B] sm:px-4">
        {job.location && (
          <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0" />{job.location}</span>
        )}
        {job.minExperienceYears != null && (
          <span className="mt-1 flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5 shrink-0" />{job.minExperienceYears ? `${job.minExperienceYears}+ yrs experience` : "No minimum experience"}</span>
        )}
      </td>
      <td className="break-words px-3 py-4 text-xs text-[#64748B] sm:px-4">
        <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 shrink-0" />{formatSavedOn(job.savedAt)}</span>
      </td>
      <td className="px-3 py-4 text-right sm:px-4">
        <div className="flex flex-wrap justify-end gap-2">
          <Button as={Link} to={to} size="sm" variant="yellow-outline">View Job</Button>
          <button
            type="button"
            onClick={() => onUnsave(job)}
            disabled={saving}
            aria-label={`Unsave ${job.title || "job"}`}
            className="tap-target inline-flex min-h-8 items-center justify-center rounded-control border border-[#E2E8F0] px-3 text-xs font-semibold text-[#64748B] hover:bg-[#F1F5F9] disabled:cursor-wait disabled:opacity-60"
          >
            Remove
          </button>
        </div>
      </td>
    </tr>
  );
}

function SavedJobCard({ job, onUnsave, saving }) {
  const to = `/jobs/${job.slug || job._id}`;
  return (
    <Card padding="compact" className="space-y-3">
      <div className="flex items-start gap-2.5">
        <IconTile icon={Building2} tone="slate" size="sm" />
        <div className="min-w-0 flex-1">
          <span className="block text-xs font-semibold text-[#64748B]">{job.company?.name || "Company unavailable"}</span>
          <Link to={to} className="mt-0.5 block font-semibold text-[#0F172A] hover:text-[#CA8A04]">{job.title || "Open position"}</Link>
          {job.department && (
            <div className="mt-1.5">
              <Badge tone="slate">{job.department}</Badge>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-1 text-xs text-[#64748B]">
        {job.location && (
          <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0" />{job.location}</span>
        )}
        {job.minExperienceYears != null && (
          <span className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5 shrink-0" />{job.minExperienceYears ? `${job.minExperienceYears}+ yrs experience` : "No minimum experience"}</span>
        )}
        <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 shrink-0" />Saved {formatSavedOn(job.savedAt)}</span>
      </div>

      <div className="flex gap-2 pt-1">
        <Button as={Link} to={to} size="sm" variant="yellow-outline" className="flex-1">View Job</Button>
        <button
          type="button"
          onClick={() => onUnsave(job)}
          disabled={saving}
          aria-label={`Unsave ${job.title || "job"}`}
          className="tap-target inline-flex min-h-8 flex-1 items-center justify-center rounded-control border border-[#E2E8F0] px-3 text-xs font-semibold text-[#64748B] hover:bg-[#F1F5F9] disabled:cursor-wait disabled:opacity-60"
        >
          Remove
        </button>
      </div>
    </Card>
  );
}
