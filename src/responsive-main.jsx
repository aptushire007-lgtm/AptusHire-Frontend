/**
 * THROWAWAY responsive harness — not part of the app, not imported by it.
 *
 * Mounts real candidate screens inside their real shells against HOSTILE
 * fixtures (long job titles, long addresses, long names) with the axios adapter
 * stubbed, so narrow-viewport layout can be measured without a backend.
 *
 * Run:    cd user && npm run dev  →  http://localhost:5174/responsive.html?p=dashboard
 * Pages:  ?p=<key> for any key in PAGES below.
 * Delete: rm user/responsive.html user/src/responsive-main.jsx
 *
 * The proctored screens (interview room, pre-check, phone cam, assessment room)
 * need a camera and a mic. Launch Chromium with
 * `--use-fake-device-for-media-capture --use-fake-ui-for-media-stream` and
 * getUserMedia resolves with a synthetic stream, which is what makes the
 * monitoring chrome (self-view pip, watermark, fullscreen banner) render — the
 * parts of those screens most likely to collide with a phone viewport.
 */
import React from "react";
import ReactDOM from "react-dom/client";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import api from "./api/client.js";
import { ToastProvider } from "./components/ui/Toast.jsx";
import AppShell from "./components/app/AppShell.jsx";
import CandidateDashboard from "./pages/CandidateDashboard.jsx";
import NotificationCenter from "./pages/NotificationCenter.jsx";
import JobListings from "./pages/JobListings.jsx";
import JobDetail from "./pages/JobDetail.jsx";
import ApplyForm from "./pages/ApplyForm.jsx";
import Account from "./pages/Account.jsx";
import ResumeUpload from "./pages/ResumeUpload.jsx";
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import InterviewDashboard from "./pages/InterviewDashboard.jsx";
import AssessmentHub from "./pages/AssessmentHub.jsx";
import InterviewRoom from "./pages/InterviewRoom.jsx";
import PreInterviewCheck from "./pages/PreInterviewCheck.jsx";
import PhoneCam from "./pages/PhoneCam.jsx";
import AssessmentRoom from "./pages/AssessmentRoom.jsx";
import ScorecardForm from "./pages/ScorecardForm.jsx";
import "./index.css";

const which = new URLSearchParams(location.search).get("p") || "dashboard";

const LONG_TITLE = "Senior Artificial Intelligence & Machine Learning Innovation Consultant";
const LONG_CO = "Autonoetic Edge Technologies Private Limited";
const LONG_EMAIL = "vijendra.pratap.singh.candidate@autonoetic-edge-technologies.co.in";
const LONG_LOC = "Bengaluru, Karnataka, India";
const LONG_NAME = "Vijendra Pratap Singh Chauhan";
const LONG_SKILLS = [
  "Python", "TensorFlow", "Kubernetes", "Distributed Systems Architecture",
  "Natural Language Processing", "PostgreSQL", "React", "Terraform",
];

// `jwt` (not `token`) is what portalAuth/assessmentAuth/scorecardAuth read; the
// interview room redirects to the dashboard without it, so a fixture that gets
// this wrong measures a redirect instead of the screen.
localStorage.setItem("candidateAccountAuth", JSON.stringify({
  token: "fake", user: { name: LONG_NAME, email: LONG_EMAIL },
}));
localStorage.setItem("interviewPortalAuth", JSON.stringify({
  jwt: "fake", rawToken: "a".repeat(64), candidateName: LONG_NAME, jobTitle: LONG_TITLE,
}));
localStorage.setItem("assessmentPortalAuth", JSON.stringify({
  jwt: "fake", candidateName: LONG_NAME, jobTitle: LONG_TITLE,
}));
localStorage.setItem("scorecardPortalAuth", JSON.stringify({ jwt: "fake" }));

// A non-empty draft is what puts the interview room in TEXT mode (it opens in
// voice otherwise), which is the branch with the answer textarea and the
// send/skip/voice control row — the densest row on the screen.
sessionStorage.setItem(
  "interviewDraftAnswer",
  "I led the migration of our feature store off a nightly batch job and onto a streaming pipeline, which cut "
    + "training-serving skew and took our p99 inference latency from about 900ms down to 120ms."
);

