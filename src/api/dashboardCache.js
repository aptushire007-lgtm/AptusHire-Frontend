import api from "./client.js";
import { accountAuthHeader } from "../auth/accountAuth.js";

// GET /candidate-dashboard is the heaviest call the candidate app makes (the
// backend assembles applications, sessions, notifications and a ranked job
// pool in one response) and six different pages each requested it on every
// mount. This module makes them share ONE request: concurrent callers reuse
// the in-flight promise, and the last payload is kept so a page can paint it
// instantly while it revalidates. Pages must still call fetchDashboard() to
// get fresh data — the cache only removes the blank wait, never the refresh.

let cache = null; // { key, data }
let inflight = null; // { key, promise }

function cacheKey() {
  return String(accountAuthHeader()?.Authorization || "");
}

// Any successful write that can change the dashboard payload (save/unsave,
// dismiss, resume changes, applying) discards the cached copy, so a page never
// paints a job the candidate just removed.
api.interceptors.response.use((response) => {
  const method = String(response.config?.method || "get").toLowerCase();
  const url = String(response.config?.url || "");
  if (method !== "get" && (url.includes("/candidate-dashboard") || /\/jobs\/[^/]+\/apply/.test(url))) {
    cache = null;
  }
  return response;
});

export function peekDashboard() {
  const key = cacheKey();
  return key && cache?.key === key ? cache.data : null;
}

export function fetchDashboard() {
  const key = cacheKey();
  if (inflight && inflight.key === key) return inflight.promise;
  const promise = api
    .get("/candidate-dashboard", { headers: accountAuthHeader() })
    .then((response) => {
      cache = { key, data: response.data };
      return response;
    })
    .finally(() => {
      if (inflight?.promise === promise) inflight = null;
    });
  inflight = { key, promise };
  return promise;
}
