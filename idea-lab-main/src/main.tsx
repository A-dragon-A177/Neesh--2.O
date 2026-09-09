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
// Suppress benign AbortError unhandled rejections (e.g. cancelled fetch/auth during React StrictMode unmount)
window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  const isAbort =
    reason?.name === "AbortError" ||
    reason?.message?.includes("signal is aborted without reason") ||
    reason?.message?.includes("The user aborted a request");
  if (isAbort) {
    event.preventDefault();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
