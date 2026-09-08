import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { ToastProvider } from "./components/ui/Toast.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import "./index.css";

// ErrorBoundary is the OUTERMOST wrapper on purpose: a throw in BrowserRouter,
// ThemeProvider or ToastProvider must land somewhere other than a blank page.
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
