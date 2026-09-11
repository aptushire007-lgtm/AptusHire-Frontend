import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle2,
  error:   XCircle,
  info:    Info,
};

// Light, on-brand toast surfaces
const TONES = {
  success: "border-[#BBF7D0] bg-[#DCFCE7] text-[#16A34A]",
  error:   "border-[#FECACA] bg-[#FEE2E2] text-[#DC2626]",
  info:    "border-[#E2E8F0] bg-white text-[#0F172A]",
};

export function ToastProvider({ children }) {
  const [toasts, setToasts]  = useState([]);
  const [live, setLive]      = useState({ polite: null, assertive: null });
  const counter              = useRef(0);

  const remove = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message, type = "info", duration = 4200) => {
      const id = ++counter.current;
      setToasts((list) => [...list, { id, message, type }]);
      setLive((prev) =>
        type === "error"
          ? { ...prev, assertive: { id, message } }
          : { ...prev, polite: { id, message } }
      );
      if (duration) setTimeout(() => remove(id), duration);
      return id;
    },
    [remove]
  );

  const toast = useMemo(
    () => ({
      success: (msg, d) => push(msg, "success", d),
      error:   (msg, d) => push(msg, "error", d),
      info:    (msg, d) => push(msg, "info", d),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {/* Screen-reader live regions */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {live.polite && <span key={live.polite.id}>{live.polite.message}</span>}
      </div>
      <div className="sr-only" role="alert" aria-live="assertive" aria-atomic="true">
        {live.assertive && <span key={live.assertive.id}>{live.assertive.message}</span>}
      </div>

      {/* Visual toast stack */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-full max-w-sm flex-col gap-2"
      >
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = ICONS[t.type];
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0,  scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.18 }}
                className={`pointer-events-auto flex items-start gap-3 rounded-card border px-4 py-3 shadow-lift ${TONES[t.type]}`}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <p className="flex-1 text-sm font-medium leading-snug">{t.message}</p>
                <button
                  type="button"
                  onClick={() => remove(t.id)}
                  title="Dismiss"
                  tabIndex={-1}
                  className="-m-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-current/50 transition-colors hover:bg-black/5 hover:text-current"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
