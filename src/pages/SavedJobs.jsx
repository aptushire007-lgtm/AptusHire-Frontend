import { useEffect, useMemo, useState } from "react";
import { Bookmark, Briefcase, Clock, MapPin, Search, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../api/client.js";
import { accountAuthHeader } from "../auth/accountAuth.js";
import { Card, EmptyState, Skeleton } from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";

function companyInitials(name) {
  return String(name || "Company").trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function SavedJobCard({ job, onUnsave, saving }) {
  const to = `/jobs/${job.slug || job._id}`;
  return (
    <Card className="relative border-[#E5EBE7] bg-white dark:border-[#E5EBE7] dark:bg-white">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E8F2EC] text-sm font-bold text-[#176B45]">{companyInitials(job.company?.name)}</span>
        <div className="min-w-0 flex-1">
          <Link to={to} className="block truncate text-[15px] font-semibold text-[#17221C] hover:text-[#176B45] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5A7B71]">{job.title || "Open position"}</Link>
          <p className="mt-1 truncate text-sm text-[#176B45]">{job.company?.name || "Company unavailable"}{job.department ? ` · ${job.department}` : ""}</p>
        </div>
        <button type="button" onClick={() => onUnsave(job)} disabled={saving} aria-label={`Unsave ${job.title || "job"}`} aria-pressed="true" className="tap-target inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#C7DDD1] bg-[#E8F2EC] text-[#176B45] transition-colors hover:bg-[#D2ECC9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-wait disabled:opacity-60">
          <Bookmark className="h-4 w-4 fill-current" aria-hidden="true" />
        </button>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#176B45]">
        {job.location && <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{job.location}</span>}
        {job.minExperienceYears != null && <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{job.minExperienceYears ? `${job.minExperienceYears}+ yrs experience` : "No minimum experience"}</span>}
      </div>
      {job.description && <p className="mt-3 line-clamp-2 text-sm leading-5 text-[#64736A]">{job.description}</p>}
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#E5EBE7] pt-3"><span className="text-xs font-medium text-[#64736A]">Saved for later</span><Button as={Link} to={to} size="sm">View job</Button></div>
    </Card>
  );
}

export default function SavedJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/candidate-dashboard", { headers: accountAuthHeader() }).then(({ data }) => {
      const unique = new Map();
      for (const job of data.savedJobs || []) if (job?._id) unique.set(String(job._id), job);
      setJobs([...unique.values()]);
    }).catch((err) => {
      setError(err?.response?.data?.error || "We couldn't load your saved jobs. Please try again.");
    }).finally(() => setLoading(false));
  }, []);

  const visibleJobs = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return jobs;
    return jobs.filter((job) => `${job.title || ""} ${job.company?.name || ""} ${job.department || ""} ${job.location || ""}`.toLowerCase().includes(value));
  }, [jobs, query]);

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
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64736A]">Your activity</p><h1 className="mt-2 text-2xl font-bold text-[#17221C]">Saved Jobs</h1><p className="mt-2 text-sm text-[#64736A]">Roles you're considering for your next application.</p></div><label className="flex min-h-11 items-center gap-2 rounded-full border border-[#E0E5E2] bg-white px-4 text-sm text-[#77807D] shadow-[0_2px_6px_rgba(33,71,64,.06)] focus-within:border-[#A7D68E] focus-within:ring-2 focus-within:ring-[#EAF9E1]"><Search className="h-4 w-4" /><span className="sr-only">Search saved jobs</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" className="w-32 border-0 bg-transparent p-0 text-sm outline-none placeholder:text-[#77807D] focus:ring-0 sm:w-40" /></label></div>
      {error && <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"><Trash2 className="h-4 w-4" />{error}</div>}
      {loading && <div className="grid gap-4 md:grid-cols-2">{[1, 2, 3, 4].map((item) => <Card key={item}><Skeleton className="h-11 w-11" /><Skeleton className="mt-4 h-5 w-2/3" /><Skeleton className="mt-3 h-4 w-1/2" /><Skeleton className="mt-6 h-10 w-full" /></Card>)}</div>}
      {!loading && jobs.length === 0 && <EmptyState icon={Bookmark} title="No saved jobs yet" description="Bookmark roles you want to revisit and they'll appear here." action={<Button as={Link} to="/" size="sm">Find jobs</Button>} />}
      {!loading && jobs.length > 0 && visibleJobs.length === 0 && <EmptyState icon={Search} title="No matching saved jobs" description="Try a different company, role, department, or location." />}
      {!loading && visibleJobs.length > 0 && <><p className="text-[13px] text-[#64736A]"><span className="font-semibold text-[#17221C]">{visibleJobs.length}</span> {visibleJobs.length === 1 ? "saved job" : "saved jobs"}</p><div className="min-h-[calc(100vh-16rem)] w-full overflow-hidden rounded-[16px] border border-[#E5EBE7] bg-white shadow-[0_5px_18px_rgba(33,71,64,.05)]"><table className="w-full table-fixed border-collapse text-left"><thead className="bg-[#FBFCFB]"><tr className="text-[11px] font-bold text-[#14233A]"><th className="w-[28%] px-3 py-3 sm:px-4">Company</th><th className="w-[28%] px-3 py-3 sm:px-4">Job title</th><th className="w-[22%] px-3 py-3 sm:px-4">Location / experience</th><th className="w-[22%] px-3 py-3 text-right sm:px-4">Action</th></tr></thead><tbody>{visibleJobs.map((job) => <SavedJobRow key={job._id} job={job} onUnsave={unsave} saving={savingId === String(job._id)} />)}</tbody></table></div></>}
    </div>
  );
}

function SavedJobRow({ job, onUnsave, saving }) {
  const to = `/jobs/${job.slug || job._id}`;
  return <tr className="border-t border-[#E5EBE7] text-sm text-[#17221C] hover:bg-[#FBFCFB]"><td className="break-words px-3 py-4 font-semibold sm:px-4">{job.company?.name || "Company unavailable"}</td><td className="break-words px-3 py-4 sm:px-4"><Link to={to} className="font-medium hover:text-[#176B45]">{job.title || "Open position"}</Link><p className="mt-1 break-words text-xs text-[#64736A]">{job.department || "Saved role"}</p></td><td className="break-words px-3 py-4 text-xs text-[#64736A] sm:px-4">{job.location || "Location unavailable"}{job.minExperienceYears != null && <span className="mt-1 block">{job.minExperienceYears ? `${job.minExperienceYears}+ yrs experience` : "No minimum experience"}</span>}</td><td className="px-3 py-4 text-right sm:px-4"><div className="flex flex-wrap justify-end gap-2"><Button as={Link} to={to} size="sm" variant="outline">View job</Button><button type="button" onClick={() => onUnsave(job)} disabled={saving} aria-label={`Unsave ${job.title || "job"}`} className="tap-target inline-flex min-h-9 items-center justify-center rounded-lg border border-[#C7DDD1] px-2.5 text-xs font-semibold text-[#176B45] hover:bg-[#DDECE3] disabled:opacity-60"><Bookmark className="mr-1 h-3.5 w-3.5 fill-current" />Remove</button></div></td></tr>;
}