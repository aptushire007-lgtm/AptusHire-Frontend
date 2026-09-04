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
    <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#DCE5DE] bg-white shadow-[0_1px_4px_rgba(27,67,50,0.07)] sm:h-20 sm:w-20">
      {logo && !logoFailed ? (
        <img src={logo} alt={`${company?.name || "Company"} logo`} className="h-full w-full object-contain p-2" onError={() => setLogoFailed(true)} />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-[#FFE8DC] text-xl font-bold text-[#FF6B2C]">
          {companyInitials(company?.name)}
        </span>
      )}
    </div>
  );
}

function MetaFact({ icon: Icon, children }) {
  if (children == null || children === "") return null;
  return (
    <span className="inline-flex items-center gap-2 text-[14px] font-medium text-[#FF6B2C]">
      <Icon className="h-[18px] w-[18px] shrink-0 text-[#6B6B6B]" aria-hidden="true" />
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
        <Link to="/" className="inline-flex items-center gap-2 text-[14px] font-semibold text-[#FF6B2C] hover:text-[#FF6B2C]">
          <ArrowLeft className="h-4 w-4" /> Back to listings
        </Link>
        <Card className="border-[#E8E8E4] bg-white py-12 text-center dark:border-[#E8E8E4] dark:bg-white">
          <h1 className="text-xl font-semibold text-[#1A1A1A]">Job unavailable</h1>
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
        <Card className="border-[#E8E8E4] bg-white dark:border-[#E8E8E4] dark:bg-white"><Skeleton className="h-52 w-full" /></Card>
        <Card className="border-[#E8E8E4] bg-white dark:border-[#E8E8E4] dark:bg-white"><Skeleton className="h-64 w-full" /></Card>
      </div>
    );
  }

  const applyTo = `/jobs/${job.slug || id}/apply${window.location.search}`;
  const experience = job.minExperienceYears > 0 ? `${job.minExperienceYears}+ years experience` : "No minimum experience";
  const jobType = job.jobType || job.employmentType || "Not specified";
  const salary = job.salary || job.salaryRange || job.compensation;
  const match = job.match || job.matchInfo;

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-10">
      <Link to="/" className="inline-flex items-center gap-2 rounded-lg text-[13px] font-semibold text-[#FF6B2C] transition-colors hover:text-[#FF6B2C] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#5A7B71]">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
      </Link>

      <Card className="border-[#E8E8E4] bg-white dark:border-[#E8E8E4] dark:bg-white" padding="none">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="font-display text-[24px] leading-tight font-bold tracking-tight text-[#1A1A1A] sm:text-[28px]">{job.title}</h1>
              <p className="mt-2 text-[14px] text-[#6B6B6B]">
                {job.company?.name && <span className="font-semibold text-[#FF6B2C]">{job.company.name}</span>}
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

          <Button as={Link} to={applyTo} size="lg" className="mt-6 w-full px-8 text-[14px] sm:w-auto">Apply Now <ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>
        </div>
      </Card>

      {match && (
        <Card className="border-[#FFCAAF] bg-[#FFE8DC] dark:border-[#FFCAAF] dark:bg-[#FFE8DC]">
          <h2 className="text-[16px] font-semibold text-[#FF6B2C]">Why this job matches you</h2>
          <TextBlock>{match.explanation || match.reason || match.summary}</TextBlock>
          {match.score != null && <p className="mt-3 text-[13px] font-semibold text-[#FF6B2C]">Match score: {match.score}%</p>}
        </Card>
      )}

      <Card className="border-[#E8E8E4] bg-white dark:border-[#E8E8E4] dark:bg-white">
        <section>
          <h2 className="text-[16px] font-semibold text-[#1A1A1A]">Job Description</h2>
          <div className="mt-3"><TextBlock>{job.description || "No job description provided."}</TextBlock></div>
        </section>

        <section className="mt-8 border-t border-[#E5EBE6] pt-7">
          <h2 className="text-[16px] font-semibold text-[#1A1A1A]">Requirements</h2>
          <div className="mt-3"><TextBlock>{job.requirements || "No specific requirements provided."}</TextBlock></div>
        </section>

        <section className="mt-8 border-t border-[#E5EBE6] pt-7">
          <h2 className="text-[16px] font-semibold text-[#1A1A1A]">Skills</h2>
          {job.requiredSkills?.length > 0 ? (
            <ul className="mt-4 flex flex-wrap gap-2.5">
              {job.requiredSkills.map((skill) => <li key={skill} className="rounded-full border border-[#E8E8E4] bg-white px-3.5 py-2 text-[13px] font-medium text-[#FF6B2C]">{skill}</li>)}
            </ul>
          ) : <p className="mt-3 text-[13px] text-[#6B6B6B]">No specific skills listed.</p>}
        </section>

        <div className="mt-8 grid gap-4 border-t border-[#E5EBE6] pt-7 sm:grid-cols-3">
          <div><h2 className="text-[16px] font-semibold text-[#1A1A1A]">Salary</h2><p className="mt-2 text-[13px] text-[#6B6B6B]">{salary || "Not provided"}</p></div>
          <div><h2 className="text-[16px] font-semibold text-[#1A1A1A]">Location</h2><p className="mt-2 text-[13px] text-[#6B6B6B]">{job.location || "Not specified"}</p></div>
          <div><h2 className="text-[16px] font-semibold text-[#1A1A1A]">Job Type</h2><p className="mt-2 text-[13px] text-[#6B6B6B]">{jobType}</p></div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-[#E5EBE6] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-[13px] leading-5 text-[#6B6B6B]">You'll be asked for your details and a resume. Screening starts as soon as you submit.</p>
          <Button as={Link} to={applyTo} size="lg" className="w-full px-8 text-[14px] sm:w-auto">Apply Now <ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>
        </div>
      </Card>
    </div>
  );
}
