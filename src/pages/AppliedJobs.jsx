import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, Check, CircleAlert, MoreVertical, Search, X } from "lucide-react";
import api from "../api/client.js";
import { accountAuthHeader } from "../auth/accountAuth.js";
import { Card, EmptyState, Skeleton } from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import { stageLabel } from "../lib/pipeline.js";

const TRACK_STAGES = [
  { key: "applied", label: "Applied" },
  { key: "screening", label: "Screening" },
  { key: "interview", label: "Interview" },
  { key: "decision", label: "Decision" },
];

function normalizedStatus(status) {
  return String(status || "").toLowerCase().replace(/\s+/g, "_");
}

function stageGroup(status) {
  const value = normalizedStatus(status);
  if (value === "rejected") return "rejected";
  if (["selected", "offer_sent", "offer_accepted", "joined"].includes(value)) return "decision";
  if (["shortlisted", "under_review", "ai_interview_completed", "interview_scheduled", "hr_interview", "technical_interview", "manager_interview", "interview_queue", "next_round"].includes(value)) return value === "shortlisted" || value === "under_review" ? "decision" : "interview";
  if (["ats_passed", "assessment_scheduled", "assessment_completed", "screening", "in_screening"].includes(value)) return "screening";
  return "applied";
}

function dateLabel(value) {
  if (!value) return "Date unavailable";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function progressIndex(status) {
  const group = stageGroup(status);
  if (group === "rejected") return -1;
  return TRACK_STAGES.findIndex((stage) => stage.key === group);
}

function ProgressTracker({ status }) {
  const current = progressIndex(status);
  const rejected = stageGroup(status) === "rejected";
  return (
    <div className="mt-5" aria-label={`Application progress: ${stageLabel(status)}`}>
      <div className="flex items-center">
        {TRACK_STAGES.map((stage, index) => {
          const complete = !rejected && current >= index;
          const active = !rejected && current === index;
          return (
            <div key={stage.key} className="flex min-w-0 flex-1 items-center">
              <div className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold ${complete ? "border-[#214740] bg-[#214740] text-white" : "border-[#C9D8CA] bg-white text-[#707E79]"}`}>
                {complete ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : index + 1}
                {active && <span className="absolute -inset-1 rounded-full border border-[#C1EBAD]" aria-hidden="true" />}
              </div>
              {index < TRACK_STAGES.length - 1 && <div className={`h-0.5 min-w-3 flex-1 ${!rejected && current > index ? "bg-[#214740]" : "bg-[#DFE5DF]"}`} />}
            </div>
          );
        })}
      </div>
      <div className="mt-2 grid grid-cols-4 text-[11px] font-medium text-[#707E79]">
        {TRACK_STAGES.map((stage, index) => <span key={stage.key} className={index === current ? "font-bold text-[#214740]" : ""}>{stage.label}</span>)}
      </div>
      {rejected && <p className="mt-2 text-xs font-semibold text-[#B6423A]">This application was rejected.</p>}
    </div>
  );
}

const TIMELINE_STAGE_MAP = {
  submitted: ["applied"],
  screening: ["ats_passed"],
  assessment: ["assessment_completed"],
  recruiter: ["under_review"],
  interview: ["interview_scheduled", "ai_interview_completed", "hr_interview", "technical_interview", "manager_interview"],
  decision: ["selected", "offer_sent", "offer_accepted", "joined", "rejected"],
};

function dateTimeLabel(value) {
  if (!value) return "Pending";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function ApplicationTimeline({ status, stageHistory = [] }) {
  const history = [...stageHistory].sort((a, b) => new Date(a.at || 0) - new Date(b.at || 0));
  const findEvent = (keys) => history.find((entry) => keys.includes(normalizedStatus(entry.stage)));
  const assessment = findEvent(TIMELINE_STAGE_MAP.assessment);
  const interview = findEvent(TIMELINE_STAGE_MAP.interview);
  const events = [
    { key: "submitted", label: "Application submitted", entry: findEvent(TIMELINE_STAGE_MAP.submitted) },
    { key: "screening", label: "Resume screening", entry: findEvent(TIMELINE_STAGE_MAP.screening) },
    ...(assessment ? [{ key: "assessment", label: "Assessment completed", entry: assessment }] : []),
    { key: "recruiter", label: "Recruiter review", entry: findEvent(TIMELINE_STAGE_MAP.recruiter) },
    { key: "interview", label: "Interview", entry: interview },
    { key: "decision", label: "Final decision", entry: findEvent(TIMELINE_STAGE_MAP.decision) },
  ];
  const current = normalizedStatus(status);
  const currentEntry = history[history.length - 1];
  const currentKey = events.find((event) => event.entry && event.entry.stage === currentEntry?.stage)?.key;
  const currentDecision = ["selected", "offer_sent", "offer_accepted", "joined", "rejected"].includes(current);

  return (
    <div className="mt-7 border-t border-[#DFE5DF] pt-6">
      <h3 className="text-[15px] font-semibold text-[#2E2F2D]">Application timeline</h3>
      <ol className="mt-4 space-y-0">
        {events.map((event, index) => {
          const completed = Boolean(event.entry);
          const active = event.key === currentKey || (event.key === "decision" && currentDecision);
          const pending = !completed && !active;
          return (
            <li key={event.key} className="relative flex gap-3 pb-5 last:pb-0">
              {index < events.length - 1 && <span className={`absolute left-[9px] top-5 h-full w-px ${completed ? "bg-[#214740]" : "bg-[#DFE5DF]"}`} aria-hidden="true" />}
              <span className={`relative z-10 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${completed ? "border-[#214740] bg-[#214740] text-white" : active ? "border-[#214740] bg-[#EAF9E1] text-[#214740]" : "border-[#C9D8CA] bg-white text-[#707E79]"}`}>
                {completed ? <Check className="h-3 w-3" aria-hidden="true" /> : active ? "●" : "○"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className={`text-[13px] font-semibold ${pending ? "text-[#707E79]" : "text-[#2E2F2D]"}`}>{event.label}</p>
                  <span className="text-[11px] text-[#707E79]">{dateTimeLabel(event.entry?.at)}</span>
                </div>
                <p className={`mt-0.5 text-[11px] ${active ? "font-semibold text-[#214740]" : "text-[#707E79]"}`}>
                  {completed ? (active ? "In progress" : "Completed") : active ? "In progress" : "Pending"}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function ApplicationDetails({ application, loading, error, onClose }) {
  const { job, status, createdAt, resumeOriginalName, stageHistory = [], offer } = application;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#214740]/45 p-4" role="presentation" onMouseDown={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="application-details-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#DFE5DF] bg-white p-6 shadow-xl sm:p-8" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#707E79]">Application details</p>
            <h2 id="application-details-title" className="mt-1 text-xl font-bold text-[#2E2F2D]">{job?.title || "Application"}</h2>
            <p className="mt-1 text-sm text-[#707E79]">{job?.company?.name || "Company unavailable"}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close application details" className="tap-target inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#707E79] hover:bg-[#EAF9E1] hover:text-[#214740]"><X className="h-5 w-5" /></button>
        </div>
        {loading && <p className="mt-6 rounded-xl bg-[#FBFBFD] p-4 text-sm text-[#707E79]">Loading your application details...</p>}
        {error && <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>}
        <div className="mt-6 grid gap-4 border-y border-[#DFE5DF] py-4 sm:grid-cols-3">
          <div><p className="text-[11px] font-medium uppercase text-[#707E79]">Status</p><p className="mt-1 text-sm font-semibold text-[#214740]">{stageLabel(status)}</p></div>
          <div><p className="text-[11px] font-medium uppercase text-[#707E79]">Applied</p><p className="mt-1 text-sm font-semibold text-[#2E2F2D]">{dateLabel(createdAt)}</p></div>
          <div><p className="text-[11px] font-medium uppercase text-[#707E79]">Resume</p><p className="mt-1 break-words text-sm font-semibold text-[#2E2F2D]">{resumeOriginalName || "Resume on file"}</p></div>
        </div>
        <ProgressTracker status={status} />
        <ApplicationTimeline status={status} stageHistory={stageHistory} />
        {application.basicDetails && <div className="mt-7"><h3 className="text-[15px] font-semibold text-[#2E2F2D]">Submitted information</h3><div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">{Object.entries(application.basicDetails).filter(([, value]) => value).map(([key, value]) => <div key={key}><p className="text-[11px] font-medium uppercase text-[#707E79]">{key.replace(/([A-Z])/g, " $1")}</p><p className="mt-1 break-words text-[#2E2F2D]">{value}</p></div>)}</div></div>}
        {application.education?.length > 0 && <div className="mt-7"><h3 className="text-[15px] font-semibold text-[#2E2F2D]">Education</h3><div className="mt-3 space-y-2">{application.education.map((entry, index) => <div key={entry._id || index} className="rounded-xl bg-[#FBFBFD] p-3 text-sm"><p className="font-semibold text-[#2E2F2D]">{entry.degree}{entry.fieldOfStudy ? `, ${entry.fieldOfStudy}` : ""}</p><p className="mt-1 text-[#707E79]">{entry.institution}{entry.endYear ? ` · ${entry.endYear}` : ""}</p></div>)}</div></div>}
        {application.skills?.length > 0 && <div className="mt-7"><h3 className="text-[15px] font-semibold text-[#2E2F2D]">Skills</h3><div className="mt-3 flex flex-wrap gap-2">{application.skills.map((skill) => <span key={skill} className="rounded-full bg-[#EAF9E1] px-3 py-1 text-xs font-semibold text-[#214740]">{skill}</span>)}</div></div>}
        {application.experience?.length > 0 && <div className="mt-7"><h3 className="text-[15px] font-semibold text-[#2E2F2D]">Experience</h3><div className="mt-3 space-y-2">{application.experience.map((entry, index) => <div key={entry._id || index} className="rounded-xl bg-[#FBFBFD] p-3 text-sm"><p className="font-semibold text-[#2E2F2D]">{entry.role} · {entry.company}</p><p className="mt-1 text-[#707E79]">{entry.startDate || ""}{entry.endDate ? ` - ${entry.endDate}` : ""}</p>{entry.description && <p className="mt-2 whitespace-pre-line text-[#707E79]">{entry.description}</p>}</div>)}</div></div>}
        {stageHistory.length > 0 && <div className="mt-7"><h3 className="text-[15px] font-semibold text-[#2E2F2D]">Status history</h3><div className="mt-3 space-y-2">{stageHistory.map((entry, index) => <div key={`${entry.stage}-${entry.at || index}`} className="flex items-center justify-between gap-3 rounded-xl bg-[#FBFBFD] px-3 py-2 text-xs"><span className="font-semibold text-[#2E2F2D]">{stageLabel(entry.stage)}</span><span className="text-[#707E79]">{dateLabel(entry.at)}</span></div>)}</div></div>}
        {offer?.status && <p className="mt-6 rounded-xl bg-[#EAF9E1] p-3 text-sm font-semibold text-[#214740]">Offer status: {offer.status}</p>}
        <div className="mt-7 flex flex-wrap justify-end gap-3">{status === "rejected" && <Button as={Link} to={`/applied-jobs/${application._id}/improvement-plan`} variant="outline" size="sm">View improvement plan</Button>}<Button as={Link} to={`/jobs/${job?.slug || job?._id}`} variant="outline" size="sm">View job</Button><Button type="button" size="sm" onClick={onClose}>Close</Button></div>
      </section>
    </div>
  );
}

function ApplicationRow({ application, onView }) {
  const { job, status, createdAt } = application;
  const companyName = job?.company?.name || "Company unavailable";
  const location = job?.location || job?.department || "Location unavailable";
  return (
    <tr className="group border-t border-[#EDF1ED] text-[13px] text-[#596660] transition-colors hover:bg-[#FBFCFB]">
      <td className="border-l-2 border-transparent px-3 py-3.5 group-hover:border-[#F59E0B] sm:px-4">
        <button type="button" onClick={() => onView(application)} className="flex min-w-0 items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A7D68E]">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-[#F0F2F4] text-[#263A36] font-bold">{companyName.charAt(0).toUpperCase()}</span>
          <span className="min-w-0 font-semibold text-[#14233A] group-hover:text-[#214740]">{companyName}</span>
        </button>
      </td>
      <td className="max-w-[240px] px-3 py-3.5 sm:px-4"><button type="button" onClick={() => onView(application)} className="block max-w-full truncate text-left font-medium text-[#14233A] hover:text-[#214740] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A7D68E]">{job?.title || "Application"}</button><span className="mt-1 block truncate text-[11px] text-[#77807D]">{location}</span></td>
      <td className="px-3 py-3.5 sm:px-4"><span className="rounded-md bg-[#EEF0FF] px-2 py-1 text-[11px] font-semibold text-[#5A62D6]">Auto-applied</span></td>
      <td className="whitespace-nowrap px-3 py-3.5 sm:px-4">{dateLabel(createdAt)}</td>
      <td className="px-3 py-3.5 sm:px-4"><span className={`inline-flex whitespace-nowrap items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${stageGroup(status) === "rejected" ? "bg-red-50 text-red-700" : stageGroup(status) === "decision" ? "bg-[#EAF9E1] text-[#17804B]" : "bg-[#F0F2F5] text-[#596660]"}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{stageLabel(status)}</span></td>
      <td className="px-2 py-3.5 text-right"><button type="button" onClick={() => onView(application)} aria-label={`View details for ${job?.title || "application"}`} className="tap-target inline-flex items-center justify-center rounded-lg text-[#77807D] hover:bg-[#EAF9E1] hover:text-[#214740] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A7D68E]"><MoreVertical className="h-4 w-4" /></button></td>
    </tr>
  );
}

export default function AppliedJobs() {
  const [applications, setApplications] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    api.get("/candidate-dashboard", { headers: accountAuthHeader() }).then((response) => {
      setApplications(response.data.appliedJobs || []);
      setState("ready");
    }).catch((err) => {
      setError(err?.response?.data?.error || "We could not load your applications. Please try again.");
      setState("error");
    });
  }, []);

  const sortedApplications = useMemo(() => [...applications].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)), [applications]);

  async function viewApplication(application) {
    setSelected(application);
    setDetailError("");
    setDetailLoading(true);
    try {
      const response = await api.get(`/candidate-dashboard/applications/${application._id}`, { headers: accountAuthHeader() });
      setSelected(response.data);
    } catch (err) {
      setDetailError(err?.response?.data?.error || "We could not load the latest application details.");
    } finally {
      setDetailLoading(false);
    }
  }

  const filteredApplications = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return sortedApplications;
    return sortedApplications.filter((application) => `${application.job?.title || ""} ${application.job?.company?.name || ""} ${stageLabel(application.status)}`.toLowerCase().includes(value));
  }, [query, sortedApplications]);

  return (
    <div className="mx-auto max-w-[1120px] space-y-5 pb-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#707E79]">Your activity</p><h1 className="mt-2 text-2xl font-bold text-[#2E2F2D]">Applied Jobs</h1><p className="mt-2 text-sm text-[#707E79]">A list of the jobs you've applied to</p></div><label className="flex min-h-11 items-center gap-2 rounded-full border border-[#E0E5E2] bg-white px-4 text-sm text-[#77807D] shadow-[0_2px_6px_rgba(33,71,64,.06)] focus-within:border-[#A7D68E] focus-within:ring-2 focus-within:ring-[#EAF9E1]"><Search className="h-4 w-4" /><span className="sr-only">Search applications</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" className="w-32 border-0 bg-transparent p-0 text-sm outline-none placeholder:text-[#77807D] focus:ring-0 sm:w-40" /></label></div>
      {state === "loading" && <div className="grid gap-4 md:grid-cols-2">{[1, 2, 3, 4].map((item) => <Card key={item}><Skeleton className="h-5 w-2/3" /><Skeleton className="mt-3 h-4 w-1/3" /><Skeleton className="mt-6 h-12 w-full" /><Skeleton className="mt-5 h-10 w-32" /></Card>)}</div>}
      {state === "error" && <Card role="alert" className="border-red-200 bg-red-50"><div className="flex items-start gap-3"><CircleAlert className="h-5 w-5 shrink-0 text-red-600" /><div><p className="text-sm font-semibold text-red-700">{error}</p><Button size="sm" variant="outline" className="mt-4" onClick={() => window.location.reload()}>Try again</Button></div></div></Card>}
      {state === "ready" && applications.length === 0 && <EmptyState icon={Briefcase} title="No applications yet" description="When you apply for a role, its progress will appear here." action={<Button as={Link} to="/" size="sm">Find jobs</Button>} />}
      {state === "ready" && sortedApplications.length > 0 && <><p className="text-[13px] text-[#707E79]"><span className="font-semibold text-[#2E2F2D]">{filteredApplications.length}</span> {filteredApplications.length === 1 ? "application" : "applications"}</p>{filteredApplications.length > 0 ? <div className="overflow-x-auto rounded-[16px] border border-[#DFE5DF] bg-white shadow-[0_5px_18px_rgba(33,71,64,.05)]"><table className="w-full min-w-[760px] border-collapse text-left"><thead className="bg-[#FBFCFB]"><tr className="text-[11px] font-bold text-[#14233A]"><th className="px-3 py-3 sm:px-4">Company</th><th className="px-3 py-3 sm:px-4">Job title</th><th className="px-3 py-3 sm:px-4">Type</th><th className="px-3 py-3 sm:px-4">Date Applied</th><th className="px-3 py-3 sm:px-4">Status</th><th className="px-2 py-3"><span className="sr-only">Actions</span></th></tr></thead><tbody>{filteredApplications.map((application) => <ApplicationRow key={application._id} application={application} onView={viewApplication} />)}</tbody></table></div> : <Card><p className="text-sm text-[#707E79]">No applications match &quot;{query}&quot;.</p></Card>}</>}
      {selected && <ApplicationDetails application={selected} loading={detailLoading} error={detailError} onClose={() => setSelected(null)} />}
    </div>
  );
}
