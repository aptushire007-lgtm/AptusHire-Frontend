import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, FileSearch, Info, ShieldCheck, UploadCloud } from "lucide-react";
import api from "../api/client.js";
import { accountAuthHeader } from "../auth/accountAuth.js";

function score(value) {
  return Math.min(5, Math.max(1, Math.round(value * 2) / 2));
}

function toneFor(value) {
  return value >= 4 ? "green" : value >= 3 ? "amber" : "slate";
}

function analyseResume(version) {
  const snapshot = version?.parsedSnapshot || {};
  const text = String(snapshot.rawText || "");
  const lowerText = text.toLowerCase();
  const skills = [...new Set((snapshot.skills || []).filter(Boolean))];
  const certifications = (snapshot.certifications || []).filter(Boolean);
  const roles = (snapshot.suggestedRoles || []).filter(Boolean);
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const quantifiedResults = (text.match(/\b\d+(?:\.\d+)?\s*(?:%|percent|x|years?|months?|k|m|b)\b|[$\u20ac\u00a3]\s*\d[\d,.]*/gi) || []).length;
  const dateCount = (text.match(/\b(?:19|20)\d{2}\b/g) || []).length;
  const leadershipEvidence = (lowerText.match(/\b(?:led|managed|mentored|owned|directed|supervised|founded|coached)\b/g) || []).length;
  const actionEvidence = (lowerText.match(/\b(?:built|created|improved|delivered|launched|reduced|increased|designed|automated|implemented)\b/g) || []).length;
  const hasSections = /(?:experience|education|skills|projects|certifications|summary|profile)/i.test(text);
  const experienceYears = Number(snapshot.experienceYears) || 0;
  const parsedData = skills.length + certifications.length + roles.length;

  const profile = [
    { label: "Strategic Focus", value: score(2 + (roles.length ? 1 : 0) + Math.min(2, skills.length / 5)), detail: roles.length ? `The CV suggests focus around ${roles.slice(0, 2).join(" and ")}.` : "Add a target role or professional summary to make the intended direction clearer." },
    { label: "Learning Velocity", value: score(2 + Math.min(2, skills.length / 5) + (certifications.length ? 1 : 0)), detail: skills.length ? `${skills.length} skill${skills.length === 1 ? "" : "s"} are identified in the CV${certifications.length ? `, alongside ${certifications.length} certification${certifications.length === 1 ? "" : "s"}` : ""}.` : "Add a skills section so the CV can communicate the breadth of your toolkit." },
    { label: "Career Progression", value: score(2 + Math.min(2, experienceYears / 4) + (dateCount >= 2 ? 0.5 : 0)), detail: experienceYears ? `The parsed CV indicates approximately ${experienceYears} year${experienceYears === 1 ? "" : "s"} of experience.` : "Add dated roles so progression and tenure can be evaluated accurately." },
    { label: "Drive and Initiative", value: score(2 + Math.min(2, actionEvidence / 4) + Math.min(1, quantifiedResults / 3)), detail: quantifiedResults ? `${quantifiedResults} quantified result${quantifiedResults === 1 ? "" : "s"} give evidence of impact.` : "Quantify outcomes such as time saved, revenue, scale, or quality improvements." },
    { label: "Intellectual Ability", value: score(2 + Math.min(2, skills.length / 6) + (wordCount > 250 ? 0.5 : 0)), detail: wordCount ? `The extracted CV contains about ${wordCount} words and ${skills.length} identified skill${skills.length === 1 ? "" : "s"}.` : "No readable CV text is available for this assessment." },
    { label: "Managerial Experience", value: score(1 + Math.min(4, leadershipEvidence / 2)), detail: leadershipEvidence ? `${leadershipEvidence} leadership signal${leadershipEvidence === 1 ? "" : "s"} were found in the CV text.` : "No explicit people-management or mentoring evidence was found." },
    { label: "Recognized Accomplishments", value: score(1.5 + Math.min(3, quantifiedResults / 2 + actionEvidence / 6)), detail: quantifiedResults ? "The CV includes measurable outcomes; keep them tied to the role and context." : "The CV does not contain enough measurable outcomes to score accomplishments strongly." },
    { label: "Original and Creative Thinking", value: score(2 + Math.min(2, actionEvidence / 5) + (text.match(/\b(?:innovated|prototype|research|strategy|novel|creative)\b/gi) || []).length / 3), detail: actionEvidence ? "Action-oriented language shows ownership; specific problem-solving examples would strengthen this signal." : "Add examples showing how you solved unusual or ambiguous problems." },
  ].map((item) => ({ ...item, tone: toneFor(item.value) }));

  const professionalism = score(2 + (hasSections ? 1 : 0) + (wordCount > 150 ? 0.5 : 0) + (dateCount >= 2 ? 0.5 : 0));
  const completeness = score(1.5 + Math.min(2, parsedData / 4) + (wordCount > 200 ? 1 : 0));
  const redFlags = /(?:ignore previous instructions|system prompt|jailbreak)/i.test(text);
  return {
    profile,
    sections: [
      {
        title: "Document Professionalism",
        rows: [
          ["Attention to Detail", `${professionalism} / 5`, toneFor(professionalism), hasSections ? "Recognizable CV sections were found in the extracted document." : "The extracted document has few recognizable CV sections."],
          ["Clarity and Completeness", `${completeness} / 5`, toneFor(completeness), `${skills.length} skills, ${certifications.length} certifications, and ${roles.length} suggested role${roles.length === 1 ? "" : "s"} are available from the parsed CV.`],
        ],
      },
      {
        title: "CV Red Flag Analysis",
        rows: [
          ["Other Red Flags", redFlags ? "Review" : "Clear", redFlags ? "Instruction-like text was found and should be reviewed before sharing this CV." : "No instruction-like manipulation signals were found in the extracted text."],
          ["Timeline and Tenure", dateCount >= 2 ? "Review" : "Limited", dateCount >= 2 ? `${dateCount} year references were found; confirm that role dates are consistent.` : "Fewer than two year references were found, so timeline continuity cannot be confirmed."],
          ["Experience and Representation", wordCount > 0 ? "Available" : "Unavailable", wordCount > 0 ? "This result is based on the text extracted from the selected CV." : "The selected CV has no extractable text, so content claims cannot be evaluated."],
        ],
      },
      {
        title: "Key Attributes & Potential",
        rows: [
          ["Experience Model", leadershipEvidence > 0 && actionEvidence > 0 ? "Hybrid" : leadershipEvidence > 0 ? "Leadership-led" : "Hands-on", "This label is inferred from leadership and delivery language found in the CV."],
          ["Leadership Potential", `${profile[5].value} / 5`, profile[5].tone, profile[5].detail],
          ["Entrepreneurial Spirit", `${score(1.5 + Math.min(3.5, actionEvidence / 2 + quantifiedResults / 3))} / 5`, toneFor(score(1.5 + Math.min(3.5, actionEvidence / 2 + quantifiedResults / 3)),), quantifiedResults ? "Measured ownership and outcomes support this signal." : "Quantified initiative would strengthen this signal."],
          ["Estimated Career Potential", `${score(2 + Math.min(2, parsedData / 4) + Math.min(1, quantifiedResults / 3))} / 5`, toneFor(score(2 + Math.min(2, parsedData / 4) + Math.min(1, quantifiedResults / 3))), "This is a document signal based on the selected CV, not a hiring decision."],
        ],
      },
    ],
  };
}

