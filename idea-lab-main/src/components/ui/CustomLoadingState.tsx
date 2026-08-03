import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb } from "lucide-react";

export const STARTUP_LOADING_TIPS = [
  "Train your 24/7 AI Co-Founder in the Knowledge Base with pitch PDFs to answer buyer questions automatically.",
  "Focus 80% of your energy on Gold Buyers in your Audience Inbox—they have the highest conversion intent.",
  "Hit the 40-buyer gate? Click 'Select Pilot Batch' in Stage 3 to recruit your official MVP testing group.",
  "Customizing your Automatic Spotlight with video teasers and price tags can triple visitor signups.",
  "Check 'Confusion Points' in Audience Insights weekly to identify missing features buyers are asking for.",
  "Verify your Value Proposition Multiplier in Stage 1 before spending money on custom software development.",
  "Share your Spotlight link (neesh.ai/p/slug) directly on Twitter, LinkedIn, and Reddit for social previews.",
  "Link your GitHub/GitLab repository in Stage 3 to track MVP code execution alongside pilot customer growth.",
  "Inspect the Persona Breakdown chart to tailor your pitch copy specifically to Developers vs. Investors.",
  "Click the 'Guided Tour' compass button in the project header anytime to onboard team members.",
];

interface CustomLoadingStateProps {
  gifUrl?: string;
  message?: string;
  className?: string;
}

export default function CustomLoadingState({
  gifUrl,
  message = "Loading project data...",
  className = "",
}: CustomLoadingStateProps) {
  const [tipIndex, setTipIndex] = useState(0);

  // Pick a random tip on initial load and rotate every 4 seconds
  useEffect(() => {
    setTipIndex(Math.floor(Math.random() * STARTUP_LOADING_TIPS.length));
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % STARTUP_LOADING_TIPS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`flex flex-col items-center justify-center min-h-[300px] p-6 text-center space-y-5 ${className}`}>
      {/* GIF / Video Loop Container */}
      <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-3xl overflow-hidden shadow-xl border-2 border-cyan-500/30 bg-gradient-to-tr from-slate-900 to-slate-800 flex items-center justify-center">
        {gifUrl ? (
          <img
            src={gifUrl}
            alt="Loading animation"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="relative flex items-center justify-center w-full h-full">
            {/* Animated Pulsing Ring Fallback until custom GIF is passed */}
            <span className="animate-ping absolute inline-flex h-20 w-20 rounded-full bg-cyan-400 opacity-40"></span>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[hsl(190,85%,38%)] to-[hsl(186,93%,48%)] flex items-center justify-center text-white shadow-lg shadow-cyan-500/40">
              <Lightbulb className="w-7 h-7 animate-pulse" />
            </div>
          </div>
        )}
      </div>

      {/* Primary Message */}
      <div className="space-y-1 max-w-sm">
        <h4 className="font-bold text-slate-800 text-sm">{message}</h4>
      </div>

      {/* Rotating Founder Tip Card */}
      <div className="max-w-md w-full bg-cyan-50/70 border border-cyan-200/60 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-center gap-1.5 text-[11px] font-extrabold text-[hsl(190,85%,38%)] mb-1 uppercase tracking-wider">
          <Lightbulb className="w-3.5 h-3.5" />
          Founder Tip
        </div>
        <AnimatePresence mode="wait">
          <motion.p
            key={tipIndex}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
            className="text-xs text-slate-600 font-medium leading-relaxed"
          >
            "{STARTUP_LOADING_TIPS[tipIndex]}"
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
