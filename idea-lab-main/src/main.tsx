import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// ── Mobile viewport height fix (iOS 100vh bug) ──
// Sets --vh CSS custom property to the actual viewport height
function setVh() {
  document.documentElement.style.setProperty(
    "--vh",
    `${window.innerHeight * 0.01}px`
  );
}
setVh();
window.addEventListener("resize", setVh);
// ── Auto-reload on stale chunk / new deployment ──
// Vite fires 'vite:preloadError' when a lazy chunk fails to load due to a new deployment
window.addEventListener("vite:preloadError", () => {
  const lastReload = sessionStorage.getItem("neesh_chunk_reload");
  const now = Date.now();
  if (!lastReload || now - Number(lastReload) > 10000) {
    sessionStorage.setItem("neesh_chunk_reload", String(now));
    window.location.reload();
  }
});

// Suppress benign AbortError unhandled rejections (e.g. cancelled fetch/auth during React StrictMode unmount)
// and handle unhandled dynamic import rejections from stale deployments
window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  const isAbort =
    reason?.name === "AbortError" ||
    reason?.message?.includes("signal is aborted without reason") ||
    reason?.message?.includes("The user aborted a request");
  if (isAbort) {
    event.preventDefault();
    return;
  }

  const isChunkError =
    reason?.message?.includes("Failed to fetch dynamically imported module") ||
    reason?.message?.includes("Importing a module script failed");
  if (isChunkError) {
    event.preventDefault();
    const lastReload = sessionStorage.getItem("neesh_chunk_reload");
    const now = Date.now();
    if (!lastReload || now - Number(lastReload) > 10000) {
      sessionStorage.setItem("neesh_chunk_reload", String(now));
      window.location.reload();
    }
  }
});

createRoot(document.getElementById("root")!).render(<App />);
