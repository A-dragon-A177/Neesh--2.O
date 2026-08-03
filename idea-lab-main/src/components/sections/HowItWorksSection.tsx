import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useInView } from "../../hooks/useScrollProgress";
import { gsap, ScrollTrigger } from "../../lib/gsap";

const STEPS = [
  {
    num: "01",
    title: "Step 1: Upload Raw Idea Documents & Notes",
    desc: "Founders begin validation by submitting raw notes, pitch drafts, or vision documents to Neesh AI. The system ingests the raw content to identify core product claims, target audience parameters, and potential positioning weaknesses. This initial analysis forms the foundational knowledge base for the project's interactive AI assistant.",
    icon: (
      <svg viewBox="0 0 24 24" fill="#09daed" width="28" height="28">
        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
      </svg>
    ),
    color: "#09daed",
  },
  {
    num: "02",
    title: "Step 2: Auto-Generate Your Public Blog & Context-Aware Chatbot",
    desc: "Neesh AI automatically generates a public Spotlight page featuring an embedded 30-to-60 second video pitch reel and a custom AI chatbot. The chatbot is trained on the uploaded project documents to explain technical details, answer visitor questions, and capture contact information from interested users 24/7.",
    icon: (
      <svg viewBox="0 0 24 24" fill="#7c3aed" width="28" height="28">
        <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a3 3 0 0 1 3 3v2h2a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-2v2a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3v-2H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h2V10a3 3 0 0 1 3-3h1V5.73A2 2 0 1 1 12 2zm-3 10a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm6 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" />
      </svg>
    ),
    color: "#7c3aed",
  },
  {
    num: "03",
    title: "Step 3: Track Idea Health Score & Confusion Gaps",
    desc: "As visitors interact with the Spotlight page and chatbot, Neesh AI tracks engagement metrics and conversation transcripts. The platform analyzes repeated visitor questions to detect specific areas of customer confusion, calculate an Idea Health Score, and highlight critical positioning gaps that require founder attention.",
    icon: (
      <svg viewBox="0 0 24 24" fill="#10b981" width="28" height="28">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
      </svg>
    ),
    color: "#10b981",
  },
  {
    num: "04",
    title: "Step 4: Refine Context & Train Your Bot in Continuous Iterations",
    desc: "Founders refine their product positioning by updating project documents based on automated confusion analytics. Updating the knowledge base retrains the custom AI chatbot instantly. This closed-loop iteration cycle allows creators to address customer objections and validate product demand prior to writing source code.",
    icon: (
      <svg viewBox="0 0 24 24" fill="#f59e0b" width="28" height="28">
        <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0 0 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 0 0 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
      </svg>
    ),
    color: "#f59e0b",
  },
];