const job = (i) => ({
  _id: `j${i}`, slug: `role-${i}`, title: LONG_TITLE,
  company: { name: LONG_CO }, location: LONG_LOC, department: "Engineering & Applied Research",
  employmentType: "Full-time", minExperienceYears: 5,
  requiredEducation: "B.Tech / M.Tech in Computer Science or equivalent",
  requiredSkills: LONG_SKILLS, atsThreshold: 60,
  description: "We are looking for an exceptional engineer to join our applied research group. ".repeat(4),
  requirements: "Deep experience with distributed systems and production ML. ".repeat(3),
  createdAt: new Date().toISOString(),
});

const DASHBOARD = {
  serverTime: new Date().toISOString(),
  profile: { headline: "AI/ML Consultant", location: LONG_LOC, bio: "", skills: LONG_SKILLS, profileCompletionPercent: 60 },
  appliedJobs: [{
    _id: "c1", status: "interview_scheduled", createdAt: new Date().toISOString(),
    job: job(1), ats: { overallScore: 78, decision: "pass" },
  }],
  upcomingInterviews: [{
    _id: "s1", job: job(1), interviewAt: new Date(Date.now() + 864e5).toISOString(),
    expiresAt: new Date(Date.now() + 3 * 864e5).toISOString(), status: "scheduled",
  }],
  aiInterviewHistory: [{
    _id: "s0", job: job(2), completedAt: new Date().toISOString(),
    aiInterview: { status: "completed", evaluation: { overallScore: 72, recommendation: "review" } },
  }],
  assessments: [{
    _id: "a1", job: job(1), status: "assigned", title: "Applied ML Screening Assessment",
    expiresAt: new Date(Date.now() + 2 * 864e5).toISOString(),
  }],
  notifications: [],
  resume: { hasResume: true, latest: { originalName: "Vijendra_Pratap_Singh_Senior_AI_ML_Consultant_Resume_2026.pdf" } },
  savedJobs: [job(1), job(2)],
  recommendedJobs: [job(3), job(4)],
};

const NOTIFICATIONS = {
  notifications: Array.from({ length: 4 }, (_, i) => ({
    _id: `n${i}`, title: "Your interview has been scheduled for the Senior AI/ML Consultant role",
    body: "Please join using the link we emailed you. The link expires in 48 hours.",
    type: "interview_invite", read: i > 1, createdAt: new Date().toISOString(),
  })),
  page: 1, totalPages: 12, total: 240, unreadCount: 3,
};

const RESUMES = [{
  _id: "r1", originalName: "Vijendra_Pratap_Singh_Senior_AI_ML_Consultant_Resume_2026.pdf",
  sizeBytes: 284913, createdAt: new Date().toISOString(), isLatest: true,
}];

const PORTAL_ME = {
  candidateName: LONG_NAME, jobTitle: LONG_TITLE,
  company: { name: LONG_CO }, department: "Engineering & Applied Research",
  interviewAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 2 * 864e5).toISOString(),
  status: "scheduled", instructions: "Find a quiet room with a stable connection. ".repeat(3),
  aiInterview: { status: "not_started", questionCount: 0, maxQuestions: 8 },
  deviceCheck: {}, speedTest: {}, identityVerification: { status: "pending" },
  proctoring: { consent: { given: false } }, features: { evidenceClips: true, secondaryCam: true },
};

const ASSESSMENT_ME = {
  candidateName: LONG_NAME, jobTitle: LONG_TITLE,
  company: { name: LONG_CO },
  assessment: {
    title: "Applied Machine Learning Screening Assessment", status: "assigned",
    durationMinutes: 45, totalQuestions: 20, totalMarks: 100,
    expiresAt: new Date(Date.now() + 2 * 864e5).toISOString(),
    startDeadlineAt: new Date(Date.now() + 864e5).toISOString(),
    instructions: "Answer all questions. You may not leave fullscreen. ".repeat(3),
  },
  proctoring: { consent: { given: false } },
};

