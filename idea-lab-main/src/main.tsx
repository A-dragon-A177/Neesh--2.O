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
window.addEventListener("orientationchange", () => setTimeout(setVh, 100));

createRoot(document.getElementById("root")!).render(<App />);
