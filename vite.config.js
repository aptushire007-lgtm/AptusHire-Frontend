import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Raised from the 500 kB default for exactly one chunk: `livekit`. It lands
    // at ~530 kB minified (~138 kB gzipped) and cannot be usefully split — it is
    // one dependency, and it is already isolated behind the lazy InterviewRoom
    // route, so no candidate downloads it unless they are actually sitting an
    // interview. Left at the default the build printed a warning on every run,
    // which is the fastest way to teach everyone to ignore build warnings. This
    // ceiling is low enough that a genuine regression still trips it.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Mirrors admin/vite.config.js — same grouping, same reasoning: split
        // third-party code by CHANGE RATE so shipping app code does not
        // invalidate dependencies a returning candidate already has cached.
        // React and react-dom stay in ONE chunk deliberately; splitting them
        // risks two copies of the renderer and a duplicated context registry.
        //
        // `livekit` is the entry this app has that admin does not, and it is
        // the one that matters most here. livekit-client is only ever reached
        // through portal/useLiveKitInterview.js → InterviewRoom, which is now a
        // lazy route — so naming it here keeps it out of the initial graph
        // entirely. A candidate browsing job listings no longer downloads a
        // WebRTC stack to read a job description.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (/node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return "react";
          if (id.includes("react-router") || id.includes("@remix-run")) return "router";
          if (id.includes("livekit")) return "livekit";
          if (id.includes("framer-motion") || id.includes("motion-dom") || id.includes("motion-utils")) return "motion";
          if (id.includes("socket.io") || id.includes("engine.io")) return "realtime";
          // NOTE: admin's config has a "forms" group here for
          // react-hook-form/@hookform/zod. This app deliberately does not — it
          // declares those three in package.json but imports none of them, so
          // the rule only ever produced an empty chunk and a build warning.
          // Add it back the moment a form here actually uses them.
          return "vendor";
        },
      },
    },
  },
  server: {
    port: 5174,
    strictPort: true, // fail loud on conflict rather than silently rebinding — see admin/vite.config.js
    host: true, // listen on 0.0.0.0 so LAN devices / tunnels can reach the dev server
    allowedHosts: true, // accept the Host header from tunnels (VS Code dev tunnels, cloudflared, ngrok)
    // Let the SPA call the backend same-origin (VITE_API_URL="/api"), so a single
    // forwarded port / tunnel covers BOTH the app and the API — no second tunnel and
    // no cross-origin CORS. Ignored when VITE_API_URL is an absolute URL (the default).
    proxy: {
      "/api": { target: "http://localhost:9000", changeOrigin: true },
      "/socket.io": { target: "http://localhost:9000", ws: true, changeOrigin: true },
    },
  },
});
