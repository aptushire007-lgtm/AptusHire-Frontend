const STORAGE_KEY = "assessmentPortalAuth:v1";
const LEGACY_STORAGE_KEY = "assessmentPortalAuth";

export function saveAuth(patch) {
  const current = getAuth() || {};
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...patch }));
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch (err) {
    console.error("Failed to persist assessment auth", err);
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