function Stars({ value, tone }) {
  const full = Math.floor(value);
  return (
    <span className={`inline-flex items-center gap-0.5 font-bold ${tone === "green" ? "text-[#0A9C67]" : tone === "amber" ? "text-[#F4A11A]" : "text-[#7D8783]"}`} aria-label={`${value} out of 5`}>
      {Array.from({ length: 5 }, (_, index) => <span key={index} aria-hidden="true">{index < full ? "★" : "☆"}</span>)}
      <span className="ml-1 text-xs">{value}</span>
    </span>
  );
}

function RadarChart({ profile }) {
  const center = { x: 180, y: 120 };
  const axes = [
    [180, 38], [245, 61], [268, 120], [244, 179],
    [180, 198], [116, 179], [92, 120], [115, 61],
  ];
  const points = axes.map(([x, y], index) => {
    const scale = (Number(profile[index]?.value) || 1) / 5;
    return `${center.x + (x - center.x) * scale},${center.y + (y - center.y) * scale}`;
  }).join(" ");
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[390px]">
      <svg viewBox="0 0 360 240" className="h-full w-full overflow-visible" role="img" aria-label="Professional profile radar chart">
        <g transform="translate(60 0)">
          {["180,58 229,76 247,120 229,164 180,182 131,164 113,120 131,76", "180,78 213,91 226,120 213,149 180,162 147,149 134,120 147,91", "180,98 197,106 205,120 197,134 180,142 163,134 155,120 163,106"].map((ring) => <polygon key={ring} points={ring} fill="none" stroke="#E5E8ED" strokeWidth="1" />)}
          <polygon points={points} fill="#B6BDC6" fillOpacity=".38" stroke="#14233A" strokeWidth="2" />
          {points.split(" ").map((point) => { const [x, y] = point.split(","); return <circle key={point} cx={x} cy={y} r="3.5" fill="white" stroke="#14233A" strokeWidth="2" />; })}
          <text x="180" y="18" textAnchor="middle" className="fill-[#778399] text-[9px]">Strategic Focus</text>
          <text x="265" y="53" className="fill-[#778399] text-[9px]">Learning Velocity</text>
          <text x="275" y="123" className="fill-[#778399] text-[9px]">Career Progression</text>
          <text x="250" y="188" className="fill-[#778399] text-[9px]">Drive and Initiative</text>
          <text x="180" y="218" textAnchor="middle" className="fill-[#778399] text-[9px]">Intellectual Ability</text>
          <text x="16" y="188" className="fill-[#778399] text-[9px]">Managerial Experience</text>
          <text x="0" y="123" className="fill-[#778399] text-[9px]">Recognized Accomplishments</text>
          <text x="7" y="53" className="fill-[#778399] text-[9px]">Original and Creative Thinking</text>
        </g>
      </svg>
    </div>
  );
}

