import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ClipboardList, Clock3, RotateCcw, Search } from "lucide-react";
import api from "../api/client.js";
import { accountAuthHeader } from "../auth/accountAuth.js";
import { clearAuth as clearAssessmentAuth, saveAuth as saveAssessmentAuth } from "../portal/assessmentAuth.js";
import { Card, EmptyState, Skeleton } from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";

const STATUS = {
  scheduled: { label: "Invited", tone: "bg-[#FFE8DC] text-[#FF6B2C]" },
  not_started: { label: "Assigned", tone: "bg-[#FFE8DC] text-[#FF6B2C]" },
  in_progress: { label: "In progress", tone: "bg-[#FFE8DC] text-[#FF6B2C]" },
  completed: { label: "Completed", tone: "bg-[#FFE8DC] text-[#FF6B2C]" },
  submitted: { label: "Completed", tone: "bg-[#FFE8DC] text-[#FF6B2C]" },
  expired: { label: "Expired", tone: "bg-red-50 text-red-700" },
  cancelled: { label: "Cancelled", tone: "bg-[#F3F5F3] text-[#6B6B6B]" },
};

function statusInfo(status) {
  return STATUS[String(status || "").toLowerCase()] || { label: status || "Assigned", tone: "bg-[#F3F5F3] text-[#6B6B6B]" };
}

function dateTime(value) {
  if (!value) return "Date unavailable";
  return new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function AssessmentCard({ assessment, onOpen, opening }) {
  const info = statusInfo(assessment.status);
  const completed = ["completed", "submitted"].includes(String(assessment.status || "").toLowerCase());
  const active = ["in_progress", "paused"].includes(String(assessment.status || "").toLowerCase());
  const title = assessment.title || assessment.job?.title || "Assessment";
  const date = completed ? assessment.completedAt : assessment.validFrom || assessment.startedAt || assessment.createdAt;
  return (
    <Card className="border-[#E8E8E4] bg-white dark:border-[#E8E8E4] dark:bg-white">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${completed ? "bg-[#FFE8DC] text-[#FF6B2C]" : "bg-[#F3F5F3] text-[#6B6B6B]"}`}><ClipboardList className="h-5 w-5" /></span><div className="min-w-0"><h3 className="truncate text-[15px] font-semibold text-[#1A1A1A]">{title}</h3><p className="mt-1 truncate text-xs text-[#6B6B6B]">{assessment.job?.company?.name || "Company"} · {assessment.job?.title || "AptusHire assessment"}</p></div></div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${info.tone}`}>{info.label}</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#6B6B6B]"><span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4" />Invited {dateTime(date)}</span>{assessment.expiresAt && <span>Deadline {dateTime(assessment.expiresAt)}</span>}{assessment.progress && <span>{assessment.progress.completedSections} of {assessment.progress.totalSections} sections complete</span>}</div>
      {completed && <p className="mt-3 text-xs font-semibold text-[#1A1A1A]">Overall score: {assessment.overallScore == null ? "Not available" : `${assessment.overallScore}%`}</p>}
      {assessment.progress?.totalItems > 0 && <div className="mt-4"><div className="h-1.5 overflow-hidden rounded-full bg-[#FFE8DC]"><div className="h-full rounded-full bg-[#FF6B2C]" style={{ width: `${Math.min(100, Math.round((assessment.progress.answered / assessment.progress.totalItems) * 100))}%` }} /></div><p className="mt-1 text-[11px] text-[#6B6B6B]">{assessment.progress.answered} of {assessment.progress.totalItems} answered</p></div>}
      <div className="mt-5 flex items-center justify-between border-t border-[#E8E8E4] pt-4">
        {completed ? <span className="text-xs text-[#6B6B6B]">Results are reviewed by the hiring team.</span> : <span className="text-xs text-[#6B6B6B]">{active ? "Continue where you left off." : "Use your invitation link to begin."}</span>}
        {completed && <Button as={Link} to={`/assessments/${assessment._id}/result`} size="sm" variant="outline">View Result <ArrowRight className="h-3.5 w-3.5" /></Button>}
        {!completed && <Button type="button" size="sm" variant="outline" loading={opening} onClick={() => onOpen(assessment)}>{active ? "Resume" : "Start"} <ArrowRight className="h-3.5 w-3.5" /></Button>}
      </div>
    </Card>
  );
}

