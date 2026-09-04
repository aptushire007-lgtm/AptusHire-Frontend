import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Briefcase, MapPin, ArrowRight, GraduationCap, Clock, Search, X, Bookmark, Check, SlidersHorizontal } from "lucide-react";
import api from "../api/client.js";
import { accountAuthHeader } from "../auth/accountAuth.js";
import { useAccountAuth } from "../auth/useAccountAuth.js";
import { Card, Skeleton, EmptyState } from "../components/ui/Card.jsx";
import { PageHero, TokenList, MetaItem } from "../components/ui/Panels.jsx";

// Reads as a sentence next to the icon. `0` is a real answer here — "open to
// all experience levels" — and is worth saying rather than hiding the row.
function experienceLabel(years) {
  if (years == null) return null;
  return years > 0 ? `${years}+ yrs experience` : "No minimum experience";
}

function fuzzyScore(value, term) {
  const text = String(value || "").toLowerCase();
  const needle = term.toLowerCase();
  const exactAt = text.indexOf(needle);
  if (exactAt >= 0) return 100 - Math.min(exactAt, 40);

  let at = 0;
  let gaps = 0;
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
    job.title,
    job.company?.name,
    job.department,
    job.location,
    job.description,
    job.requiredEducation,
    ...(job.requiredSkills || []),
  ];
  return query.trim().toLowerCase().split(/\s+/).reduce((total, term) => {
    if (total < 0) return total;
    const best = Math.max(...fields.map((field) => fuzzyScore(field, term)));
    return best ? total + best : -1;
  }, 0);
}

