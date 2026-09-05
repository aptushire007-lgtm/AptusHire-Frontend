import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CircleAlert, Lightbulb, Loader2, Target } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import api from "../api/client.js";
import { accountAuthHeader } from "../auth/accountAuth.js";
import { Card } from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import { stageLabel } from "../lib/pipeline.js";

function scoreFromAssessment(item) {
  if (Number.isFinite(Number(item.score))) return Number(item.score);
  const correct = Number(item.correctCount);
  const total = Number(item.itemCount);
  if (Number.isFinite(correct) && Number.isFinite(total) && total > 0) return Math.round((correct / total) * 100);
  return null;
}

function ImprovementArea({ item }) {
  return (
    <Card className="border-[#E5EBE7] bg-white dark:border-[#E5EBE7] dark:bg-white">
      <div className="flex items-start justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E8F2EC] text-[#176B45]"><Target className="h-5 w-5" /></span><h2 className="truncate text-[15px] font-semibold text-[#17221C]">{item.label}</h2></div>{item.current != null && <span className="shrink-0 text-lg font-bold text-[#176B45]">{item.current}%</span>}</div>
      <dl className="mt-5 grid gap-4 border-t border-[#E5EBE7] pt-4 sm:grid-cols-2"><div><dt className="text-[11px] font-medium uppercase text-[#64736A]">Current level</dt><dd className="mt-1 text-sm font-semibold text-[#17221C]">{item.current == null ? "Not available" : `${item.current}%`}</dd></div><div><dt className="text-[11px] font-medium uppercase text-[#64736A]">Target level</dt><dd className="mt-1 text-sm font-semibold text-[#64736A]">{item.target == null ? "Not provided" : `${item.target}%`}</dd></div><div><dt className="text-[11px] font-medium uppercase text-[#64736A]">Why it matters</dt><dd className="mt-1 text-sm text-[#64736A]">{item.why || "No rationale is stored for this improvement area."}</dd></div><div><dt className="text-[11px] font-medium uppercase text-[#64736A]">Recommended action</dt><dd className="mt-1 text-sm text-[#64736A]">{item.action || "No recommendation is available yet."}</dd></div></dl>
      <Button type="button" size="sm" variant="outline" disabled={!item.action} className="mt-5">{item.action || "Action unavailable"}</Button>
    </Card>
  );
}

