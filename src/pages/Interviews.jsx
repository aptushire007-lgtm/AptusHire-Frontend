import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, CalendarDays, CircleAlert, Clock3, PlayCircle, RotateCcw, Video } from "lucide-react";
import api from "../api/client.js";
import { accountAuthHeader } from "../auth/accountAuth.js";
import { saveAuth, clearAuth } from "../portal/portalAuth.js";
import { Card, EmptyState, Skeleton } from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";

function dateTime(value) {
  if (!value) return "Date unavailable";
  return new Date(value).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function InterviewCard({ interview, company, upcoming, opening, onOpen }) {
  const title = interview.job?.title || "Interview";
  const type = interview.aiInterview ? "AI interview" : "Interview";
  const status = interview.status === "in_progress" ? "In progress" : upcoming ? "Scheduled" : interview.status === "completed" ? "Completed" : interview.status || "Unavailable";
  return (
    <Card className="border-[#DFE5DF] bg-white dark:border-[#DFE5DF] dark:bg-white">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${upcoming ? "bg-[#EAF9E1] text-[#214740]" : "bg-[#F3F5F3] text-[#707E79]"}`}><Video className="h-5 w-5" /></span><div className="min-w-0"><h3 className="truncate text-[15px] font-semibold text-[#2E2F2D]">{title}</h3><p className="mt-1 truncate text-xs text-[#707E79]">{company || "Company unavailable"}</p></div></div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${upcoming ? "bg-[#EAF9E1] text-[#214740]" : "bg-[#F3F5F3] text-[#707E79]"}`}>{status}</span>
      </div>
      <div className="mt-4 grid gap-2 text-xs text-[#707E79] sm:grid-cols-2"><span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />{dateTime(interview.interviewAt)}</span><span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4" />{type}</span></div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#EDF1ED] pt-4"><span className="text-xs text-[#707E79]">{upcoming ? "Use your secure invitation to join." : "Your interview responses were recorded."}</span>{upcoming && <Button type="button" size="sm" loading={opening} onClick={() => onOpen(interview)}><PlayCircle className="h-3.5 w-3.5" /> Join interview</Button>}</div>
    </Card>
  );
}

export default function Interviews() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");
  const [openingId, setOpeningId] = useState(null);

  async function load() {
    setState("loading");
    setError("");
    try {
      const response = await api.get("/candidate-dashboard", { headers: accountAuthHeader() });
      setData(response.data);
      setState("ready");
    } catch (err) {
      setError(err?.response?.data?.error || "We could not load your interviews. Please try again.");
      setState("error");
    }
  }

  useEffect(() => { load(); }, []);

  const applications = useMemo(() => new Map((data?.appliedJobs || []).map((application) => [String(application._id), application])), [data]);
  const upcoming = data?.upcomingInterviews || [];
  const completed = (data?.aiInterviewHistory || []).filter((interview) => interview.status === "completed");

  async function openInterview(interview) {
    setOpeningId(String(interview._id));
    setError("");
    try {
      const response = await api.post(`/candidate-dashboard/sessions/interview/${interview._id}/open`, {}, { headers: accountAuthHeader() });
      clearAuth();
      saveAuth({ jwt: response.data.token, jobTitle: response.data.session?.jobTitle, candidateName: response.data.session?.candidateName });
      navigate("/portal/dashboard");
    } catch (err) {
      setError(err?.response?.data?.error || "We could not open this interview. Please try again.");
      await load();
    } finally {
      setOpeningId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#707E79]">My progress</p><h1 className="mt-2 text-2xl font-bold text-[#2E2F2D]">Interviews</h1><p className="mt-2 text-sm text-[#707E79]">Keep track of scheduled and completed interviews.</p></div><Button type="button" variant="outline" size="sm" onClick={load}><RotateCcw className="h-3.5 w-3.5" /> Refresh</Button></div>
      {state === "loading" && <div className="grid gap-4 md:grid-cols-2">{[1, 2].map((item) => <Card key={item}><Skeleton className="h-5 w-2/3" /><Skeleton className="mt-3 h-4 w-1/3" /><Skeleton className="mt-6 h-10 w-full" /></Card>)}</div>}
      {state === "error" && <Card role="alert" className="border-red-200 bg-red-50"><div className="flex items-start gap-2"><CircleAlert className="h-5 w-5 text-red-600" /><p className="text-sm font-semibold text-red-700">{error}</p></div><Button size="sm" variant="outline" className="mt-4" onClick={load}>Try again</Button></Card>}
      {state === "ready" && upcoming.length === 0 && completed.length === 0 && <EmptyState icon={Video} title="No interviews yet" description="Scheduled interviews will appear here when a hiring team invites you." action={<Button as={Link} to="/" size="sm">Find jobs</Button>} />}
      {state === "ready" && (upcoming.length > 0 || completed.length > 0) && <div className="space-y-7">{error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">{error}</p>}{upcoming.length > 0 && <section><h2 className="mb-3 text-[16px] font-semibold text-[#2E2F2D]">Upcoming interviews</h2><div className="grid gap-4 md:grid-cols-2">{upcoming.map((interview) => <InterviewCard key={interview._id} interview={interview} company={applications.get(String(interview.candidate))?.job?.company?.name} upcoming opening={openingId === String(interview._id)} onOpen={openInterview} />)}</div></section>}{completed.length > 0 && <section><h2 className="mb-3 text-[16px] font-semibold text-[#2E2F2D]">Completed interviews</h2><div className="grid gap-4 md:grid-cols-2">{completed.map((interview) => <InterviewCard key={interview._id} interview={interview} company={applications.get(String(interview.candidate))?.job?.company?.name} upcoming={false} />)}</div></section>}</div>}
    </div>
  );
}
