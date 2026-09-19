import { useEffect, useState } from "react";
import { Check, LockKeyhole, LogOut, Mail, Pencil, Phone, Save, UserRound, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../api/client.js";
import { accountAuthHeader, clearAccountAuth } from "../auth/accountAuth.js";
import { logoutAccount } from "../auth/logout.js";
import { Card, Skeleton } from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";

const inputClass = "mt-1.5 h-11 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 text-sm font-normal text-[#0F172A] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#DBEAFE]";

export default function Account() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", phone: "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.get("/auth/me", { headers: accountAuthHeader() })
      .then(({ data }) => {
        if (cancelled) return;
        setProfile(data);
        setProfileForm({ name: data.name || "", phone: data.phone || "" });
      })
      .catch(() => {
        if (cancelled) return;
        clearAccountAuth();
        setError("Your session has expired. Please log in again.");
        setTimeout(() => navigate("/login", { replace: true }), 1200);
      });
    return () => { cancelled = true; };
  }, [navigate]);

  function handleLogout() {
    logoutAccount();
    navigate("/login", { replace: true });
  }

  async function saveProfile(event) {
    event.preventDefault();
    setError(""); setNotice(""); setSavingProfile(true);
    try {
      const { data } = await api.patch("/auth/me", profileForm, { headers: accountAuthHeader() });
      setProfile(data.user);
      setEditingProfile(false);
      setNotice("Account details saved successfully.");
    } catch (err) {
      setError(err.response?.data?.error || "Could not save account details.");
    } finally { setSavingProfile(false); }
  }

  async function changePassword(event) {
    event.preventDefault();
    setError(""); setNotice("");
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    setSavingPassword(true);
    try {
      await api.post("/auth/change-password", { currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword }, { headers: accountAuthHeader() });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setNotice("Password changed successfully.");
    } catch (err) {
      setError(err.response?.data?.error || "Could not change your password.");
    } finally { setSavingPassword(false); }
  }

  if (error && !profile) return <div className="space-y-4"><h1 className="text-[30px] font-semibold tracking-tight text-[#0F172A]">Account Settings</h1><p className="text-sm font-medium text-red-600">{error}</p></div>;
  if (!profile) return <div className="space-y-4"><Skeleton className="h-9 w-56" /><Card><Skeleton className="h-32 w-full" /></Card></div>;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 pb-10">
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-[#E2E8F0] bg-white px-5 py-5 shadow-[0_4px_18px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center sm:px-6"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#172334] text-white"><UserRound className="h-5 w-5" /></div><h1 className="text-[30px] font-semibold tracking-tight text-[#0F172A]">Account Settings</h1></div><span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#F1F5F9] px-3 py-1.5 text-xs font-semibold capitalize text-slate-600">{profile.role || "Candidate"}</span></div>
      {notice && <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800"><Check className="h-4 w-4" />{notice}</div>}
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}

      <Card className="overflow-hidden rounded-2xl border-[#E2E8F0] p-0 shadow-[0_4px_18px_rgba(15,23,42,0.05)]">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-4 sm:px-6"><div><h2 className="text-base font-bold text-[#0F172A]">Personal details</h2><p className="mt-0.5 text-xs text-[#64748B]">Keep your contact information up to date.</p></div>{!editingProfile && <button type="button" onClick={() => setEditingProfile(true)} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-[#2563EB] hover:bg-[#EFF6FF]"><Pencil className="h-3.5 w-3.5" /> Edit</button>}</div>
        {editingProfile ? <form onSubmit={saveProfile} className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6"><label className="text-sm font-semibold text-[#172334]">Full name<input value={profileForm.name} onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))} className={inputClass} required /></label><label className="text-sm font-semibold text-[#172334]">Mobile number<input value={profileForm.phone} onChange={(event) => setProfileForm((current) => ({ ...current, phone: event.target.value }))} className={inputClass} placeholder="Add mobile number" /></label><div className="flex gap-2 sm:col-span-2"><Button type="submit" loading={savingProfile}><Save className="h-4 w-4" /> Save changes</Button><Button type="button" variant="outline" onClick={() => { setEditingProfile(false); setProfileForm({ name: profile.name || "", phone: profile.phone || "" }); }}><X className="h-4 w-4" /> Cancel</Button></div></form> : <div className="grid divide-y divide-[#E2E8F0] sm:grid-cols-2 sm:divide-x sm:divide-y-0"><div className="flex items-start gap-3 px-5 py-5 sm:px-6"><UserRound className="mt-0.5 h-5 w-5 text-[#64748B]" /><div><p className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">Full name</p><p className="mt-1 text-sm font-semibold text-[#0F172A]">{profile.name || "Not provided"}</p></div></div><div className="flex items-start gap-3 px-5 py-5 sm:px-6"><Phone className="mt-0.5 h-5 w-5 text-[#64748B]" /><div><p className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">Mobile number</p><p className="mt-1 text-sm font-semibold text-[#0F172A]">{profile.phone || "Not provided"}</p></div></div></div>}
      </Card>

      <Card className="overflow-hidden rounded-2xl border-[#E2E8F0] p-0 shadow-[0_4px_18px_rgba(15,23,42,0.05)]"><div className="border-b border-[#E2E8F0] px-5 py-4 sm:px-6"><h2 className="flex items-center gap-2 text-base font-bold text-[#0F172A]"><Mail className="h-4 w-4 text-[#64748B]" /> Email address</h2><p className="mt-0.5 text-xs text-[#64748B]">Your email is used for sign-in and cannot be changed here.</p></div><div className="flex items-center gap-3 px-5 py-5 sm:px-6"><Mail className="h-5 w-5 text-[#94A3B8]" /><p className="break-all text-sm font-semibold text-[#0F172A]">{profile.email}</p><span className="ml-auto shrink-0 rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[11px] font-semibold text-[#64748B]">Read-only</span></div></Card>

      <Card className="overflow-hidden rounded-2xl border-[#E2E8F0] p-0 shadow-[0_4px_18px_rgba(15,23,42,0.05)]"><div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6"><div><h2 className="flex items-center gap-2 text-base font-bold text-[#0F172A]"><LockKeyhole className="h-4 w-4 text-[#64748B]" /> Password</h2><p className="mt-0.5 text-xs text-[#64748B]">Update your password securely.</p></div><button type="button" onClick={() => setPasswordOpen((current) => !current)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#F1F5F9] px-3 py-2 text-xs font-semibold text-[#172334] transition-colors hover:bg-[#E2E8F0]">{passwordOpen ? <X className="h-3.5 w-3.5" /> : <LockKeyhole className="h-3.5 w-3.5" />}{passwordOpen ? "Cancel" : "Change password"}</button></div>{passwordOpen && <form onSubmit={changePassword} className="grid gap-5 border-t border-[#E2E8F0] bg-[#FAFCFF] p-5 sm:grid-cols-3 sm:p-6"><label className="text-sm font-semibold text-[#172334]">Current password<input type="password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))} className={inputClass} required /></label><label className="text-sm font-semibold text-[#172334]">New password<input type="password" minLength={8} value={passwordForm.newPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))} className={inputClass} required /></label><label className="text-sm font-semibold text-[#172334]">Confirm password<input type="password" minLength={8} value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))} className={inputClass} required /></label><div className="sm:col-span-3"><Button type="submit" loading={savingPassword}><LockKeyhole className="h-4 w-4" /> Save new password</Button></div></form>}</Card>

      <div className="flex justify-end border-t border-[#E2E8F0] pt-5"><Button variant="outline" onClick={handleLogout} className="text-[#B42318] hover:bg-[#FEF2F2]"><LogOut className="h-4 w-4" /> Log out</Button></div>
    </div>
  );
}
