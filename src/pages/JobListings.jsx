import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, MapPin, ArrowRight, GraduationCap, Clock, Search, X } from "lucide-react";
import api from "../api/client.js";
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
    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#DFE5DF] bg-white shadow-card">
      {logo && !logoFailed ? (
        <img src={logo} alt={`${company?.name || "Company"} logo`} className="h-full w-full object-contain p-1.5" onError={() => setLogoFailed(true)} />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-[#EAF9E1] text-[15px] font-bold text-[#214740]">
          {companyInitials(company?.name)}
        </span>
      )}
    </div>
  );
}

function JobCard({ job }) {
  const to = `/jobs/${job.slug || job._id}`;

  return (
    <Card interactive className="relative flex h-full flex-col border-[#DFE5DF] bg-white dark:border-[#DFE5DF] dark:bg-white">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg leading-6 font-semibold text-[#2E2F2D]">
            <Link
              to={to}
              className="rounded after:absolute after:inset-0 hover:text-brand-700 dark:hover:text-brand-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600"
            >
              {job.title}
            </Link>
          </h2>
          <p className="mt-1 truncate text-[14px] text-[#3B5D52]">
            {job.company?.name && <span className="font-medium text-[#0E3B2E]">{job.company.name}</span>}
            {job.company?.name && job.department ? " · " : ""}
            {job.department}
          </p>
        </div>
        <CompanySticker company={job.company} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[#0E3B2E]">
        <MetaItem icon={MapPin}>{job.location}</MetaItem>
        <MetaItem icon={Clock}>{experienceLabel(job.minExperienceYears)}</MetaItem>
        <MetaItem icon={GraduationCap}>{job.requiredEducation}</MetaItem>
      </div>

      {job.description && (
        <p className="mt-3 line-clamp-1 text-[14px] leading-5 text-[#434B47]">{job.description}</p>
      )}

      <TokenList className="mt-3" items={job.requiredSkills} max={6} />

      <div className="mt-4 flex items-center justify-between border-t border-[#EDF1ED] pt-3 text-[13px] font-semibold text-[#214740]">
        <span aria-hidden="true">View &amp; apply</span>
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </div>
    </Card>
  );
}

export default function JobListings() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");

  const filteredJobs = useMemo(() => {
    if (!query.trim()) return jobs;
    return jobs
      .map((job) => ({ job, score: jobSearchScore(job, query) }))
      .filter(({ score }) => score >= 0)
      .sort((a, b) => b.score - a.score)
      .map(({ job }) => job);
  }, [jobs, query]);

  useEffect(() => {
    api
      .get("/jobs/published")
      .then((res) => setJobs(res.data))
      .catch(() => setError("Failed to load jobs"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHero
        title="Open positions"
        descriptionClassName="text-[13px] font-normal text-[#707E79]"
        description="Apply once — AI screening and interviews take it from there. Every step names who it's waiting on and when it closes."
        points={["One application per role", "Evidence-backed screening", "Track every stage"]}
        pointsClassName="text-[12px]"
      />

      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          setQuery(searchInput.trim());
        }}
        className="flex flex-col gap-3 rounded-2xl border border-[#DFE5DF] bg-white p-4 shadow-card sm:flex-row"
      >
        <label className="sr-only" htmlFor="job-search">Search open roles</label>
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#5A7B71]" aria-hidden="true" />
          <input
            id="job-search"
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by role, skill, company, location, or department"
            className="h-12 w-full rounded-[10px] border border-[#DFE5DF] bg-[#FBFBFD] py-3 pl-11 pr-11 text-[15px] text-[#2E2F2D] placeholder:text-[#8C9790] focus:border-[#5A7B71] focus:outline-none focus:ring-3 focus:ring-[#C1EBAD]/40"
          />
          {(searchInput || query) && (
            <button
              type="button"
              onClick={() => { setSearchInput(""); setQuery(""); }}
              className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#707E79] hover:bg-[#EAF9E1] hover:text-[#214740]"
              aria-label="Clear job search"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
        <button type="submit" className="inline-flex h-12 items-center justify-center gap-2 rounded-[10px] bg-[#214740] px-6 text-[15px] font-semibold text-white transition-colors hover:bg-[#2E4F48]">
          <Search className="h-4 w-4" aria-hidden="true" /> Search jobs
        </button>
      </form>

      {error && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-verdict-negative">{error}</p>
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
            descriptionClassName="text-[13px] font-normal text-[#707E79]"
            description="Check back soon — new roles are posted regularly."
          />
        </div>
      ) : (
        <>
          <p className="text-[14px] text-[#707E79]">
            <span className="font-semibold text-[#2E2F2D]">{filteredJobs.length}</span>{" "}
            {query ? `matching ${query}` : `${filteredJobs.length === 1 ? "role is" : "roles are"} open right now`}.
          </p>
          {filteredJobs.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No matching roles"
              description="Try a different role, skill, company, location, or a shorter search phrase."
              descriptionClassName="text-[14px] text-[#707E79]"
            />
          ) : (
            /* `items-stretch` keeps every card in a row aligned. */
            <ul className="grid list-none items-stretch gap-4">
              {filteredJobs.map((job) => (
                <li key={job._id} className="min-w-0">
                  <JobCard job={job} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
