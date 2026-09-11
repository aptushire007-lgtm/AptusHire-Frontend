import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import RequireAccount from "./auth/RequireAccount.jsx";
// The shell owns the collapsible left rail, the header, the content column, and
// the notification provider — see components/app/AppShell.jsx.
import AppShell from "./components/app/AppShell.jsx";
import { PHONE_PAIRING_ENABLED } from "./lib/features.js";

// Every page used to be a static import, so one 1.25 MB chunk (356 kB gzipped)
// had to arrive before anything rendered — on the app a nervous candidate opens
// on a phone, on an Indian mobile network, minutes before an interview. The
// worst of it was livekit-client: a WebRTC stack downloaded in full to read a
// job description, because InterviewRoom imported it eagerly.
//
// Three pages stay eager, and they are the three ENTRY points — the index route
// and the two magic links that arrive by email. A Suspense flash on the first
// paint of an entry point is a worse trade than the extra request; everywhere
// else the request is invisible behind a navigation the candidate initiated.
import JobListings from "./pages/JobListings.jsx";
import InterviewLogin from "./pages/InterviewLogin.jsx";
import AssessmentLogin from "./pages/AssessmentLogin.jsx";

const Landing = lazy(() => import("./pages/ForCandidates.jsx"));
const JobDetail = lazy(() => import("./pages/JobDetail.jsx"));
const ApplyForm = lazy(() => import("./pages/ApplyForm.jsx"));
const ResumeUpload = lazy(() => import("./pages/ResumeUpload.jsx"));
const InterviewDashboard = lazy(() => import("./pages/InterviewDashboard.jsx"));
const Interviews = lazy(() => import("./pages/Interviews.jsx"));
const PreInterviewCheck = lazy(() => import("./pages/PreInterviewCheck.jsx"));
// The heavy one — proctoring, captions and the LiveKit room. PreInterviewCheck
// warms this chunk on mount (see the prefetch in that file), so by the time the
// candidate has finished camera/mic checks and pressed Start, it has already
// arrived. Lazy here, but never a wait at the moment that matters.
const InterviewRoom = lazy(() => import("./pages/InterviewRoom.jsx"));
const PhoneCam = lazy(() => import("./pages/PhoneCam.jsx"));
const AssessmentHub = lazy(() => import("./pages/AssessmentHub.jsx"));
const Assessments = lazy(() => import("./pages/Assessments.jsx"));
const AssessmentResult = lazy(() => import("./pages/AssessmentResult.jsx"));
const AssessmentRoom = lazy(() => import("./pages/AssessmentRoom.jsx"));
const ScorecardLogin = lazy(() => import("./pages/ScorecardLogin.jsx"));
const ScorecardForm = lazy(() => import("./pages/ScorecardForm.jsx"));
const Register = lazy(() => import("./pages/Register.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail.jsx"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.jsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.jsx"));
const Account = lazy(() => import("./pages/Account.jsx"));
const CandidateDashboard = lazy(() => import("./pages/CandidateDashboard.jsx"));
const SavedJobs = lazy(() => import("./pages/SavedJobs.jsx"));
const AppliedJobs = lazy(() => import("./pages/AppliedJobs.jsx"));
const ImprovementPlan = lazy(() => import("./pages/ImprovementPlan.jsx"));
const ProfileLayout = lazy(() => import("./pages/profile/ProfileLayout.jsx"));
const ResumeManager = lazy(() => import("./pages/profile/ResumeManager.jsx"));
const NotificationCenter = lazy(() => import("./pages/NotificationCenter.jsx"));
const NotFound = lazy(() => import("./pages/NotFound.jsx"));
const AllJobs = lazy(() => import("./pages/AllJobs.jsx"));

// A spinner announces "something is happening"; this announces the shape of
// what is arriving, which is the difference between a wait that feels like a
// stall and one that feels like a page.
function RouteFallback() {
  return (
    <div role="status" aria-label="Loading page" className="mx-auto w-full max-w-3xl px-4 py-10">
      <div aria-hidden="true">
        <div className="h-7 w-56 animate-pulse rounded-lg bg-slate-200" />
        <div className="mt-3 h-4 w-72 max-w-full animate-pulse rounded bg-slate-200/70" />
        <div className="mt-8 h-56 w-full animate-pulse rounded-2xl bg-slate-200/60" />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/welcome" element={<Landing />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* /jobs — All Jobs public board, opens in new tab from Recommended Jobs */}
        <Route path="/jobs" element={<AllJobs />} />

        {/* Live portal routes sit outside AppShell — see InterviewShell.jsx for why the
            marketing navbar is an accidental-exit risk here, not just visual noise. Each page wraps
            itself in InterviewShell directly, since only the page knows its true live/setup stage
            (InterviewRoom's stage changes across a single mount as the interview progresses). */}
        <Route path="/portal/pre-check" element={<PreInterviewCheck />} />
        <Route path="/portal/interview" element={<InterviewRoom />} />
        {/* Assessment shell — the live item screen sits outside AppShell for the
            same accidental-exit reasons as the interview room. */}
        <Route path="/assessment-portal/section/:sectionId" element={<AssessmentRoom />} />
        {/* Phase 14.6 — phone companion camera, opened by scanning the pre-check QR.
            Deliberately outside AppShell: it's a single-purpose kiosk page.
            Gated with the card that mints the QR — a live route reachable by a
            code nothing can issue is a surface that is hidden in the UI and open
            on the wire. <Routes> ignores falsy children by design. */}
        {PHONE_PAIRING_ENABLED && <Route path="/phone-cam/:token" element={<PhoneCam />} />}
        {/* Interviewer scorecard (RoundScorecard). Outside AppShell on purpose: the
            person opening this is a hiring manager or external panelist, not a
            candidate — the careers navbar would be confusing chrome, and they have
            no account to navigate to. */}
        <Route path="/scorecard/:token" element={<ScorecardLogin />} />
        <Route path="/scorecard-portal/form" element={<ScorecardForm />} />

        <Route
          path="/*"
          element={
            <AppShell>
              {/* Inside the shell, so a route chunk arriving late swaps only the
                  page body — the rail, header and notification socket stay put. */}
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="/" element={<JobListings />} />
                  <Route path="/jobs/:id" element={<JobDetail />} />
                  <Route
                    path="/jobs/:id/apply"
                    element={
                      <RequireAccount>
                        <ApplyForm />
                      </RequireAccount>
                    }
                  />
                  <Route
                    path="/resume"
                    element={
                      <RequireAccount>
                        <ResumeUpload />
                      </RequireAccount>
                    }
                  />
                  <Route path="/interview/:token" element={<InterviewLogin />} />
                  <Route path="/portal/dashboard" element={<InterviewDashboard />} />
                  <Route
                    path="/interviews"
                    element={
                      <RequireAccount>
                        <Interviews />
                      </RequireAccount>
                    }
                  />
                  <Route path="/assessment/:token" element={<AssessmentLogin />} />
                  <Route path="/assessment-portal/hub" element={<AssessmentHub />} />
                  <Route
                    path="/assessments"
                    element={
                      <RequireAccount>
                        <Assessments />
                      </RequireAccount>
                    }
                  />
                  <Route
                    path="/assessments/:id/result"
                    element={
                      <RequireAccount>
                        <AssessmentResult />
                      </RequireAccount>
                    }
                  />
                  <Route
                    path="/account"
                    element={
                      <RequireAccount>
                        <Account />
                      </RequireAccount>
                    }
                  />
                  <Route
                    path="/dashboard"
                    element={
                      <RequireAccount>
                        <CandidateDashboard />
                      </RequireAccount>
                    }
                  />
                  <Route
                    path="/saved-jobs"
                    element={
                      <RequireAccount>
                        <SavedJobs />
                      </RequireAccount>
                    }
                  />
                  <Route
                    path="/applied-jobs"
                    element={
                      <RequireAccount>
                        <AppliedJobs />
                      </RequireAccount>
                    }
                  />
                  <Route
                    path="/applied-jobs/:id/improvement-plan"
                    element={
                      <RequireAccount>
                        <ImprovementPlan />
                      </RequireAccount>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <RequireAccount>
                        <ProfileLayout />
                      </RequireAccount>
                    }
                  />
                  <Route
                    path="/profile/resumes"
                    element={
                      <RequireAccount>
                        <ResumeManager />
                      </RequireAccount>
                    }
                  />
                  <Route
                    path="/notifications"
                    element={
                      <RequireAccount>
                        <NotificationCenter />
                      </RequireAccount>
                    }
                  />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </AppShell>
          }
        />
      </Routes>
    </Suspense>
  );
}
