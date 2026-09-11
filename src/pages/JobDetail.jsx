import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, BriefcaseBusiness, CalendarDays, CheckCircle2, Clock3, GraduationCap, MapPin } from "lucide-react";
import api from "../api/client.js";
import { accountAuthHeader } from "../auth/accountAuth.js";
import { Card, Skeleton } from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";

function companyInitials(name) {
  return String(name || "Company").trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function CompanyLogo({ company }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const logo = company?.logoPath;
  return (
    <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#DCE5DE] bg-white shadow-[0_1px_4px_rgba(27,67,50,0.07)] sm:h-20 sm:w-20">
      {logo && !logoFailed ? (
        <img src={logo} alt={`${company?.name || "Company"} logo`} className="h-full w-full object-contain p-2" onError={() => setLogoFailed(true)} />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-[#E8F2EC] text-xl font-bold text-[#176B45]">
          {companyInitials(company?.name)}
        </span>
      )}
    </div>
  );
}

function MetaFact({ icon: Icon, children }) {
  if (children == null || children === "") return null;
  return (
    <span className="inline-flex items-center gap-2 text-[14px] font-medium text-[#176B45]">
      <Icon className="h-[18px] w-[18px] shrink-0 text-[#64736A]" aria-hidden="true" />
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
    // Signed-in fetch so the payload tells us whether this person already
    // applied — one application per role, so the Apply button then becomes a
    // link to the application they already have.
    api.get(`/jobs/${id}`, { headers: accountAuthHeader() }).then((res) => {
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
        <Link to="/" className="inline-flex items-center gap-2 text-[14px] font-semibold text-[#176B45] hover:text-[#176B45]">
          <ArrowLeft className="h-4 w-4" /> Back to listings
        </Link>
        <Card className="border-[#E5EBE7] bg-white py-12 text-center dark:border-[#E5EBE7] dark:bg-white">
          <h1 className="text-xl font-semibold text-[#17221C]">Job unavailable</h1>
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
        <Card className="border-[#E5EBE7] bg-white dark:border-[#E5EBE7] dark:bg-white"><Skeleton className="h-52 w-full" /></Card>
        <Card className="border-[#E5EBE7] bg-white dark:border-[#E5EBE7] dark:bg-white"><Skeleton className="h-64 w-full" /></Card>
      </div>
    );
  }

  const applyTo = `/jobs/${job.slug || id}/apply${window.location.search}`;
  // One application per role. Once this person has applied, the CTA stops being
  // "Apply" and becomes a way back to the application they already have.
  const applyCta = ({ size = "lg", className = "" }) =>
    job.alreadyApplied ? (
      <Button as={Link} to="/applied-jobs" size={size} variant="outline" className={className}>
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Already applied — track it
      </Button>
    ) : (
      <Button as={Link} to={applyTo} size={size} className={className}>
        Apply Now <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    );
  const experience = job.minExperienceYears > 0 ? `${job.minExperienceYears}+ years experience` : "No minimum experience";
  const jobType = job.jobType || job.employmentType || "Not specified";
  const salary = job.salary || job.salaryRange || job.compensation;
  const match = job.match || job.matchInfo;

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-10">
      <Link to="/" className="inline-flex items-center gap-2 rounded-lg text-[13px] font-semibold text-[#176B45] transition-colors hover:text-[#176B45] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#5B6B63]">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
      </Link>

      <Card className="border-[#E5EBE7] bg-white dark:border-[#E5EBE7] dark:bg-white" padding="none">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="font-display text-[24px] leading-tight font-bold tracking-tight text-[#17221C] sm:text-[28px]">{job.title}</h1>
              <p className="mt-2 text-[14px] text-[#64736A]">
                {job.company?.name && <span className="font-semibold text-[#176B45]">{job.company.name}</span>}
                {job.company?.name && job.location ? <span className="mx-2 text-[#A7B2AB]">•</span> : null}
                {job.location || "Location not specified"}
                <span className="mx-2 text-[#A7B2AB]">•</span>
                {jobType}
              </p>
            </div>
            <CompanyLogo company={job.company} />
          </div>

          <div className="mt-6 flex flex-wrap gap-x-7 gap-y-3 border-t border-[#E5EBE6] pt-5">
            <MetaFact icon={Clock3}>{experience}</MetaFact>
            {job.requiredEducation && <MetaFact icon={GraduationCap}>{job.requiredEducation}</MetaFact>}
            <MetaFact icon={CalendarDays}>{postedLabel(job.publishedAt || job.createdAt)}</MetaFact>
          </div>

          {applyCta({ className: "mt-6 w-full px-8 text-[14px] sm:w-auto" })}
        </div>
      </Card>

      {match && (
        <Card className="border-[#C7DDD1] bg-[#E8F2EC] dark:border-[#C7DDD1] dark:bg-[#E8F2EC]">
          <h2 className="text-[16px] font-semibold text-[#176B45]">Why this job matches you</h2>
          <TextBlock>{match.explanation || match.reason || match.summary}</TextBlock>
          {match.score != null && <p className="mt-3 text-[13px] font-semibold text-[#176B45]">Match score: {match.score}%</p>}
        </Card>
      )}

      <Card className="border-[#E5EBE7] bg-white dark:border-[#E5EBE7] dark:bg-white">
        <section>
          <h2 className="text-[16px] font-semibold text-[#17221C]">Job Description</h2>
          <div className="mt-3"><TextBlock>{job.description || "No job description provided."}</TextBlock></div>
        </section>

        <section className="mt-8 border-t border-[#E5EBE6] pt-7">
          <h2 className="text-[16px] font-semibold text-[#17221C]">Requirements</h2>
          <div className="mt-3"><TextBlock>{job.requirements || "No specific requirements provided."}</TextBlock></div>
        </section>

        <section className="mt-8 border-t border-[#E5EBE6] pt-7">
          <h2 className="text-[16px] font-semibold text-[#17221C]">Skills</h2>
          {job.requiredSkills?.length > 0 ? (
            <ul className="mt-4 flex flex-wrap gap-2.5">
              {job.requiredSkills.map((skill) => <li key={skill} className="rounded-full border border-[#E5EBE7] bg-white px-3.5 py-2 text-[13px] font-medium text-[#176B45]">{skill}</li>)}
            </ul>
          ) : <p className="mt-3 text-[13px] text-[#64736A]">No specific skills listed.</p>}
        </section>

        <div className="mt-8 grid gap-4 border-t border-[#E5EBE6] pt-7 sm:grid-cols-3">
          <div><h2 className="text-[16px] font-semibold text-[#17221C]">Salary</h2><p className="mt-2 text-[13px] text-[#64736A]">{salary || "Not provided"}</p></div>
          <div><h2 className="text-[16px] font-semibold text-[#17221C]">Location</h2><p className="mt-2 text-[13px] text-[#64736A]">{job.location || "Not specified"}</p></div>
          <div><h2 className="text-[16px] font-semibold text-[#17221C]">Job Type</h2><p className="mt-2 text-[13px] text-[#64736A]">{jobType}</p></div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-[#E5EBE6] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-[13px] leading-5 text-[#64736A]">
            {job.alreadyApplied
              ? "You've already applied to this role. You can only apply once — track it from Applied Jobs."
              : "You'll be asked for your details and a resume. Screening starts as soon as you submit."}
          </p>
          {applyCta({ className: "w-full px-8 text-[14px] sm:w-auto" })}
        </div>
      </Card>
    </div>
  );
}