// --- Interview room -------------------------------------------------------
// `engine: "fallback"` keeps the degraded-engine disclosure banner on screen —
// a full-width row that has to share the header band with the self-view pip.
const LONG_QUESTION =
  "Walk me through a time you had to reduce inference latency on a production machine-learning "
  + "service without retraining the model — what did you measure first, and what did you change?";
const INTERVIEW_BASE = {
  status: "in_progress",
  completed: false,
  engine: "fallback",
  intro: "Hi, thanks for making the time. I'll ask a few questions about your experience.",
  currentQuestion: LONG_QUESTION,
  currentQuestionBridges: false,
  currentQuestionRestatement: "",
  currentIsWarmup: false,
  questionCount: 3,
  maxQuestions: 8,
  halted: false,
  endedEarly: false,
  integrityTerminated: false,
  turns: [
    { role: "ai", kind: "warmup", text: "Hi, thanks for making the time. Tell me a little about yourself to start." },
    { role: "candidate", kind: "warmup_answer", text: "I'm an applied ML engineer with about six years across recommender systems and NLP." },
    { role: "ai", text: LONG_QUESTION },
    { role: "candidate", text: "We profiled the request path end to end and found tokenisation was dominating. ".repeat(3) },
  ],
};
const INTERVIEW_VARIANTS = {
  interviewroom: INTERVIEW_BASE,
  interviewdone: { ...INTERVIEW_BASE, completed: true, status: "completed" },
  interviewhalt: { ...INTERVIEW_BASE, halted: true },
  interviewterm: { ...INTERVIEW_BASE, integrityTerminated: true },
};

// --- Assessment room ------------------------------------------------------
const OPTS = [
  { id: "o1", text: "Increase the batch size until GPU utilisation saturates, then tune the learning-rate schedule to match." },
  { id: "o2", text: "Quantise the model to int8 and re-benchmark p99 latency under production concurrency." },
  { id: "o3", text: "Cache tokenised inputs keyed by a normalised hash of the request body." },
  { id: "o4", text: "None of the above." },
];
const ASSESSMENT_SECTION = {
  section: { title: "Section B — Applied Machine Learning & Systems Design", sectionId: "sec1" },
  remainingSec: 1847,
  items: [
    { itemId: "i1", type: "mcq_single", stem: "A production ranking service has a p99 latency of 900ms, dominated by tokenisation. Which change most directly reduces p99 without retraining?", options: OPTS, response: null, markedForReview: false },
    { itemId: "i2", type: "mcq_multi", stem: "Which of the following are valid ways to detect training-serving skew in a deployed model?", options: OPTS, response: null, markedForReview: true },
    { itemId: "i3", type: "numeric", stem: "A batch job processes 4,800 records in 12 minutes. How many records per second is that, to one decimal place?", options: [], response: null, markedForReview: false },
    { itemId: "i4", type: "ordering", stem: "Put these steps of a canary deployment in the order you would run them.", options: OPTS, response: null, markedForReview: false },
    ...Array.from({ length: 16 }, (_, i) => ({
      itemId: `x${i}`, type: "mcq_single",
      stem: `Filler question ${i + 5} — included so the question-navigator grid renders at full length.`,
      options: OPTS, response: i % 3 === 0 ? "o1" : null, markedForReview: i % 5 === 0,
    })),
  ],
};

// --- Scorecard ------------------------------------------------------------
const SCORECARD = {
  stage: "technical_deep_dive",
  candidate: { name: LONG_NAME },
  job: { title: LONG_TITLE, department: "Engineering & Applied Research" },
  rubricVersion: 4,
  ratingLabels: { 1: "Well below bar", 2: "Below bar", 3: "At bar", 4: "Above bar", 5: "Well above bar" },
  decisions: ["Advance to the next round", "Hold for comparison against other candidates", "Do not advance"],
  criteria: [
    {
      id: "c1", label: "Production machine-learning systems ownership", kind: "must_have",
      rationale: "The role owns a live inference path end to end, including its on-call rotation.",
      probeHint: "Ask for one incident they were paged for, and what they changed afterwards so it could not recur.",
      targetClaims: [
        { claimId: "cl1", summary: "Cut p99 inference latency from 900ms to 120ms on the recommendations service" },
        { claimId: "cl2", summary: "Owned the on-call rotation for a service handling 40,000 requests per second" },
      ],
    },
    {
      id: "c2", label: "Distributed systems design under partial failure", kind: "nice_to_have",
      rationale: "Most of the platform's hard bugs live at the seams between services rather than inside them.",
      probeHint: "Ask what happens to their design when one downstream dependency is slow rather than down.",
      targetClaims: [{ claimId: "cl3", summary: "Designed the multi-region failover for the feature store" }],
    },
  ],
};