export default function Assessments() {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState([]);
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");
  const [openingId, setOpeningId] = useState(null);
  const [query, setQuery] = useState("");

  function load() {
    setState("loading");
    setError("");
    api.get("/candidate-dashboard", { headers: accountAuthHeader() }).then((response) => {
      const sessions = response.data.assessments || [];
      setAssessments(sessions);
      setState("ready");
    }).catch((err) => {
      setError(err?.response?.data?.error || "We could not load your assessments. Please try again.");
      setState("error");
    });
  }

  useEffect(() => { load(); }, []);

  async function openAssessment(assessment) {
    setOpeningId(assessment._id);
    setError("");
    try {
      const { data } = await api.post(`/candidate-dashboard/sessions/assessment/${assessment._id}/open`, {}, { headers: accountAuthHeader() });
      clearAssessmentAuth();
      saveAssessmentAuth({ jwt: data.token, jobTitle: data.session?.jobTitle, candidateName: data.session?.candidateName });
      navigate("/assessment-portal/hub");
    } catch (err) {
      setError(err?.response?.data?.error || "We could not open this assessment. Please try again.");
    } finally {
      setOpeningId(null);
    }
  }

  const groups = useMemo(() => ({
    available: assessments.filter((assessment) => ["scheduled", "not_started", "assigned", "pending"].includes(String(assessment.status || "").toLowerCase())),
    inProgress: assessments.filter((assessment) => ["in_progress", "paused"].includes(String(assessment.status || "").toLowerCase())),
    completed: assessments.filter((assessment) => ["completed", "submitted"].includes(String(assessment.status || "").toLowerCase())),
    past: assessments.filter((assessment) => ["expired", "cancelled"].includes(String(assessment.status || "").toLowerCase())),
  }), [assessments]);

  const filteredAssessments = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return assessments;
    return assessments.filter((assessment) => `${assessment.job?.company?.name || ""} ${assessment.job?.title || ""} ${assessment.title || ""} ${statusInfo(assessment.status).label}`.toLowerCase().includes(value));
  }, [assessments, query]);

  return (
    <div className="min-h-[calc(100vh-7rem)] w-full space-y-6 pb-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6B6B6B]">My progress</p><h1 className="mt-2 text-2xl font-bold text-[#1A1A1A]">Assessments</h1><p className="mt-2 text-sm text-[#6B6B6B]">Review assigned assessments and track what you have completed.</p></div><div className="flex flex-wrap items-center gap-2"><label className="flex min-h-10 items-center gap-2 rounded-full border border-[#E0E5E2] bg-white px-3.5 text-sm text-[#77807D] shadow-[0_2px_6px_rgba(33,71,64,.06)] focus-within:border-[#A7D68E]"><Search className="h-4 w-4" /><span className="sr-only">Search assessments</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" className="w-28 border-0 bg-transparent p-0 text-sm outline-none placeholder:text-[#77807D] focus:ring-0 sm:w-36" /></label><Button type="button" variant="outline" size="sm" onClick={load}><RotateCcw className="h-3.5 w-3.5" /> Refresh</Button></div></div>
      {state === "loading" && <div className="grid gap-4 md:grid-cols-2">{[1, 2].map((item) => <Card key={item}><Skeleton className="h-5 w-2/3" /><Skeleton className="mt-3 h-4 w-1/3" /><Skeleton className="mt-6 h-10 w-full" /></Card>)}</div>}
      {state === "error" && <Card role="alert" className="border-red-200 bg-red-50"><p className="text-sm font-semibold text-red-700">{error}</p><Button size="sm" variant="outline" className="mt-4" onClick={load}>Try again</Button></Card>}
      {state === "ready" && assessments.length === 0 && <EmptyState icon={ClipboardList} title="No assessments yet" description="Assigned assessments will appear here when a hiring team sends one to you." action={<Button as={Link} to="/" size="sm">Find jobs</Button>} />}
      {state === "ready" && assessments.length > 0 && filteredAssessments.length === 0 && <Card><p className="text-sm text-[#6B6B6B]">No assessments match &quot;{query}&quot;.</p></Card>}
      {state === "ready" && filteredAssessments.length > 0 && <div className="min-h-[calc(100vh-16rem)] w-full rounded-[16px] border border-[#E8E8E4] bg-white shadow-[0_5px_18px_rgba(33,71,64,.05)]"><table className="w-full table-fixed border-collapse text-left"><thead className="bg-[#FBFCFB]"><tr className="text-[11px] font-bold text-[#14233A]"><th className="w-[18%] px-3 py-3 sm:px-4">Company</th><th className="w-[24%] px-3 py-3 sm:px-4">Assessment</th><th className="w-[15%] px-3 py-3 sm:px-4">Type</th><th className="w-[19%] px-3 py-3 sm:px-4">Invitation date</th><th className="w-[13%] px-3 py-3 sm:px-4">Score / Status</th><th className="w-[11%] px-3 py-3 text-right sm:px-4">Action</th></tr></thead><tbody>{filteredAssessments.map((assessment) => <AssessmentRow key={assessment._id} assessment={assessment} onOpen={openAssessment} opening={openingId === assessment._id} />)}</tbody></table></div>}
    </div>
  );
}

