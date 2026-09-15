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

  const handleTabChange = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  // Do not mount tab forms against an empty placeholder profile. Their local
  // form state must be created from the saved server values on first render.
  if (loading) {
    return (
      <div className="rounded-[14px] border border-[#FED7AA] bg-white p-8 text-center text-base font-semibold text-[#EA6C0A] shadow-[0_1px_4px_rgba(0,0,0,0.07)]">
        Loading your saved profile…
      </div>
    );
  }

  if (!profileData) {
    return (
      <div role="alert" className="rounded-[14px] border border-[#E2E8F0] bg-white p-8 text-center shadow-[0_1px_4px_rgba(0,0,0,0.07)]">
        <p className="text-sm font-semibold text-[#0F172A]">{loadError || "Your profile could not be loaded."}</p>
        <Button type="button" size="sm" data-profile-action="true" className="mt-4" onClick={fetchFullProfile}>Try again</Button>
      </div>
    );
  }

  return (
    <div className="candidate-profile-page space-y-6 [&_input]:!text-[#0F172A] [&_select]:!text-[#0F172A] [&_textarea]:!text-[#0F172A] [&_input::placeholder]:!text-[#64748B] [&_textarea::placeholder]:!text-[#64748B] [&_[data-profile-action='true']]:!border-transparent [&_[data-profile-action='true']]:!bg-[#F5B51B] [&_[data-profile-action='true']]:!text-[#172334]">
      {/* Tab Header Bar — a horizontally scrollable strip on mobile (labels are
          too long to share equal flex widths without spilling into each
          other; see the bottom tab bar fix in AppShell for the same bug),
          full-width wrap once there's room on tablet/desktop. */}
      <div className="flex gap-2 overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white p-2 shadow-xs dark:border-[#E2E8F0] dark:bg-white sm:flex-wrap sm:overflow-visible">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`tap-target flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-center text-xs font-semibold transition-all sm:flex-none sm:px-4 ${
                isActive
                  ? "bg-[#F5B51B] text-[#172334] shadow-xs dark:bg-[#F5B51B] dark:text-[#172334]"
                  : "bg-white text-[#64748B] hover:bg-[#FFF4CC] hover:text-[#E5A514] dark:bg-white dark:text-[#64748B] dark:hover:bg-[#FFF4CC] dark:hover:text-[#E5A514]"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main profile content. The strength and recruiter-preview rail was removed
          so every profile section now uses the available page width. */}
      <Card className="rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-soft dark:border-[#E2E8F0] dark:bg-white sm:p-8">
        {activeTab === "personal" && <PersonalTab profile={profile} onRefresh={fetchFullProfile} />}
        {activeTab === "education" && <EducationTab profile={profile} onRefresh={fetchFullProfile} />}
        {activeTab === "skills" && <SkillsTab profile={profile} onRefresh={fetchFullProfile} />}
        {activeTab === "experience" && <ExperienceTab profile={profile} onRefresh={fetchFullProfile} />}
        {activeTab === "documents" && <DocumentsTab profile={profile} documents={documents} onRefresh={fetchFullProfile} />}
        {activeTab === "resumes" && <ResumeManager />}
        {activeTab === "preferences" && <PreferencesTab profile={profile} onRefresh={fetchFullProfile} />}
      </Card>
    </div>
  );
}