api.defaults.adapter = async (config) => {
  const url = config.url || "";
  let data = {};
  if (url.includes("candidate-dashboard")) data = DASHBOARD;
  else if (url.includes("unread-count")) data = { count: 3 };
  else if (url.includes("notifications")) data = NOTIFICATIONS;
  else if (url.includes("/auth/me")) data = { name: LONG_NAME, email: LONG_EMAIL, phone: "+91 90000 00000" };
  else if (url.includes("/resumes/history")) data = RESUMES;
  // The specific `/interview-portal/*` endpoints go before `/me`, and
  // `/assessment-portal/sections/` before its `/me`, for the same reason
  // `/jobs/published` goes before the single-job pattern below.
  else if (url.includes("/interview-portal/interview")) data = INTERVIEW_VARIANTS[which] || INTERVIEW_BASE;
  else if (url.includes("/interview-portal/phone/login")) data = { token: "fake-phone-jwt" };
  else if (url.includes("/interview-portal/phone/pair")) data = { url: `${location.origin}/phone-cam/${"b".repeat(48)}` };
  else if (url.includes("/interview-portal/speed-test-file")) data = new ArrayBuffer(1024 * 256);
  else if (url.includes("/interview-portal/me")) data = PORTAL_ME;
  else if (url.includes("/assessment-portal/sections/")) data = ASSESSMENT_SECTION;
  else if (url.includes("/assessment-portal/me")) data = ASSESSMENT_ME;
  else if (url.includes("/scorecard-portal/me")) data = SCORECARD;
  else if (url.includes("/jobs/published") || /\/jobs\/?$/.test(url)) data = [1, 2, 3, 4].map(job);
  else if (/\/jobs\/[^/]+$/.test(url)) data = job(1);
  return { data, status: 200, statusText: "OK", headers: {}, config };
};

const shell = (node) => <AppShell>{node}</AppShell>;
// Screens that read a route param need a real path plus a matching entry,
// rather than the catch-all the other pages mount under.
const routed = (el, path, entry) => ({ el, path, entry });

const PAGES = {
  dashboard: shell(<CandidateDashboard />),
  notifications: shell(<NotificationCenter />),
  jobs: shell(<JobListings />),
  jobdetail: shell(<JobDetail />),
  apply: shell(<ApplyForm />),
  account: shell(<Account />),
  resume: shell(<ResumeUpload />),
  landing: <Landing />,
  login: <Login />,
  register: <Register />,
  interviewdash: <InterviewDashboard />,
  assessmenthub: <AssessmentHub />,
  interviewroom: <InterviewRoom />,
  interviewdone: <InterviewRoom />,
  interviewhalt: <InterviewRoom />,
  interviewterm: <InterviewRoom />,
  precheck: <PreInterviewCheck />,
  phonecam: routed(<PhoneCam />, "/phone-cam/:token", `/phone-cam/${"b".repeat(48)}`),
  assessroom: routed(<AssessmentRoom />, "/assessment-portal/section/:sectionId", "/assessment-portal/section/sec1"),
  scorecard: <ScorecardForm />,
};

const picked = PAGES[which] || PAGES.dashboard;
const { el, path, entry } = picked?.el ? picked : { el: picked, path: "*", entry: "/jobs/j1" };

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ToastProvider>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path={path} element={el} />
          {path !== "*" && <Route path="*" element={el} />}
        </Routes>
      </MemoryRouter>
    </ToastProvider>
  </React.StrictMode>
);