function AssessmentGroup({ title, items, onOpen, openingId }) {
  if (!items.length) return null;
  return <section><h2 className="mb-3 text-[16px] font-semibold text-[#1A1A1A]">{title}</h2><div className="grid gap-4 md:grid-cols-2">{items.map((assessment) => <AssessmentCard key={assessment._id} assessment={assessment} onOpen={onOpen} opening={openingId === assessment._id} />)}</div></section>;
}

function AssessmentRow({ assessment, onOpen, opening }) {
  const info = statusInfo(assessment.status);
  const completed = ["completed", "submitted"].includes(String(assessment.status || "").toLowerCase());
  const active = ["in_progress", "paused"].includes(String(assessment.status || "").toLowerCase());
  const date = completed ? assessment.completedAt : assessment.validFrom || assessment.startedAt || assessment.createdAt;
  return <tr className="border-t border-[#E8E8E4] text-sm text-[#1A1A1A] hover:bg-[#FBFCFB]"><td className="break-words px-3 py-4 font-semibold sm:px-4">{assessment.job?.company?.name || "Company"}</td><td className="break-words px-3 py-4 sm:px-4"><p className="break-words font-medium">{assessment.title || assessment.job?.title || "Assessment"}</p><p className="mt-1 break-words text-xs text-[#6B6B6B]">{assessment.job?.title || "Related job"}</p></td><td className="break-words px-3 py-4 sm:px-4"><span className="rounded-md bg-[#EEF0FF] px-2 py-1 text-[11px] font-semibold text-[#5A62D6]">Skills assessment</span></td><td className="break-words px-3 py-4 text-xs text-[#6B6B6B] sm:px-4">{dateTime(date)}{assessment.expiresAt && <span className="mt-1 block">Due {dateTime(assessment.expiresAt)}</span>}</td><td className="break-words px-3 py-4 sm:px-4"><span className={`inline-flex whitespace-nowrap items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold ${info.tone}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{info.label}</span>{assessment.progress?.totalItems > 0 && <span className="mt-1 block text-[11px] text-[#6B6B6B]">{assessment.progress.answered}/{assessment.progress.totalItems} answered</span>}</td><td className="break-words px-3 py-4 text-right sm:px-4">{completed ? <Button as={Link} to={`/assessments/${assessment._id}/result`} size="sm" variant="outline">View result <ArrowRight className="h-3.5 w-3.5" /></Button> : <Button type="button" size="sm" variant="orange" loading={opening} onClick={() => onOpen(assessment)}>{active ? "Resume" : "Start"} <ArrowRight className="h-3.5 w-3.5" /></Button>}</td></tr>;
}
