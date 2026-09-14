import { Component } from "react";

// Top-level safety net. Before this existed, ANY uncaught error thrown while
// React was rendering (a provider, the shell, or the first route) unmounted the
// whole tree and left `<div id="root">` empty — a completely blank page with no
// hint of what failed. React only surfaces such errors to the nearest error
// boundary; with none in the tree they take the app down silently.
//
// This does NOT swallow the error: it is logged to the console (where a bug
// reporter or Sentry-style tool can still see it), the message is shown in dev,
// and the user gets an explicit "something broke — reload" state instead of a
// white screen. A component-level failure still replaces only what it wrapped;
// this catches what nothing else did.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Keep the real error visible to the console and any error-tracking hook.
    console.error("[ErrorBoundary] uncaught render error:", error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        role="alert"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "#F4F6F9",
          color: "#0F172A",
          fontFamily:
            'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div
          style={{
            maxWidth: "28rem",
            width: "100%",
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "16px",
            padding: "28px",
            boxShadow: "0 8px 24px rgba(23,34,28,0.09)",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>
            Something went wrong
          </h1>
          <p style={{ margin: "10px 0 0", fontSize: "0.95rem", color: "#5A6B62", lineHeight: 1.6 }}>
            The page hit an unexpected error and couldn&rsquo;t finish loading. Reloading
            usually clears it. If it keeps happening, please let the team know.
          </p>
          {import.meta.env.DEV && error?.message ? (
            <pre
              style={{
                marginTop: "16px",
                padding: "12px",
                background: "#F1F4F2",
                border: "1px solid #E2E8F0",
                borderRadius: "10px",
                fontSize: "0.8rem",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                color: "#8F1D14",
              }}
            >
              {String(error.message)}
            </pre>
          ) : null}
          <div style={{ marginTop: "20px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                appearance: "none",
                border: "none",
                borderRadius: "9999px",
                padding: "10px 20px",
                fontSize: "0.9rem",
                fontWeight: 600,
                color: "#FFFFFF",
                background: "#F97316",
                cursor: "pointer",
              }}
            >
              Reload page
            </button>
            <a
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                borderRadius: "9999px",
                padding: "10px 20px",
                fontSize: "0.9rem",
                fontWeight: 600,
                color: "#F97316",
                background: "#FEF3E8",
                textDecoration: "none",
              }}
            >
              Go to start
            </a>
          </div>
        </div>
      </div>
    );
  }
}
