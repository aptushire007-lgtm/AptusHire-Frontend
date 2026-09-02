import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, BriefcaseBusiness, CalendarDays, Clock3, GraduationCap, MapPin } from "lucide-react";
import api from "../api/client.js";
import { Card, Skeleton } from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";

function companyInitials(name) {
  return String(name || "Company").trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function CompanyLogo({ company }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const logo = company?.logoPath;
  return (
    <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#DCE5DE] bg-white shadow-card sm:h-20 sm:w-20">
      {logo && !logoFailed ? (
        <img src={logo} alt={`${company?.name || "Company"} logo`} className="h-full w-full object-contain p-2" onError={() => setLogoFailed(true)} />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-[#EAF9E1] text-xl font-bold text-[#214740]">
          {companyInitials(company?.name)}
        </span>
      )}
    </div>
  );
}

function MetaFact({ icon: Icon, children }) {
  if (children == null || children === "") return null;
  return (
    <span className="inline-flex items-center gap-2 text-[14px] font-medium text-[#3B5D52]">
      <Icon className="h-[18px] w-[18px] shrink-0 text-[#5A7B71]" aria-hidden="true" />
      {children}
    </span>
  );
}

function postedLabel(value) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return null;
  const days = Math.max(0, Math.floor((Date.now() - timestamp) / 86400000));
  if (days === 0) return "Posted today";
  if (days === 1) return "Posted 1 day ago";
  return `Posted ${days} days ago`;
}

function TextBlock({ children }) {
  if (!children) return null;
  return <div className="whitespace-pre-line text-[15px] leading-7 text-[#434B47]">{children}</div>;
}

export default function JobDetail() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError("");
    setJob(null);
    api.get(`/jobs/${id}`).then((res) => {
      if (!cancelled) setJob(res.data);
    }).catch((err) => {
      if (cancelled) return;
      setError(err.response?.status === 404
        ? "This job doesn't exist or is no longer open."
        : "Could not load this job. Please check your connection and try again.");
    });
    return () => { cancelled = true; };
  }, [id, attempt]);

  if (error) {
    return (
      <div className="space-y-6">
        <Link to="/" className="inline-flex items-center gap-2 text-[14px] font-semibold text-[#3B5D52] hover:text-[#214740]">
          <ArrowLeft className="h-4 w-4" /> Back to listings
        </Link>
        <Card className="border-[#DFE5DF] bg-white py-12 text-center dark:border-[#DFE5DF] dark:bg-white">
          <h1 className="text-xl font-semibold text-[#2E2F2D]">Job unavailable</h1>
          <p className="mx-auto mt-2 max-w-md text-[15px] text-[#5A6761]">{error}</p>
          <Button variant="outline" className="mt-5" onClick={() => setAttempt((value) => value + 1)}>Try Again</Button>
        </Card>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-5 w-36" />
        <Card className="border-[#DFE5DF] bg-white dark:border-[#DFE5DF] dark:bg-white"><Skeleton className="h-52 w-full" /></Card>
        <Card className="border-[#DFE5DF] bg-white dark:border-[#DFE5DF] dark:bg-white"><Skeleton className="h-64 w-full" /></Card>
      </div>
    );
  }

  const applyTo = `/jobs/${job.slug || id}/apply${window.location.search}`;
  const experience = job.minExperienceYears > 0 ? `${job.minExperienceYears}+ years experience` : "No minimum experience";

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-10">
      <Link to="/" className="inline-flex items-center gap-2 rounded-lg text-[14px] font-semibold text-[#3B5D52] transition-colors hover:text-[#214740] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#5A7B71]">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to listings
      </Link>

      <Card className="border-[#DFE5DF] bg-white dark:border-[#DFE5DF] dark:bg-white" padding="none">
        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-5">
            <div className="min-w-0">
              <h1 className="font-display text-[25px] leading-tight font-semibold tracking-tight text-[#202521] sm:text-[30px]">{job.title}</h1>
              <p className="mt-2 text-[15px] text-[#3B5D52]">
                {job.company?.name && <span className="font-semibold text-[#214740]">{job.company.name}</span>}
                {job.company?.name && job.department ? <span className="mx-2 text-[#A7B2AB]">•</span> : null}
                {job.department}
              </p>
            </div>
            <CompanyLogo company={job.company} />
          </div>

          <div className="mt-6 flex flex-wrap gap-x-7 gap-y-3 border-b border-[#E5EBE6] pb-6">
            <MetaFact icon={Clock3}>{experience}</MetaFact>
            <MetaFact icon={MapPin}>{job.location}</MetaFact>
            <MetaFact icon={GraduationCap}>{job.requiredEducation}</MetaFact>
          </div>

          <div className="flex flex-col gap-5 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <MetaFact icon={CalendarDays}>{postedLabel(job.publishedAt || job.createdAt)}</MetaFact>
              {job.employmentType && <MetaFact icon={BriefcaseBusiness}>{job.employmentType}</MetaFact>}
            </div>
            <Button as={Link} to={applyTo} size="lg" className="w-full px-8 text-[15px] sm:w-auto">
              Apply now <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </Card>

      {job.requirements && (
        <Card className="border-[#DFE5DF] bg-white dark:border-[#DFE5DF] dark:bg-white">
          <div className="rounded-xl bg-[#F5F8F5] p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-[#202521]">Job highlights</h2>
            <div className="mt-3 border-l-[3px] border-[#C1EBAD] pl-4"><TextBlock>{job.requirements}</TextBlock></div>
          </div>
        </Card>
      )}

      <Card className="border-[#DFE5DF] bg-white dark:border-[#DFE5DF] dark:bg-white">
        <section>
          <h2 className="text-lg font-semibold text-[#202521]">Job description</h2>
          <div className="mt-3"><TextBlock>{job.description}</TextBlock></div>
        </section>

        {job.requiredSkills?.length > 0 && (
          <section className="mt-8 border-t border-[#E5EBE6] pt-7">
            <h2 className="text-lg font-semibold text-[#202521]">Key skills</h2>
            <p className="mt-1.5 text-[14px] text-[#5A6761]">Skills relevant to this role</p>
            <ul className="mt-4 flex flex-wrap gap-2.5">
              {job.requiredSkills.map((skill) => (
                <li key={skill} className="rounded-full border border-[#D5DED7] bg-white px-3.5 py-2 text-[14px] font-medium text-[#2E4F48]">{skill}</li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-8 flex flex-col gap-3 border-t border-[#E5EBE6] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-[13px] leading-5 text-[#707E79]">You'll be asked for your details and a resume. Screening starts as soon as you submit.</p>
          <Button as={Link} to={applyTo} size="lg" className="w-full px-8 text-[15px] sm:w-auto">
            Apply now <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
