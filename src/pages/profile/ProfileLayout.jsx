import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  User,
  FileCheck,
  GraduationCap,
  Briefcase,
  Wrench,
  FileText,
  Sliders,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import api from "../../api/client";
import { accountAuthHeader } from "../../auth/accountAuth";
import { Card } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import PersonalTab from "./tabs/PersonalTab";
import DocumentsTab from "./tabs/DocumentsTab";
import EducationTab from "./tabs/EducationTab";
import ExperienceTab from "./tabs/ExperienceTab";
import PreferencesTab from "./tabs/PreferencesTab";
import SkillsTab from "./tabs/SkillsTab";
import ResumeManager from "./ResumeManager";

const TABS = [
  { id: "personal", label: "Basic Information", icon: User },
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "skills", label: "Skills", icon: Wrench },
  { id: "experience", label: "Experience", icon: Briefcase },
  { id: "preferences", label: "Work Preferences", icon: Sliders },
  { id: "resumes", label: "Resumes", icon: FileText },
];

export default function ProfileLayout() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "personal";

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [loadError, setLoadError] = useState("");

  const fetchFullProfile = async () => {
    try {
      setLoading(true);
      setLoadError("");
      const res = await api.get("/candidate-dashboard/profile/full", {
        headers: accountAuthHeader(),
      });
      setProfileData(res.data);
    } catch (err) {
      setLoadError(err?.response?.data?.error || "Your profile could not be loaded. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFullProfile();
  }, []);

  const profile = profileData?.profile || {};
  const documents = profileData?.documents || [];
  const strength = profileData?.strengthScore || 0;
  const ver = profile?.verification || {};
  const hasDefaultResume = profileData?.hasDefaultResume || false;

  const setupSections = [
    { id: "personal", label: "Basic Information", done: Boolean(profile.personal?.firstName && profile.personal?.lastName && profile.user?.email && profile.personal?.phone && (profile.personal?.locationCity || profile.location)) },
    { id: "education", label: "Education", done: profile.education?.length > 0 },
    { id: "skills", label: "Skills", done: profile.skills?.length > 0 },
    { id: "experience", label: "Experience", done: profile.experience?.length > 0 },
    { id: "preferences", label: "Work Preferences", done: Boolean(profile.preferences?.availabilityWindow) },
    { id: "resumes", label: "Resumes", done: Boolean(hasDefaultResume) },
  ];

  const handleTabChange = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  // 100-Point Formula Items
  const checklist = [
    { label: "Core Profile Details", points: 15, done: Boolean(profile.personal?.firstName && profile.personal?.lastName && profile.headline) },
    { label: "Email Verified (OTP)", points: 10, done: Boolean(ver.emailVerified) },
    { label: "Phone Verified (SMS/WA)", points: 10, done: Boolean(ver.phoneVerified) },
    { label: "Gov Document OCR Verified", points: 20, done: Boolean(ver.govDocVerified) },
    { label: "LinkedIn Connected", points: 10, done: Boolean(ver.linkedinLinked) },
    { label: "Education History Added", points: 10, done: Boolean(profile.education?.length > 0) },
    { label: "Work Experience Added", points: 10, done: Boolean(profile.experience?.length > 0) },
    { label: "Default Resume Active", points: 15, done: Boolean(hasDefaultResume) },
  ];

  // Do not mount tab forms against an empty placeholder profile. Their local
  // form state must be created from the saved server values on first render.
  if (loading) {
    return (
      <div className="rounded-[14px] border border-[#C7DDD1] bg-white p-8 text-center text-base font-semibold text-[#145B40] shadow-[0_1px_4px_rgba(27,67,50,0.07)]">
        Loading your saved profile…
      </div>
    );
  }

  if (!profileData) {
    return (
      <div role="alert" className="rounded-[14px] border border-[#E5EBE7] bg-white p-8 text-center shadow-[0_1px_4px_rgba(27,67,50,0.07)]">
        <p className="text-sm font-semibold text-[#17221C]">{loadError || "Your profile could not be loaded."}</p>
        <Button type="button" size="sm" className="mt-4" onClick={fetchFullProfile}>Try again</Button>
      </div>
    );
  }

  return (
    <div className="candidate-profile-page space-y-6">
      <section className="rounded-2xl border border-[#E5EBE7] bg-white p-6 shadow-[0_1px_4px_rgba(27,67,50,0.07)] sm:p-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64736A]">Candidate profile</p>
            <h1 className="mt-2 text-2xl font-bold text-[#17221C]">Complete your profile</h1>
            <p className="mt-2 max-w-xl text-sm text-[#64736A]">A complete profile helps AptusHire match you with the right opportunities.</p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-3xl font-bold text-[#145B40]">{strength}%</p>
            <p className="text-xs text-[#64736A]">profile complete</p>
          </div>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#E8F2EC]" role="progressbar" aria-valuenow={strength} aria-valuemin="0" aria-valuemax="100" aria-label="Profile completion">
          <div className="h-full rounded-full bg-[#145B40] transition-[width] duration-500" style={{ width: `${strength}%` }} />
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
          {setupSections.map((section) => (
            <button key={section.id} type="button" onClick={() => handleTabChange(section.id)} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-colors ${section.done ? "border-[#E5EBE7] bg-white text-[#145B40] hover:border-[#C7DDD1]" : "border-[#E5EBE7] bg-white text-[#64736A] hover:border-[#C7DDD1]"}`}>
              <span aria-hidden="true" className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${section.done ? "bg-[#E8F2EC] text-[#145B40]" : "text-[#9BAAA1]"}`}>{section.done ? "✓" : "○"}</span>
              <span>{section.label}</span>
            </button>
          ))}
        </div>
      </section>
      {/* Tab Header Bar (Horizontal on mobile, rail on desktop) */}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-[#E5EBE7] bg-white p-2 shadow-xs dark:border-[#E5EBE7] dark:bg-white">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`tap-target flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-center text-xs font-bold transition-all sm:flex-none sm:px-4 ${
                isActive
                  ? "bg-[#145B40] text-white shadow-xs dark:bg-[#145B40] dark:text-white"
                  : "bg-white text-[#64736A] hover:bg-[#DDECE3] hover:text-[#145B40] dark:bg-white dark:text-[#64736A] dark:hover:bg-[#DDECE3] dark:hover:text-[#145B40]"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Main Active Tab Content */}
        <div className="lg:col-span-8">
          <Card className="rounded-3xl border border-[#E5EBE7] bg-white p-6 shadow-soft dark:border-[#E5EBE7] dark:bg-white sm:p-8">
            {activeTab === "personal" && <PersonalTab profile={profile} onRefresh={fetchFullProfile} />}
            {activeTab === "education" && <EducationTab profile={profile} onRefresh={fetchFullProfile} />}
            {activeTab === "skills" && <SkillsTab profile={profile} onRefresh={fetchFullProfile} />}
            {activeTab === "experience" && <ExperienceTab profile={profile} onRefresh={fetchFullProfile} />}
            {activeTab === "documents" && <DocumentsTab profile={profile} documents={documents} onRefresh={fetchFullProfile} />}
            {activeTab === "resumes" && <ResumeManager />}
            {activeTab === "preferences" && <PreferencesTab profile={profile} onRefresh={fetchFullProfile} />}
          </Card>
        </div>

        {/* Right Rail Sticky Cards */}
        <div className="space-y-5 lg:col-span-4">
          {/* Profile Strength Card */}
          <Card className="rounded-3xl border border-[#E5EBE7] bg-white p-5 shadow-soft dark:border-[#E5EBE7] dark:bg-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#145B40]">Profile Strength</span>
              <span className="font-display text-base font-extrabold text-[#145B40]">
                {strength}%
              </span>
            </div>

            {/* Segmented Progress Bar */}
            <div className="mt-3 flex h-2.5 w-full gap-1 overflow-hidden rounded-full bg-[#E8F2EC]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#2F574A] via-[#4E7567] to-[#D4F056] transition-all duration-500"
                style={{ width: `${strength}%` }}
              />
            </div>

            <p className="mt-2 text-[11px] text-slate-500">
              {strength >= 80 ? "Your profile is verified and ranks in top candidate searches." : "Complete remaining items to unlock 1-click apply and recruiter match priority."}
            </p>

            {/* Checklist */}
            <div className="mt-4 space-y-2 divide-y divide-slate-100 text-xs dark:divide-slate-800">
              {checklist.map((item) => (
                <div key={item.label} className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                      item.done ? "bg-[#E8F2EC] text-[#145B40]" : "bg-border text-[#9BAAA1]"
                    }`}>
                      {item.done ? "✓" : "•"}
                    </span>
                    <span className={item.done ? "font-semibold text-slate-900 dark:text-white" : "text-slate-500"}>
                      {item.label}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-[#145B40]">{item.points}%</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Recruiter View Preview (Trust Badge) */}
          <div className="rounded-3xl border border-[#244B3F] bg-[#145B40] p-5 text-white shadow-soft">
            <div className="flex items-center gap-2 text-[#E4F8C6]">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Recruiter View Preview</span>
            </div>

            <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#D4F056] font-bold text-[#145B40]">
                  {(profile.personal?.firstName || "S")[0]}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {profile.personal?.firstName || "Candidate"} {profile.personal?.lastName || ""}
                  </h4>
                  <p className="text-xs text-slate-300">{profile.headline || "Specialist"}</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2.5 text-[11px]">
                <span className="text-slate-300">Trust Credential</span>
                <span className="font-bold text-[#E4F8C6]">
                  {ver.govDocVerified ? "✓ Aptus Verified (6/6)" : "Self-Reported"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

