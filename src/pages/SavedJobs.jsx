import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Bookmark, Briefcase, Building2, Calendar, FileText, MapPin, Search, Sparkles, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../api/client.js";
import { accountAuthHeader } from "../auth/accountAuth.js";
import { Badge, Card, EmptyState, IconTile, Skeleton } from "../components/ui/Card.jsx";
import { Select } from "../components/ui/Field.jsx";
import Button from "../components/ui/Button.jsx";

function companyInitials(name) {
  return String(name || "Company").trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function SavedJobCard({ job, onUnsave, saving }) {
  const to = `/jobs/${job.slug || job._id}`;
  return (
    <Card className="relative border-[#E2E8F0] bg-white dark:border-[#E2E8F0] dark:bg-white">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FEF3E8] text-sm font-bold text-[#F97316]">{companyInitials(job.company?.name)}</span>
        <div className="min-w-0 flex-1">
          <Link to={to} className="block truncate text-[15px] font-semibold text-[#0F172A] hover:text-[#F97316] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5A7B71]">{job.title || "Open position"}</Link>
          <p className="mt-1 truncate text-sm text-[#F97316]">{job.company?.name || "Company unavailable"}{job.department ? ` · ${job.department}` : ""}</p>
        </div>
        <button type="button" onClick={() => onUnsave(job)} disabled={saving} aria-label={`Unsave ${job.title || "job"}`} aria-pressed="true" className="tap-target inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#FED7AA] bg-[#FEF3E8] text-[#F97316] transition-colors hover:bg-[#FED7AA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/20 disabled:cursor-wait disabled:opacity-60">
          <Bookmark className="h-4 w-4 fill-current" aria-hidden="true" />
        </button>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#F97316]">
        {job.location && <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{job.location}</span>}
        {job.minExperienceYears != null && <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{job.minExperienceYears ? `${job.minExperienceYears}+ yrs experience` : "No minimum experience"}</span>}
      </div>
      {job.description && <p className="mt-3 line-clamp-2 text-sm leading-5 text-[#64748B]">{job.description}</p>}
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#E2E8F0] pt-3"><span className="text-xs font-medium text-[#64748B]">Saved for later</span><Button as={Link} to={to} size="sm">View job</Button></div>
    </Card>
  );
}

export default function SavedJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [experience, setExperience] = useState("");
  const [company, setCompany] = useState("");
  const [sort, setSort] = useState("recent");
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/candidate-dashboard", { headers: accountAuthHeader() })
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
    <div className="min-h-[calc(100vh-7rem)] w-full space-y-6 pb-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748B]">Your activity</p>
          <h1 className="mt-2 text-2xl font-bold text-[#0F172A]">
            Saved <span className="text-[#CA8A04]">Jobs</span>
          </h1>
          <p className="mt-2 text-sm text-[#64748B]">Roles you're considering for your next application.</p>
        </div>
        <label className="flex min-h-11 items-center gap-2 rounded-full border border-[#E0E5E2] bg-white px-4 text-sm text-[#77807D] shadow-[0_2px_6px_rgba(33,71,64,.06)] focus-within:border-[#EAB308] focus-within:ring-2 focus-within:ring-[#FEF9C3]">
          <Search className="h-4 w-4" />
          <span className="sr-only">Search saved jobs</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search saved jobs..."
            className="w-36 border-0 bg-transparent p-0 text-sm outline-none placeholder:text-[#77807D] focus:ring-0 sm:w-48"
          />
        </label>
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
          <Card padding="compact" className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <IconTile icon={Bookmark} tone="yellow" />
              <div>
                <p className="text-lg font-bold leading-none text-[#0F172A]">{jobs.length}</p>
                <p className="mt-1 text-xs font-medium text-[#64748B]">{jobs.length === 1 ? "Saved Job" : "Saved Jobs"}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select compact value={location} onChange={(event) => setLocation(event.target.value)} className="w-auto">
                <option value="">All Locations</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </Select>
              <Select compact value={experience} onChange={(event) => setExperience(event.target.value)} className="w-auto">
                <option value="">All Experience</option>
                {EXPERIENCE_BANDS.map((band) => (
                  <option key={band.value} value={band.value}>{band.label}</option>
                ))}
              </Select>
              <Select compact value={company} onChange={(event) => setCompany(event.target.value)} className="w-auto">
                <option value="">All Companies</option>
                {companies.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </Select>
              <Select compact value={sort} onChange={(event) => setSort(event.target.value)} className="w-auto">
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

          <Card tone="yellow" className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <IconTile icon={Briefcase} tone="yellow" size="lg" />
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">Find more opportunities</h3>
                <p className="mt-1 text-sm text-[#64748B]">Explore thousands of jobs and find the right fit for your career.</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button as={Link} to="/" variant="yellow">
                Browse Jobs
                <ArrowRight className="h-4 w-4" />
              </Button>
              <span aria-hidden="true" className="relative hidden h-16 w-16 shrink-0 items-center justify-center sm:flex">
                <FileText className="h-14 w-14 text-[#E2E8F0]" strokeWidth={1.5} />
                <Bookmark className="absolute -bottom-1 -right-1 h-6 w-6 fill-[#EAB308] text-[#EAB308]" />
                <Sparkles className="absolute -top-1 -left-1 h-4 w-4 text-[#CA8A04]" />
              </span>
            </div>
          </Card>
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
