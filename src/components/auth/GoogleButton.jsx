import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../api/client.js";
import { saveAccountAuth } from "../../auth/accountAuth.js";
import { getReturnTo, clearReturnTo } from "../../auth/returnTo.js";

const GOOGLE_SCRIPT = "https://accounts.google.com/gsi/client";

export default function GoogleButton({ onError, onStart, onFinish }) {
  const containerRef = useRef(null);
  const [ready, setReady] = useState(Boolean(window.google?.accounts?.id));
  const navigate = useNavigate();
  const location = useLocation();
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) return undefined;
    if (window.google?.accounts?.id) {
      setReady(true);
      return undefined;
    }
    const script = document.querySelector(`script[src="${GOOGLE_SCRIPT}"]`) || document.createElement("script");
    script.src = GOOGLE_SCRIPT;
    script.async = true;
    script.defer = true;
    script.onload = () => setReady(true);
    if (!script.parentNode) document.head.appendChild(script);
    return undefined;
  }, [clientId]);

  useEffect(() => {
    if (!ready || !clientId || !containerRef.current) return undefined;
    containerRef.current.replaceChildren();
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async ({ credential }) => {
        if (!credential) {
          onError?.("Google sign-in did not return a credential. Please try again.");
          return;
        }
        onStart?.();
        try {
          const response = await api.post("/auth/google", { credential });
          saveAccountAuth({ token: response.data.token, refreshToken: response.data.refreshToken, user: response.data.user, remember: true });
          const redirectTo = location.state?.from || getReturnTo() || "/dashboard";
          clearReturnTo();
          navigate(redirectTo, { replace: true });
        } catch (error) {
          const backendError = error?.response?.data?.error;
          const message = error?.response
            ? backendError || "Google sign-in could not be completed. Please try again."
            : "The Backend is unavailable. Start the Backend after fixing its MongoDB connection, then try Google sign-in again.";
          onError?.(message);
        } finally {
          onFinish?.();
        }
      },
    });
    window.google.accounts.id.renderButton(containerRef.current, { theme: "outline", size: "large", width: 360, text: "continue_with" });
    return undefined;
  }, [clientId, location.state, navigate, onError, onFinish, onStart, ready]);

  if (!clientId) {
    return <p role="status" className="text-center text-[12px] text-[#64748B]">Google sign-in is not configured. Add a Google OAuth client ID to enable it.</p>;
  }
  return <div ref={containerRef} className="flex min-h-11 justify-center" aria-label="Continue with Google" />;
}