/* ─── Floating Particle Field ─── */
function ParticleField() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2.5 + 1,
    delay: Math.random() * 2,
    duration: Math.random() * 2 + 1.5,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute bg-[#09daed]"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, opacity: 0.2 }}
          animate={{ y: [0, -30, 0], opacity: [0.2, 0.45, 0] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

function StepCard({ step, index, isActive }: { step: (typeof STEPS)[0]; index: number; isActive: boolean }) {
  const { ref, inView } = useInView(0.15);

  return (
    <motion.div
      ref={ref as React.RefObject<HTMLDivElement>}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.15 }}
      className="relative group flex-1"
    >
      <div
        className={`relative bg-white p-8 border transition-all duration-500 h-full ${
          isActive
            ? "border-[#09daed]/50 shadow-[0_8px_30px_rgba(9,218,237,0.15)]"
            : "border-gray-200 hover:border-[#09daed]/30"
        }`}
        style={{ boxShadow: isActive ? undefined : "0 2px 16px rgba(0,0,0,0.05)" }}
      >
        {/* Left accent bar — animated on active */}
        <div
          className="absolute top-0 left-0 bottom-0 w-[2px] transition-all duration-500"
          style={{ background: isActive ? step.color : `${step.color}30` }}
        />

        {/* Corner decorations */}
        <div className={`absolute top-0 right-0 w-8 h-8 border-t border-r transition-all duration-300 ${isActive ? 'border-[#09daed]/40' : 'border-gray-100 group-hover:border-[#09daed]/30'}`} />
        <div className={`absolute bottom-0 left-0 w-8 h-8 border-b border-l transition-all duration-300 ${isActive ? 'border-[#09daed]/40' : 'border-gray-100 group-hover:border-[#09daed]/30'}`} />

        {/* Scanning line on active */}
        {isActive && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              className="absolute left-0 right-0 h-px"
              style={{ background: `linear-gradient(90deg, transparent, ${step.color}, transparent)`, opacity: 0.4 }}
              animate={{ top: ["0%", "100%"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
          </div>
        )}

        {/* Step number */}
        <div className={`absolute top-3 right-3 text-[10px] font-mono font-bold transition-colors duration-300 ${isActive ? 'text-[#09daed]' : 'text-gray-300'}`}>
          {step.num}
        </div>

        {/* Icon */}
        <div
          className={`w-14 h-14 flex items-center justify-center mb-5 transition-all duration-500 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}
          style={{
            background: isActive ? `${step.color}15` : `${step.color}08`,
            border: `1px solid ${isActive ? `${step.color}40` : `${step.color}20`}`,
            boxShadow: isActive ? `0 0 20px ${step.color}20` : 'none',
          }}
        >
          {step.icon}
        </div>

        {/* Content */}
        <h3 className="text-lg font-bold text-gray-950 mb-2 leading-tight">{step.title}</h3>
        <p className="text-gray-600 text-sm leading-relaxed font-medium">{step.desc}</p>
      </div>

      {/* Connecting arrow (between cards, not after last) */}
      {index < 2 && (
        <>
          <div className="hidden lg:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 items-center justify-center w-8 h-8">
            <motion.svg
              viewBox="0 0 24 24"
              fill={isActive ? step.color : `${step.color}60`}
              width="20"
              height="20"
              initial={{ x: -5, opacity: 0 }}
              animate={inView ? { x: 0, opacity: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.3 + index * 0.15 }}
              style={{ filter: isActive ? `drop-shadow(0 0 6px ${step.color}60)` : `drop-shadow(0 0 4px ${step.color}40)` }}
            >
              <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
            </motion.svg>
          </div>
          <div className="flex lg:hidden justify-center items-center py-3">
            <motion.svg
              viewBox="0 0 24 24"
              fill={isActive ? step.color : `${step.color}60`}
              width="20"
              height="20"
              initial={{ y: -5, opacity: 0 }}
              animate={inView ? { y: 0, opacity: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.3 + index * 0.15 }}
              style={{ transform: "rotate(90deg)", filter: `drop-shadow(0 0 4px ${step.color}40)` }}
            >
              <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
            </motion.svg>
          </div>
        </>
      )}
    </motion.div>
  );
}

export default function HowItWorksSection() {
  const { ref, inView } = useInView(0.1);
  const sectionRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(-1);

  // GSAP scroll-scrub: activate steps 0→1→2 as user scrolls through section
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    ScrollTrigger.create({
      trigger: section,
      start: "top 60%",
      end: "bottom 40%",
      scrub: 0.3,
      onUpdate: (self) => {
        const accelerated = Math.min(self.progress * 1.4, 1);
        const idx = Math.floor(accelerated * 3);
        setActiveStep(Math.min(idx, 2));
      },
    });

    return () => {
      ScrollTrigger.getAll().forEach((t) => {
        if (t.vars.trigger === section) t.kill();
      });
    };
  }, []);

  return (
    <section ref={sectionRef} className="relative bg-white/50 py-16 md:py-24 overflow-hidden">
      {/* Background pattern */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `radial-gradient(#09daed 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
        }}
      />

      {/* Floating particles */}
      <ParticleField />

      <div className="max-w-[1440px] mx-auto px-4 md:px-6 relative z-10">
        {/* Header */}
        <div ref={ref as React.RefObject<HTMLDivElement>} className="text-center mb-10 md:mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            className="text-[#09daed] text-sm font-bold tracking-widest uppercase mb-4"
          >
            Startup Development Flow
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-extrabold text-gray-950 mb-4"
          >
            How Neesh AI Works:{" "}
            <span className="text-[#09daed]">From Raw Notes to Validated Concept</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2 }}
            className="text-gray-600 max-w-2xl mx-auto font-medium leading-relaxed"
          >
            Neesh AI validates startup concepts by converting unstructured founder notes into public Spotlight pages paired with trained AI chatbots. Visitors read the concept overview, ask questions, and submit feedback. The platform aggregates conversation logs to measure audience engagement, detect technical gaps, and generate actionable validation scores before development begins.
          </motion.p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {STEPS.map((step, i) => (
            <StepCard key={step.num} step={step} index={i} isActive={i <= activeStep} />
          ))}
        </div>
      </div>

      {/* Section divider */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#09daed]/20 to-transparent" />
    </section>
  );
}
