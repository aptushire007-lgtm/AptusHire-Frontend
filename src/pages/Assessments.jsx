import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ClipboardList, Clock3, RotateCcw } from "lucide-react";
import api from "../api/client.js";
import { accountAuthHeader } from "../auth/accountAuth.js";
import { Card, EmptyState, Skeleton } from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";

const STATUS = {
  not_started: { label: "Assigned", tone: "bg-[#EAF9E1] text-[#214740]" },
  in_progress: { label: "In progress", tone: "bg-[#EAF9E1] text-[#214740]" },
  completed: { label: "Completed", tone: "bg-[#EAF9E1] text-[#214740]" },
  submitted: { label: "Completed", tone: "bg-[#EAF9E1] text-[#214740]" },
  expired: { label: "Expired", tone: "bg-red-50 text-red-700" },
  cancelled: { label: "Cancelled", tone: "bg-[#F3F5F3] text-[#707E79]" },
};

function statusInfo(status) {
  return STATUS[String(status || "").toLowerCase()] || { label: status || "Assigned", tone: "bg-[#F3F5F3] text-[#707E79]" };
}

function dateTime(value) {
  if (!value) return "Date unavailable";
  return new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function AssessmentCard({ assessment }) {
  const info = statusInfo(assessment.status);
  const completed = ["completed", "submitted"].includes(String(assessment.status || "").toLowerCase());
  const active = assessment.status === "in_progress";
  const title = assessment.title || assessment.job?.title || "Assessment";
  const date = completed ? assessment.completedAt : assessment.startedAt || assessment.validFrom || assessment.createdAt;
  return (
    <Card className="border-[#DFE5DF] bg-white dark:border-[#DFE5DF] dark:bg-white">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${completed ? "bg-[#EAF9E1] text-[#214740]" : "bg-[#F3F5F3] text-[#707E79]"}`}><ClipboardList className="h-5 w-5" /></span><div className="min-w-0"><h3 className="truncate text-[15px] font-semibold text-[#2E2F2D]">{title}</h3><p className="mt-1 truncate text-xs text-[#707E79]">{assessment.job?.title || "AptusHire assessment"}</p></div></div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${info.tone}`}>{info.label}</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#707E79]"><span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4" />{dateTime(date)}</span>{assessment.progress && <span>{assessment.progress.completedSections} of {assessment.progress.totalSections} sections complete</span>}</div>
      {completed && <p className="mt-3 text-xs font-semibold text-[#2E2F2D]">Overall score: {assessment.overallScore == null ? "Not available" : `${assessment.overallScore}%`}</p>}
      {assessment.progress?.totalItems > 0 && <div className="mt-4"><div className="h-1.5 overflow-hidden rounded-full bg-[#EAF9E1]"><div className="h-full rounded-full bg-[#214740]" style={{ width: `${Math.min(100, Math.round((assessment.progress.answered / assessment.progress.totalItems) * 100))}%` }} /></div><p className="mt-1 text-[11px] text-[#707E79]">{assessment.progress.answered} of {assessment.progress.totalItems} answered</p></div>}
      <div className="mt-5 flex items-center justify-between border-t border-[#EDF1ED] pt-4">
        {completed ? <span className="text-xs text-[#707E79]">Results are reviewed by the hiring team.</span> : <span className="text-xs text-[#707E79]">{active ? "Continue where you left off." : "Use your invitation link to begin."}</span>}
        {completed && <Button as={Link} to={`/assessments/${assessment._id}/result`} size="sm" variant="outline">View Result <ArrowRight className="h-3.5 w-3.5" /></Button>}
        {active && <span className="text-xs font-semibold text-[#214740]">Continue from your invitation link</span>}
      </div>
    </Card>
  );
}

export default function Assessments() {
  const [assessments, setAssessments] = useState([]);
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");

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

  const groups = useMemo(() => ({
    available: assessments.filter((assessment) => ["not_started", "assigned", "pending"].includes(String(assessment.status || "").toLowerCase())),
    inProgress: assessments.filter((assessment) => assessment.status === "in_progress"),
    completed: assessments.filter((assessment) => ["completed", "submitted"].includes(String(assessment.status || "").toLowerCase())),
    past: assessments.filter((assessment) => ["expired", "cancelled"].includes(String(assessment.status || "").toLowerCase())),
  }), [assessments]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#707E79]">My progress</p><h1 className="mt-2 text-2xl font-bold text-[#2E2F2D]">Assessments</h1><p className="mt-2 text-sm text-[#707E79]">Review assigned assessments and track what you have completed.</p></div><Button type="button" variant="outline" size="sm" onClick={load}><RotateCcw className="h-3.5 w-3.5" /> Refresh</Button></div>
      {state === "loading" && <div className="grid gap-4 md:grid-cols-2">{[1, 2].map((item) => <Card key={item}><Skeleton className="h-5 w-2/3" /><Skeleton className="mt-3 h-4 w-1/3" /><Skeleton className="mt-6 h-10 w-full" /></Card>)}</div>}
      {state === "error" && <Card role="alert" className="border-red-200 bg-red-50"><p className="text-sm font-semibold text-red-700">{error}</p><Button size="sm" variant="outline" className="mt-4" onClick={load}>Try again</Button></Card>}
      {state === "ready" && assessments.length === 0 && <EmptyState icon={ClipboardList} title="No assessments yet" description="Assigned assessments will appear here when a hiring team sends one to you." action={<Button as={Link} to="/" size="sm">Find jobs</Button>} />}
      {state === "ready" && assessments.length > 0 && <div className="space-y-7"><AssessmentGroup title="Available / assigned" items={groups.available} /><AssessmentGroup title="In progress" items={groups.inProgress} /><AssessmentGroup title="Completed assessments" items={groups.completed} /><AssessmentGroup title="Past assessments" items={groups.past} /></div>}
    </div>
  );
}

function AssessmentGroup({ title, items }) {
  if (!items.length) return null;
  return <section><h2 className="mb-3 text-[16px] font-semibold text-[#2E2F2D]">{title}</h2><div className="grid gap-4 md:grid-cols-2">{items.map((assessment) => <AssessmentCard key={assessment._id} assessment={assessment} />)}</div></section>;
}
