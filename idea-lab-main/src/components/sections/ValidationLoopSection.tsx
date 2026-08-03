import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useInView } from "../../hooks/useScrollProgress";
import { Rocket, HelpCircle, Sparkles, Bot, Video, Users, Code, CheckCircle2, ArrowRight } from "lucide-react";
import { NeeshLogo } from "../NeeshLogo";

const LOOP_STEPS = [
  { id: 1, label: "Start a project", icon: Rocket, detail: "Define vision & startup core" },
  { id: 2, label: "Answer core questions", icon: HelpCircle, detail: "Debias assumptions" },
  { id: 3, label: "Auto-generate Spotlights", icon: Sparkles, detail: "Publishable product page" },
  { id: 4, label: "Train custom chatbot", icon: Bot, detail: "24/7 AI engagement" },
  { id: 5, label: "Publish elevator pitch", icon: Video, detail: "30–60s video reel" },
  { id: 6, label: "Connect with audience", icon: Users, detail: "Real feedback signals" },
  { id: 7, label: "Prepare for development", icon: Code, detail: "Validated MVP roadmap" },
];

export default function ValidationLoopSection() {
  const { ref, inView } = useInView(0.15);
  const [activeIndex, setActiveIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-cycle through steps
  useEffect(() => {
    if (!inView) return;
    intervalRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % LOOP_STEPS.length);
    }, 2800);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [inView]);

  return (
    <section className="relative bg-gradient-to-b from-slate-200/70 via-slate-100/70 to-slate-200/70 py-12 md:py-16 overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#09daed]/10 blur-[160px] pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/5 blur-[120px] pointer-events-none" />

      <div ref={ref as React.RefObject<HTMLDivElement>} className="max-w-[1440px] mx-auto px-4 md:px-6 relative z-10">
        {/* Header */}
        <div className="text-center mb-10 md:mb-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            className="text-[#09daed] text-sm font-bold tracking-[0.25em] uppercase mb-4"
          >
            Complete Validation Loop
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-extrabold text-gray-950 mb-4"
          >
            From idea to{" "}
            <span className="text-[#09daed]">validated startup</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2 }}
            className="text-gray-600 max-w-lg mx-auto font-medium"
          >
            Seven steps. One platform. Real audience validation.
          </motion.p>
        </div>

        {/* Mixed Deep Navy Blue & White Glassmorphic Wide Rectangle Card */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="max-w-6xl mx-auto"
        >
          <div
            className="relative border border-[#09daed]/30 rounded-2xl p-5 md:p-8 overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #0b172a 0%, #102a45 50%, #0f172a 100%)",
              boxShadow: "0 20px 60px rgba(9, 218, 237, 0.15), 0 8px 32px rgba(11, 23, 42, 0.5)",
            }}
          >
            {/* Top scanning line */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <motion.div
                className="absolute left-0 right-0 h-px"
                style={{ background: "linear-gradient(90deg, transparent, #09daed, transparent)", opacity: 0.4 }}
                animate={{ top: ["0%", "100%"] }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
              />
            </div>

            {/* Top Bar */}
            <div className="flex items-center justify-between pb-5 mb-5 border-b border-blue-900/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-[#09daed]/40 flex items-center justify-center p-2 shadow-[0_0_15px_rgba(9,218,237,0.2)]">
                  <NeeshLogo className="w-full h-full text-[#09daed]" />
                </div>
                <div>
                  <div className="text-xs font-extrabold tracking-widest text-[#09daed] uppercase flex items-center gap-2">
                    Neesh AI Platform
                    <span className="text-[9px] bg-[#09daed]/20 text-[#09daed] px-2 py-0.5 rounded-full border border-[#09daed]/30">LOOP ACTIVE</span>
                  </div>
                  <div className="text-xs text-blue-200/70 font-medium mt-0.5">End-to-End Startup Validation Engine</div>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-2 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full">
                <div className="w-2 h-2 rounded-full bg-[#09daed] animate-pulse" />
                <span className="text-xs font-bold text-white tracking-wider">
                  STEP {activeIndex + 1} OF {LOOP_STEPS.length}
                </span>
              </div>
            </div>

            {/* Step list - 7 Column Horizontal Rectangle Layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
              {LOOP_STEPS.map((step, i) => {
                const isActive = i === activeIndex;
                const isCompleted = i < activeIndex;
                const Icon = step.icon;

                return (
                  <motion.div
                    key={step.id}
                    className={`relative p-3 rounded-xl border transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                      isActive
                        ? "bg-white text-gray-950 border-[#09daed] shadow-[0_0_25px_rgba(9,218,237,0.3)] scale-[1.03] z-10"
                        : isCompleted
                        ? "bg-white/10 text-white border-white/15 hover:bg-white/15"
                        : "bg-white/5 text-blue-200/60 border-white/5 hover:bg-white/10 hover:text-white"
                    }`}
                    onClick={() => {
                      setActiveIndex(i);
                      if (intervalRef.current) clearInterval(intervalRef.current);
                    }}
                    whileHover={{ scale: isActive ? 1.03 : 1.02 }}
                  >
                    {/* Top Row: Number & Icon */}
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] font-bold font-mono tracking-wider ${isActive ? "text-[#09daed]" : "text-blue-300/50"}`}>
                        0{step.id}
                      </span>
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold transition-all duration-300 ${
                          isActive
                            ? "bg-[#09daed] text-slate-950 shadow-[0_0_10px_rgba(9,218,237,0.5)]"
                            : isCompleted
                            ? "bg-blue-500/20 text-[#09daed] border border-[#09daed]/30"
                            : "bg-white/10 text-blue-300/50"
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <Icon className="w-4 h-4" />
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="min-w-0">
                      <div className={`text-xs font-extrabold leading-snug ${isActive ? "text-gray-950" : "text-white"}`}>
                        {step.label}
                      </div>
                      <div className={`text-[10px] font-medium leading-tight mt-1 ${isActive ? "text-slate-600" : "text-blue-200/60"}`}>
                        {step.detail}
                      </div>
                    </div>

                    {/* Active Pill Badge */}
                    {isActive && (
                      <div className="mt-2 text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-[#09daed]/15 text-[#09daed] border border-[#09daed]/30 self-start animate-pulse">
                        ACTIVE
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Bottom Progress Tracker */}
            <div className="pt-4 border-t border-blue-900/60 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-200/80">
                <span className="w-2 h-2 rounded-full bg-[#09daed] animate-pulse" />
                Validation Progress: {Math.round(((activeIndex + 1) / LOOP_STEPS.length) * 100)}% Complete
              </div>
              <div className="w-full sm:w-64 h-2 bg-blue-950 rounded-full overflow-hidden border border-blue-800/40 p-0.5">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#09daed] via-cyan-400 to-blue-400 rounded-full"
                  animate={{ width: `${((activeIndex + 1) / LOOP_STEPS.length) * 100}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Section divider */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#09daed]/30 to-transparent" />
    </section>
  );
}
