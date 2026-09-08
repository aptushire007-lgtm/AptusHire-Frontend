import axios from "axios";
import {
  getAccountAuth,
  getAccountRefreshToken,
  updateAccountTokens,
  clearAccountAuth,
} from "../auth/accountAuth.js";

// Set at BUILD time by Vite (inlined). Production value must be the backend
// origin PLUS the "/api" path, no trailing slash — e.g.
// https://aptushire-backend-production.up.railway.app/api
const baseURL = import.meta.env.VITE_API_URL || "http://localhost:9000/api";

// A production bundle still pointed at localhost means VITE_API_URL was not set
// when Vercel built it. Every request will then fail (mixed content / refused)
// and the app will look broken for no obvious reason — so say it loudly. This
// only reports the misconfiguration; it does not change or hide any behaviour.
if (import.meta.env.PROD && /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/.test(baseURL)) {
  console.error(
    `[api] VITE_API_URL is not configured for this build — using fallback "${baseURL}". ` +
      `Set VITE_API_URL to the backend origin + "/api" in the Vercel project settings and redeploy.`
  );
}

const api = axios.create({ baseURL });

// Silent refresh for CANDIDATE ACCOUNT calls only. This app also makes anonymous calls
// (apply form, public jobs) and interview-portal calls (a separate token/secret) through
// the same instance — those must NOT trigger an account refresh. We only refresh when the
// failing request actually carried the current account access token.
let refreshPromise = null;

function refreshTokens() {
  if (!refreshPromise) {
    const refreshToken = getAccountRefreshToken();
    if (!refreshToken) return Promise.reject(new Error("no refresh token"));
    // Bare axios so this skips interceptors and can't recurse.
    refreshPromise = axios
      .post(`${baseURL}/auth/refresh`, { refreshToken })
      .then((res) => {
        updateAccountTokens({ token: res.data.token, refreshToken: res.data.refreshToken });
        return res.data.token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

function authHeaderOf(config) {
  const h = config?.headers;
  if (!h) return undefined;
  // axios 1.x request config headers are an AxiosHeaders instance (.get); fall back to
  // plain-object access for safety.
  if (typeof h.get === "function") return h.get("Authorization") || h.get("authorization");
  return h.Authorization || h.authorization;
}

// Guard against a misrouted API call. When VITE_API_URL is wrong (relative, or
// pointing at the frontend domain), a request for `/api/...` is answered by
// Vercel's SPA rewrite with `index.html` and HTTP 200. Axios then resolves it,
// and every page that does `res.data.map(...)` / `.filter(...)` throws a cryptic
// "x is not a function" with no clue why. Turn that into one clear, rejected
// error the pages' existing `.catch()` blocks already handle — and log the real
// cause once. This does not hide a failure; it names it.
api.interceptors.response.use((response) => {
  const body = response.data;
  const looksLikeHtml =
    typeof body === "string" && /^\s*<(?:!doctype|html)[\s>]/i.test(body);
  if (looksLikeHtml) {
    console.error(
      `[api] ${response.config?.url} returned an HTML page, not JSON. VITE_API_URL ` +
        `is misconfigured — it must be the absolute backend origin + "/api" ` +
        `(current base: "${baseURL}"). Redeploy the frontend after fixing it.`
    );
    return Promise.reject(
      Object.assign(new Error("The API returned an HTML page instead of data (VITE_API_URL is misconfigured)."), {
        response,
        isApiMisroute: true,
      })
    );
  }
  return response;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const account = getAccountAuth();
    const carriedAccountToken =
      account?.token && authHeaderOf(original) === `Bearer ${account.token}`;
    const isRefreshCall = original?.url?.includes("/auth/refresh");

    // Scoped to account calls by `carriedAccountToken`: an anonymous call (public jobs, apply) and
    // an interview-portal call (different token, different secret) both come through this instance
    // and neither may touch the account session.
    if (status === 401 && original && !original._retry && !isRefreshCall && carriedAccountToken) {
      if (getAccountRefreshToken()) {
        original._retry = true;
        try {
          const newToken = await refreshTokens();
          original.headers = original.headers || {};
          original.headers.Authorization = `Bearer ${newToken}`;
          return api(original);
        } catch {
          clearAccountAuth();
          return Promise.reject(error);
        }
      }
      // No refresh token, so the stored session cannot be recovered — and the server has just told
      // us the access token is dead. Clear it.
      //
      // This used to fall through to a bare reject, and the omission stranded people: RequireAccount
      // authorises on the PRESENCE of a token, not its validity, so the dashboard kept rendering and
      // kept firing calls that all 401'd, with no redirect to login and no way out but a manual
      // reload. clearAccountAuth() dispatches "account-auth-changed", which is what lets the guard
      // re-evaluate and send them to /login.
      clearAccountAuth();
    }
    return Promise.reject(error);
  }
);

export default api;
