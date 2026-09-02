const STORAGE_KEY = "interviewPortalAuth:v1";
const LEGACY_STORAGE_KEY = "interviewPortalAuth";

// Merges onto whatever is already stored, so a later partial call (e.g. the dashboard refreshing
// just jobTitle/candidateName) can't clobber the jwt/rawToken an earlier call already saved.
export function saveAuth(patch) {
  const current = getAuth() || {};
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...patch }));
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch (err) {
    console.error("Failed to persist portal auth", err);
  }
}

export function getAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearAuth() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}

export function authHeader() {
  const auth = getAuth();
  return auth?.jwt ? { Authorization: `Bearer ${auth.jwt}` } : {};
}

export function getInterviewLink() {
  const auth = getAuth();
  if (!auth?.rawToken) return "";
  return `${window.location.origin}/interview/${auth.rawToken}`;
}