export default function ImprovementPlan() {
  const { id } = useParams();
  const [application, setApplication] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [report, setReport] = useState(null);
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const dashboardResponse = await api.get("/candidate-dashboard", { headers: accountAuthHeader() });
        if (cancelled) return;
        const nextApplication = (dashboardResponse.data.appliedJobs || []).find((item) => String(item._id) === String(id));
        if (!nextApplication) throw new Error("We could not find this application.");
        if (nextApplication.status !== "rejected") throw new Error("This improvement plan is only available for rejected applications.");
        setApplication(nextApplication);
        const session = (dashboardResponse.data.assessments || []).find((item) => String(item.candidate) === String(id));
        // The current candidate dashboard exposes assessment progress, not
        // unreleased results. A future candidate-safe result can plug into
        // this result-shaped adapter without changing the view.
        if (!cancelled) setAssessment(session?.result || session?.performance ? session : null);
        const reportResponse = await api.get(`/candidate-dashboard/applications/${id}/rejection-report`, { headers: accountAuthHeader() }).catch(() => null);
        if (!cancelled && reportResponse) setReport(reportResponse.data);
        if (!cancelled) setState("ready");
      } catch (err) {
        if (!cancelled) { setError(err?.response?.data?.error || err.message || "We could not load this improvement plan."); setState("error"); }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  const areas = useMemo(() => {
    const performance = assessment?.performance || assessment?.result?.performance || assessment?.result?.perCriterion;
    if (!Array.isArray(performance)) return [];

    return performance
      .map((item) => ({
        label: item.label || item.criterionId || item.name,
        current: scoreFromAssessment(item),
        target: Number.isFinite(Number(item.target)) ? Number(item.target) : null,
        why: item.whyItMatters || item.reason || "",
        action: item.recommendedAction || item.action || "",
      }))
      .filter((item) => item.label && item.current != null);
  }, [assessment]);

  if (state === "loading") return <Card className="mx-auto max-w-3xl text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-[#176B45]" /><p className="mt-3 text-sm text-[#64736A]">Loading your improvement plan...</p></Card>;
  if (state === "error") return <Card role="alert" className="mx-auto max-w-3xl text-center"><CircleAlert className="mx-auto h-8 w-8 text-red-600" /><p className="mt-3 text-sm font-semibold text-red-700">{error}</p><Button as={Link} to="/applied-jobs" variant="outline" size="sm" className="mt-5">Back to applied jobs</Button></Card>;

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      <Link to="/applied-jobs" className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#176B45] hover:text-[#176B45]"><ArrowLeft className="h-4 w-4" /> Back to applied jobs</Link>
      <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64736A]">Application update</p><h1 className="mt-2 text-2xl font-bold text-[#17221C]">Your Improvement Plan</h1><p className="mt-2 text-sm text-[#64736A]">You can improve your next application.</p><p className="mt-2 text-xs text-[#64736A]">{application.job?.title || "Application"} · {stageLabel(application.status)}</p></div>
      {report && <>
        <Card><h2 className="text-[15px] font-semibold text-[#17221C]">Why you were not selected</h2><p className="mt-2 text-sm text-[#64736A]">{report.summary}</p></Card>
        <Card><h2 className="text-[15px] font-semibold text-[#17221C]">Rejection reasons</h2><div className="mt-4 space-y-3">{report.rejectionReasons?.map((reason) => <div key={`${reason.requirement}-${reason.reason}`} className="border-b border-[#E5EBE7] pb-3 last:border-0"><p className="text-sm font-semibold text-[#17221C]">{reason.reason}</p><p className="mt-1 text-xs text-[#64736A]">{reason.severity} · {reason.evidence}</p></div>)}</div></Card>
        <Card><h2 className="text-[15px] font-semibold text-[#17221C]">Job requirement alignment</h2><div className="mt-4 space-y-3">{report.requirementAnalysis?.map((item) => <div key={item.requirement} className="grid gap-1 border-b border-[#E5EBE7] pb-3 last:border-0 sm:grid-cols-[1fr_auto]"><div><p className="text-sm font-semibold text-[#17221C]">{item.requirement}</p><p className="mt-1 text-xs text-[#64736A]">{item.evidence}</p></div><span className="text-xs font-semibold text-[#176B45]">{item.status}</span></div>)}</div></Card>
        <Card><h2 className="text-[15px] font-semibold text-[#17221C]">Assessment and interview</h2><p className="mt-2 text-sm text-[#64736A]">Assessment: {report.assessmentAnalysis?.overallScore == null ? report.assessmentAnalysis?.status : `${report.assessmentAnalysis.overallScore}%`}</p><p className="mt-1 text-sm text-[#64736A]">Interview: {report.interviewAnalysis?.overallScore == null ? report.interviewAnalysis?.status : `${report.interviewAnalysis.overallScore}%`}</p></Card>
      </>}
      <Card className="border-[#E5EBE7] bg-white dark:border-[#E5EBE7] dark:bg-white"><div className="flex items-start gap-3"><Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-[#176B45]" /><div><h2 className="text-[15px] font-semibold text-[#17221C]">Improvement areas</h2><p className="mt-1 text-sm text-[#64736A]">Recommendations below are based on the recorded evidence for this application.</p></div></div></Card>
      {areas.length > 0 ? <div className="grid gap-4 md:grid-cols-2">{areas.map((area) => <ImprovementArea key={area.label} item={area} />)}</div> : <Card><p className="text-sm text-[#64736A]">No assessment performance data is available for this application.</p></Card>}
      {report?.improvementPlan?.map((phase) => <Card key={phase.period}><h2 className="text-[15px] font-semibold text-[#17221C]">{phase.period}</h2><ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[#64736A]">{phase.actions?.map((action) => <li key={action}>{action}</li>)}</ul></Card>)}
    </div>
  );
}