function companyInitials(name) {
  return String(name || "Company").trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function CompanySticker({ company }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const logo = company?.logoPath;
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-control border border-[#E8E8E4] bg-white shadow-[0_1px_4px_rgba(27,67,50,0.07)]">
      {logo && !logoFailed ? (
        <img src={logo} alt={`${company?.name || "Company"} logo`} className="h-full w-full object-contain p-1.5" onError={() => setLogoFailed(true)} />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-[#FFE8DC] text-[15px] font-bold text-[#FF6B2C]">
          {companyInitials(company?.name)}
        </span>
      )}
    </div>
  );
}

function JobCard({ job, saved, onToggleSave, saving }) {
  const to = `/jobs/${job.slug || job._id}`;

  return (
    <Card interactive className="relative flex h-full flex-col border-[#E8E8E4] bg-white">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] leading-6 font-semibold text-[#1A1A1A]">
            <Link to={to} className="hover:text-[#FF6B2C] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
              {job.title}
            </Link>
          </h2>
          <p className="mt-1 truncate text-[14px] text-[#FF6B2C]">
            {job.company?.name && <span className="font-medium text-[#FF6B2C]">{job.company.name}</span>}
            {job.company?.name && job.department ? " · " : ""}
            {job.department}
          </p>
        </div>
        <div className="flex shrink-0 items-start gap-2">
          <CompanySticker company={job.company} />
          <button
            type="button"
            onClick={() => onToggleSave(job)}
            disabled={saving}
            aria-label={saved ? `Unsave ${job.title}` : `Save ${job.title}`}
            aria-pressed={saved}
            className={`tap-target inline-flex h-9 w-9 items-center justify-center rounded-control border transition-colors ${saved ? "border-brand-300 bg-[#FFE8DC] text-[#FF6B2C]" : "border-[#E8E8E4] bg-white text-[#6B6B6B] hover:bg-[#FFE8DC] hover:text-[#FF6B2C]"}`}
          >
            {saved ? <Bookmark className="h-4 w-4 fill-current" aria-hidden="true" /> : <Bookmark className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[#FF6B2C]">
        <MetaItem icon={MapPin}>{job.location}</MetaItem>
        <MetaItem icon={Clock}>{experienceLabel(job.minExperienceYears)}</MetaItem>
        <MetaItem icon={GraduationCap}>{job.requiredEducation}</MetaItem>
      </div>

      {job.description && (
        <p className="mt-3 line-clamp-1 text-[14px] leading-5 text-[#6B6B6B]">{job.description}</p>
      )}

      <TokenList className="mt-3" items={job.requiredSkills} max={6} />

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#E8E8E4] pt-3">
        <Link to={to} className="inline-flex min-h-10 items-center gap-2 rounded-control bg-[#FF6B2C] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#FF6B2C]-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lime">
          View Job <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
        {saved && <span className="text-[12px] font-medium text-[#6B6B6B]">Saved</span>}
      </div>
    </Card>
  );
}

export default function JobListings() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const recommendationsOnly = searchParams.get("recommended") === "1";
  const { isAuthenticated } = useAccountAuth();
  const [jobs, setJobs] = useState([]);
  const [savedIds, setSavedIds] = useState(new Set());
  const [savingId, setSavingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [recommendedOrder, setRecommendedOrder] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ location: "", experience: "", skills: "", company: "", department: "" });
  const [sort, setSort] = useState("match");

  const filteredJobs = useMemo(() => {
    const location = filters.location.trim().toLowerCase();
    const skills = filters.skills.trim().toLowerCase().split(/[,\s]+/).filter(Boolean);
    const company = filters.company.trim().toLowerCase();
    const department = filters.department.trim().toLowerCase();
    const minimumExperience = filters.experience === "" ? null : Number(filters.experience);
    const matches = jobs.filter((job) => {
      if (recommendationsOnly && !recommendedOrder.includes(String(job._id))) return false;
      const jobSkills = (job.requiredSkills || []).map((skill) => skill.toLowerCase());
      return (!location || String(job.location || "").toLowerCase().includes(location))
        && (minimumExperience === null || Number(job.minExperienceYears || 0) >= minimumExperience)
        && (!skills.length || skills.every((skill) => jobSkills.some((jobSkill) => jobSkill.includes(skill))))
        && (!company || String(job.company?.name || "").toLowerCase().includes(company))
        && (!department || String(job.department || "").toLowerCase().includes(department));
    });
    const ranked = matches.map((job) => ({ job, score: query.trim() ? jobSearchScore(job, query) : 0 }));
    const visible = query.trim() ? ranked.filter(({ score }) => score >= 0) : ranked;
    visible.sort((a, b) => recommendationsOnly
      ? recommendedOrder.indexOf(String(a.job._id)) - recommendedOrder.indexOf(String(b.job._id))
      : sort === "match" ? b.score - a.score : new Date(b.job.createdAt || 0) - new Date(a.job.createdAt || 0));
    return visible.map(({ job }) => job);
  }, [filters, jobs, query, recommendationsOnly, recommendedOrder, sort]);

  useEffect(() => {
    Promise.all([
      api.get("/jobs/published"),
      isAuthenticated
        ? api.get("/candidate-dashboard", { headers: accountAuthHeader() }).catch(() => null)
        : Promise.resolve(null),
    ])
      .then(([jobsRes, dashboardRes]) => {
        setJobs(jobsRes.data);
        if (dashboardRes) {
          setSavedIds(new Set((dashboardRes.data.savedJobs || []).map((job) => String(job._id || job))));
          setRecommendedOrder((dashboardRes.data.recommendedJobs || []).map((job) => String(job._id)));
        }
      })
      .catch(() => setError("We couldn't load jobs right now. Please try again."))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  async function toggleSave(job) {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: "/" } });
      return;
    }
    const id = String(job._id);
    setSavingId(id);
    try {
      const response = await api.post(`/candidate-dashboard/saved-jobs/${job._id}`, {}, { headers: accountAuthHeader() });
      setSavedIds((current) => {
        const next = new Set(current);
        if (response.data.saved) next.add(id); else next.delete(id);
        return next;
      });
    } catch (err) {
      setError(err?.response?.data?.error || "We couldn't update saved jobs. Please try again.");
    } finally {
      setSavingId(null);
    }
  }

  const hasFilters = Object.values(filters).some(Boolean) || query;

  return (
    <div className="space-y-6">
      <PageHero
        title={recommendationsOnly ? "Recommended jobs" : "Open positions"}
        descriptionClassName="text-[13px] font-normal text-[#6B6B6B]"
        description={recommendationsOnly ? "Roles ranked for your profile, resume skills, and experience." : "Apply once — AI screening and interviews take it from there. Every step names who it's waiting on and when it closes."}
        points={["One application per role", "Evidence-backed screening", "Track every stage"]}
        pointsClassName="text-[12px]"
      />

      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          setQuery(searchInput.trim());
        }}
        className="flex flex-col gap-3 rounded-card border border-[#E8E8E4] bg-white p-4 shadow-[0_1px_4px_rgba(27,67,50,0.07)] sm:flex-row"
      >
        <label className="sr-only" htmlFor="job-search">Search open roles</label>
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#FF6B2C]" aria-hidden="true" />
          <input
            id="job-search"
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search jobs, skills, companies..."
            className="h-12 w-full rounded-control border border-[#E8E8E4] bg-white py-3 pl-11 pr-11 text-[15px] text-[#1A1A1A] placeholder:text-[#6B6B6B] focus:border-[#FF6B2C] focus:outline-none focus:ring-3 focus:ring-primary/20"
          />
          {(searchInput || query) && (
            <button
              type="button"
              onClick={() => { setSearchInput(""); setQuery(""); }}
              className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-control text-[#6B6B6B] hover:bg-[#FFE8DC] hover:text-[#FF6B2C]"
              aria-label="Clear job search"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
        <button type="submit" className="inline-flex h-12 items-center justify-center gap-2 rounded-control bg-[#FF6B2C] px-6 text-[15px] font-semibold text-white transition-colors hover:bg-[#FF6B2C]-dark">
          <Search className="h-4 w-4" aria-hidden="true" /> Search jobs
        </button>
      </form>

      {!recommendationsOnly && <section aria-label="Job filters" className="rounded-card border border-[#E8E8E4] bg-white p-4 shadow-[0_1px_4px_rgba(27,67,50,0.07)]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-[#1A1A1A]"><SlidersHorizontal className="h-4 w-4 text-[#FF6B2C]" /> Filters</div>
          {hasFilters && <button type="button" onClick={() => { setFilters({ location: "", experience: "", skills: "", company: "", department: "" }); setQuery(""); setSearchInput(""); setSort("match"); }} className="text-[12px] font-semibold text-[#FF6B2C] hover:underline">Clear all</button>}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-[12px] font-semibold text-[#6B6B6B]">Location<input value={filters.location} onChange={(event) => updateFilter("location", event.target.value)} placeholder="City or region" className="mt-1 h-10 w-full rounded-[9px] border border-[#E8E8E4] bg-white px-3 text-[13px] font-normal text-[#1A1A1A]" /></label>
          <label className="text-[12px] font-semibold text-[#6B6B6B]">Experience<select value={filters.experience} onChange={(event) => updateFilter("experience", event.target.value)} className="mt-1 h-10 w-full rounded-[9px] border border-[#E8E8E4] bg-white px-3 text-[13px] font-normal text-[#1A1A1A]"><option value="">Any experience</option><option value="0">Entry level</option><option value="2">2+ years</option><option value="5">5+ years</option><option value="8">8+ years</option></select></label>
          <label className="text-[12px] font-semibold text-[#6B6B6B]">Skills<input value={filters.skills} onChange={(event) => updateFilter("skills", event.target.value)} placeholder="e.g. React, SQL" className="mt-1 h-10 w-full rounded-[9px] border border-[#E8E8E4] bg-white px-3 text-[13px] font-normal text-[#1A1A1A]" /></label>
          <label className="text-[12px] font-semibold text-[#6B6B6B]">Company<input value={filters.company} onChange={(event) => updateFilter("company", event.target.value)} placeholder="Company name" className="mt-1 h-10 w-full rounded-[9px] border border-[#E8E8E4] bg-white px-3 text-[13px] font-normal text-[#1A1A1A]" /></label>
          <label className="text-[12px] font-semibold text-[#6B6B6B]">Industry<input value={filters.department} onChange={(event) => updateFilter("department", event.target.value)} placeholder="Department" className="mt-1 h-10 w-full rounded-[9px] border border-[#E8E8E4] bg-white px-3 text-[13px] font-normal text-[#1A1A1A]" /></label>
          <label className="text-[12px] font-semibold text-[#6B6B6B]">Job type<select disabled title="Job type is not available in the current job API" className="mt-1 h-10 w-full rounded-[9px] border border-[#E8E8E4] bg-[#F5F5F0] px-3 text-[13px] font-normal text-[#6B6B6B]"><option>Not available</option></select></label>
          <label className="text-[12px] font-semibold text-[#6B6B6B]">Salary<select disabled title="Salary is not available in the current job API" className="mt-1 h-10 w-full rounded-[9px] border border-[#E8E8E4] bg-[#F5F5F0] px-3 text-[13px] font-normal text-[#6B6B6B]"><option>Not available</option></select></label>
          <label className="text-[12px] font-semibold text-[#6B6B6B]">Remote<select disabled title="Remote preference is not available in the current job API" className="mt-1 h-10 w-full rounded-[9px] border border-[#E8E8E4] bg-[#F5F5F0] px-3 text-[13px] font-normal text-[#6B6B6B]"><option>Not available</option></select></label>
        </div>
        <p className="mt-3 text-[11px] text-[#6B6B6B]">Some filters will appear once those fields are supported by the job data.</p>
      </section>}

      {error && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-[#C0392B]">{error}</p>
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
        <div>
          <EmptyState
            icon={Briefcase}
            title="No open positions right now"
            descriptionClassName="text-[13px] font-normal text-[#6B6B6B]"
            description="Check back soon — new roles are posted regularly."
          />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-[#6B6B6B]"><span className="font-semibold text-[#1A1A1A]">{filteredJobs.length}</span>{" "}{query ? `matching ${query}` : `${filteredJobs.length === 1 ? "role is" : "roles are"} open right now`}.</p>
            <label className="flex items-center gap-2 text-[12px] font-semibold text-[#6B6B6B]">Sort by<select value={sort} onChange={(event) => setSort(event.target.value)} className="h-9 rounded-[9px] border border-[#E8E8E4] bg-white px-2 text-[12px] font-semibold text-[#1A1A1A]"><option value="match">Best Match</option><option value="newest">Newest</option><option value="salary" disabled>Salary unavailable</option></select></label>
          </div>
          {filteredJobs.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No matching roles"
              description="Try a different role, skill, company, location, or a shorter search phrase."
              descriptionClassName="text-[14px] text-[#6B6B6B]"
            />
          ) : (
            /* `items-stretch` keeps every card in a row aligned. */
            <ul className="grid list-none items-stretch gap-4">
              {filteredJobs.map((job) => (
                <li key={job._id} className="min-w-0">
                  <JobCard job={job} saved={savedIds.has(String(job._id))} saving={savingId === String(job._id)} onToggleSave={toggleSave} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
