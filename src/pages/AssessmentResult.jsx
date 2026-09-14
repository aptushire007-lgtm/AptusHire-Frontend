import { useEffect, useState } from "react";
import { ArrowLeft, BarChart3, CheckCircle2, CircleAlert, Loader2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import api from "../api/client.js";
import { accountAuthHeader } from "../auth/accountAuth.js";
import { Card } from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";

function dateTime(value) {
  if (!value) return "Date unavailable";
  return new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function AssessmentResult() {
  const { id } = useParams();
  const [result, setResult] = useState(null);
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api.get(`/candidate-dashboard/assessments/${id}/result`, { headers: accountAuthHeader() })
      .then((response) => {
        if (cancelled) return;
        setResult(response.data);
        setState("ready");
      })
      .catch((err) => { if (!cancelled) { setError(err?.response?.data?.error || err.message || "We could not load this assessment result."); setState("error"); } });
    return () => { cancelled = true; };
  }, [id]);

  if (state === "loading") return <Card className="mx-auto max-w-3xl text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-[#F97316]" /><p className="mt-3 text-sm text-[#64748B]">Loading assessment result...</p></Card>;
  if (state === "error") return <Card role="alert" className="mx-auto max-w-3xl text-center"><CircleAlert className="mx-auto h-8 w-8 text-red-600" /><p className="mt-3 text-sm font-semibold text-red-700">{error}</p><Button as={Link} to="/assessments" variant="outline" size="sm" className="mt-5">Back to assessments</Button></Card>;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      <Link to="/assessments" className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#F97316] hover:text-[#F97316]"><ArrowLeft className="h-4 w-4" /> Back to assessments</Link>
      <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748B]">Assessment result</p><h1 className="mt-2 text-2xl font-bold text-[#0F172A]">{result.name}</h1><p className="mt-2 text-sm text-[#64748B]">Completed {dateTime(result.completedAt)}</p></div>
      <Card className="border-[#FED7AA] bg-[#FEF3E8] dark:border-[#FED7AA] dark:bg-[#FEF3E8]">
        <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#F97316]"><CheckCircle2 className="h-6 w-6" /></span><div><p className="text-xs font-semibold uppercase tracking-wide text-[#F97316]">Overall score</p><p className="mt-1 text-3xl font-bold text-[#F97316]">{result.overallScore == null ? "Not available" : `${result.overallScore}%`}</p></div></div>
        <p className="mt-4 text-xs text-[#F97316]">Status: <span className="font-semibold">{result.status}</span> · Scored {dateTime(result.scoredAt)}</p>
      </Card>
      {result.performance?.length > 0 && <Card><div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-[#F97316]" /><h2 className="text-[16px] font-semibold text-[#0F172A]">Performance breakdown</h2></div><div className="mt-5 space-y-4">{result.performance.map((item) => <div key={item.id}><div className="flex items-center justify-between gap-3 text-[13px]"><span className="font-semibold text-[#0F172A]">{item.label}</span><span className="font-bold text-[#F97316]">{item.score}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#FEF3E8]"><div className="h-full rounded-full bg-[#F97316]" style={{ width: `${item.score}%` }} /></div><p className="mt-1 text-[11px] text-[#64748B]">{item.correct} of {item.total} correct</p></div>)}</div></Card>}
      {result.performance?.length === 0 && <Card><h2 className="text-[16px] font-semibold text-[#0F172A]">Performance breakdown</h2><p className="mt-2 text-sm text-[#64748B]">No category scores are available for this result.</p></Card>}
      <Card><h2 className="text-[16px] font-semibold text-[#0F172A]">Feedback</h2><p className="mt-2 text-sm text-[#64748B]">Strengths, improvement areas, and detailed feedback are not available in the current assessment result.</p></Card>
    </div>
  );
}