function EvaluationCard({ section }) {
  const [open, setOpen] = useState(section.rows[0][0]);
  return (
    <section className="rounded-[18px] border border-[#DFE5E4] bg-white p-4 shadow-[0_5px_18px_rgba(33,71,64,.06)] sm:p-5">
      <h2 className="mb-3 text-[19px] font-semibold text-[#252B29]">{section.title}</h2>
      <div className="space-y-2">
        {section.rows.map(([label, value, tone, detail]) => {
          const expanded = open === label;
          return (
            <div key={label} className={`overflow-hidden rounded-[15px] border ${expanded ? "border-[#D5DDE0]" : "border-[#DCE2E5]"}`}>
              <button type="button" onClick={() => setOpen(expanded ? "" : label)} className="flex min-h-[54px] w-full items-center gap-3 px-4 text-left font-semibold text-[#14233A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A7D68E]">
                <span className="min-w-0 flex-1">{label}</span>
                <span className={`rounded-md px-2 py-1 text-xs ${tone === "green" ? "bg-[#E4F7EC] text-[#0A9C67]" : tone === "amber" ? "bg-[#FFF5D9] text-[#DB9710]" : "bg-[#F0F1F3] text-[#7D8783]"}`}>{value}</span>
                {expanded ? <ChevronUp className="h-4 w-4 shrink-0 text-[#77807D]" /> : <ChevronDown className="h-4 w-4 shrink-0 text-[#77807D]" />}
              </button>
              {expanded && <p className="border-t border-[#EEF1F2] px-4 pb-4 pt-3 text-sm leading-6 text-[#66716C]">{detail}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function CvEvaluation() {
  const [resume, setResume] = useState(null);
  const [versions, setVersions] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const analysis = resume ? analyseResume(resume) : null;
  useEffect(() => {
    api.get("/candidate-dashboard/resumes", { headers: accountAuthHeader() }).then(({ data }) => {
      const available = (data.versions || []).filter((version) => !version.isArchived);
      setVersions(available);
      setResume(available.find((version) => version.isDefault) || available[0] || null);
    }).catch((err) => {
      setError(err?.response?.data?.error || "Could not load your CVs.");
    });
  }, []);

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("resume", file);
    formData.append("label", file.name);
    try {
      setUploading(true);
      setError("");
      const { data: uploaded } = await api.post("/candidate-dashboard/resumes/upload", formData, {
        headers: { "Content-Type": "multipart/form-data", ...accountAuthHeader() },
      });
      const next = [...versions, uploaded].filter((version) => !version.isArchived);
      setVersions(next);
      setResume(uploaded);
    } catch (err) {
      setError(err?.response?.data?.error || "Could not upload your CV.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-5 pb-8 text-[#14233A]">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[.12em] text-[#7B8782]">CV Evaluation</p>
          <h1 className="text-[28px] font-semibold tracking-[-.02em] text-[#252B29]">Professional profile analysis</h1>
          <p className="mt-1 text-sm text-[#77807D]">A clear view of what your CV communicates to hiring teams.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {versions.length > 0 && <select aria-label="Select CV for evaluation" value={resume?._id || ""} onChange={(event) => setResume(versions.find((version) => String(version._id) === event.target.value) || null)} className="min-h-11 max-w-full rounded-full border border-[#DDE8DE] bg-white px-3 text-sm text-[#FF6B2C]">
            {versions.map((version) => <option key={version._id} value={version._id}>{version.label || "Saved CV"}</option>)}
          </select>}
          <input ref={fileInputRef} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleUpload} className="hidden" />
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#FF6B2C] px-5 text-sm font-semibold text-white shadow-[0_7px_16px_rgba(33,71,64,.15)] hover:bg-[#FF6B2C]-dark disabled:opacity-60"><UploadCloud className="h-4 w-4" /> {uploading ? "Uploading…" : "Upload CV"}</button>
        </div>
      </div>

      {error && <p role="alert" className="rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

      <div className="flex flex-wrap items-center gap-3 rounded-[14px] border border-[#DDE8DE] bg-[#F5FAF2] px-4 py-3 text-sm text-[#6B6B6B]">
        <ShieldCheck className="h-5 w-5 text-[#FF6B2C]" />
        <span>{resume ? <>Evaluating <strong className="text-[#FF6B2C]">{resume.label || "your default CV"}</strong></> : "Add a CV to generate your evaluation"}</span>
        <span className="inline-flex items-center gap-1 text-xs text-[#7B8782]"><Info className="h-3.5 w-3.5" /> Evidence-based review</span>
      </div>

      {analysis ? (
        <>
          <div className="grid gap-4 xl:grid-cols-3">
            {analysis.sections.map((section) => <EvaluationCard key={section.title} section={section} />)}
          </div>

          <section className="rounded-[18px] border border-[#DFE5E4] bg-white p-5 shadow-[0_5px_18px_rgba(33,71,64,.06)] sm:p-6">
            <div className="mb-4 flex items-center gap-2"><FileSearch className="h-5 w-5 text-[#FF6B2C]" /><h2 className="text-[20px] font-semibold text-[#252B29]">Professional Profile Analysis</h2></div>
            <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.2fr]">
              <RadarChart profile={analysis.profile} />
              <div className="space-y-2">
                {analysis.profile.map((item) => (
                  <div key={item.label} className="rounded-[14px] border border-[#DFE5E4] px-3.5 py-3">
                    <div className="flex items-center justify-between gap-3 text-sm font-semibold"><span>{item.label}</span><Stars value={item.value} tone={item.tone} /></div>
                    {item.detail && <p className="mt-3 border-t border-[#EEF1F2] pt-3 text-sm leading-6 text-[#66716C]">{item.detail}</p>}
                  </div>
                ))}
              </div>
          </div>
          </section>
        </>
      ) : (
        <div className="rounded-[18px] border border-dashed border-[#C9D9CE] bg-white px-5 py-12 text-center text-sm text-[#66716C]">
          Upload a CV to generate a profile analysis from its extracted content.
        </div>
      )}
    </div>
  );
}