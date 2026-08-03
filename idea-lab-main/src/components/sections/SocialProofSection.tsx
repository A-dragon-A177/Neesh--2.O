import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useInView } from "../../hooks/useScrollProgress";
import neeshLogo from "@/assets/neesh-logo.png";

const DNA_COLOR = "#09daed";

const PERSONAS = [
  {
    role: "Founders",
    title: "Startup Founder & CEO",
    quote: "I showcase my 30s elevator pitch and collect audience POVs before writing any code.",
    avatar: "/avatars/founder.png",
  },
  {
    role: "Product Managers",
    title: "Lead Product Manager",
    quote: "I test feature demand and value propositions in the Pitches Arena directly.",
    avatar: "/avatars/pm.png",
  },
  {
    role: "Developers",
    title: "Full-Stack Engineer",
    quote: "I verify user pain points and demand signals before committing to architecture.",
    avatar: "/avatars/dev.png",
  },
  {
    role: "Marketers",
    title: "Growth Strategist",
    quote: "I refine startup hooks and copy by testing them with doom-scrollers.",
    avatar: "/avatars/marketer.png",
  },
  {
    role: "Students & Faculty",
    title: "Academic Builder",
    quote: "We showcase our build concepts to secure support and early-stage interest.",
    avatar: "/avatars/student.png",
  },
  {
    role: "Content Creators",
    title: "Tech SaaS Creator",
    quote: "I pitch new SaaS and content business models to build early user lists.",
    avatar: "/avatars/creator.png",
  },
];

const PLATFORM_STATS = [
  { label: "Pitches", value: 25000, suffix: "+", color: "#09daed", percent: 88 },
  { label: "Spotlight Activity", value: 23700, suffix: "+", color: "#7c3aed", percent: 92 },
  { label: "Feedback", value: 10500, suffix: "+", color: "#10b981", percent: 82 },
  { label: "Interested", value: 20900, suffix: "+", color: "#f59e0b", percent: 90 },
];

/* ─── Circular Progress Ring (from MetricsSection pattern) ─── */
function CircleProgress({ value, color, size = 80 }: { value: number; color: string; size?: number }) {
  const { ref, inView } = useInView<SVGSVGElement>(0.3);
  const [animated, setAnimated] = useState(false);
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;

  useEffect(() => {
    if (inView) setAnimated(true);
  }, [inView]);

  return (
    <svg ref={ref} width={size} height={size} className="progress-ring">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(9,218,237,0.08)" strokeWidth="6" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="square"
        strokeDasharray={circ}
        strokeDashoffset={animated ? circ * (1 - value / 100) : circ}
        style={{
          transition: "stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)",
          filter: `drop-shadow(0 0 6px ${color}60)`,
          transform: "rotate(-90deg)",
          transformOrigin: `${size / 2}px ${size / 2}px`,
        }}
      />
    </svg>
  );
}

function AnimatedCounter({ value, suffix, inView }: { value: number; suffix: string; inView: boolean }) {
  const [count, setCount] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!inView || hasAnimated.current) return;
    hasAnimated.current = true;

    const duration = 1800;
    const startTime = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * value));

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
  }, [inView, value]);

  const formatted = count >= 1000 ? `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}k` : count.toString();

  return (
    <span>
      {formatted}{suffix}
    </span>
  );
}

function PersonaChip({ persona, index }: { persona: (typeof PERSONAS)[0]; index: number }) {
  const { ref, inView } = useInView(0.1);

  return (
    <motion.div
      ref={ref as React.RefObject<HTMLDivElement>}
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.5, delay: (index % 3) * 0.08 }}
      className="relative group w-full"
    >
      <div
        className="h-full border border-slate-300/80 p-5 bg-white rounded-2xl transition-all duration-300 group-hover:border-[#09daed] group-hover:shadow-[0_10px_30px_rgba(9,218,237,0.18)] group-hover:-translate-y-1 relative overflow-hidden flex flex-col justify-between"
      >
        {/* Top Header: 3D Avatar Profile Picture on Left + Occupation/Title on Right */}
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-[#09daed] via-cyan-400 to-blue-500 shadow-[0_0_15px_rgba(9,218,237,0.35)] flex-shrink-0">
            <img
              src={persona.avatar}
              alt={persona.role}
              className="w-full h-full object-cover rounded-full bg-slate-900"
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-base font-black text-slate-950 leading-tight">
              {persona.role}
            </div>
            <div className="text-xs font-bold text-[#008494] mt-0.5 tracking-wide">
              {persona.title}
            </div>
          </div>
        </div>

        {/* Message below */}
        <div className="mt-4 p-3.5 bg-slate-50 border-l-4 border-[#09daed] rounded-r-xl text-slate-700 text-xs font-semibold leading-relaxed">
          "{persona.quote}"
        </div>
      </div>
    </motion.div>
  );
}

export default function SocialProofSection() {
  const { ref: headerRef, inView: headerInView } = useInView(0.1);
  const { ref: statsRef, inView: statsInView } = useInView(0.2);

  return (
    <section className="relative bg-gradient-to-b from-slate-200/70 via-slate-100/70 to-slate-200/70 py-12 md:py-16 overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#09daed]/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#09daed]/3 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      <div className="max-w-[1440px] mx-auto px-4 md:px-6 relative z-10">
        {/* ── Part A: Who Uses Neesh AI ── */}
        <div ref={headerRef as React.RefObject<HTMLDivElement>} className="text-center mb-8 md:mb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            className="text-[#09daed] text-sm font-bold tracking-[0.25em] uppercase mb-4"
          >
            Built For Builders
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-extrabold text-gray-950 mb-4 tracking-tight"
          >
            Who uses{" "}
            <span className="text-[#09daed]">Neesh AI?</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2 }}
            className="text-gray-600 max-w-lg mx-auto font-medium"
          >
            From solo founders to product teams — anyone who wants to stop guessing and start building with confidence.
          </motion.p>
        </div>

        {/* Persona Grid — responsive 3 column grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-16 md:mb-20">
          {PERSONAS.map((persona, i) => (
            <div key={persona.role} className="flex">
              <PersonaChip persona={persona} index={i} />
            </div>
          ))}
        </div>

        {/* ── Part B: Platform Stats with Circular Progress Rings ── */}
        <div ref={statsRef as React.RefObject<HTMLDivElement>}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={statsInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7 }}
            className="border border-[#09daed]/15 bg-white p-6 md:p-8"
            style={{ boxShadow: "0 4px 24px rgba(9,218,237,0.06)" }}
          >
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="w-1.5 h-1.5 bg-[#09daed] animate-pulse" />
              <span className="text-[#09daed] text-xs font-bold tracking-widest uppercase">
                Platform Activity
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 md:gap-8">
              {PLATFORM_STATS.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={statsInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.2 + i * 0.12 }}
                  className="text-center flex flex-col items-center"
                >
                  {/* Circular progress ring */}
                  <div className="relative mb-3">
                    <CircleProgress value={stat.percent} color={stat.color} size={80} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span
                        className="text-lg font-extrabold"
                        style={{ color: stat.color }}
                      >
                        <AnimatedCounter value={stat.value} suffix={stat.suffix} inView={statsInView} />
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 font-medium tracking-wider uppercase mb-3">
                    {stat.label}
                  </div>

                  {/* Mini animated bar chart */}
                  <div className="w-full h-6 flex items-end gap-0.5">
                    {Array.from({ length: 10 }, (_, j) => (
                      <motion.div
                        key={j}
                        className="flex-1"
                        style={{ background: stat.color, opacity: 0.15 + (j / 10) * 0.55 }}
                        initial={{ height: 0 }}
                        animate={statsInView ? { height: `${20 + Math.random() * 60}%` } : { height: 0 }}
                        transition={{ duration: 0.4, delay: i * 0.15 + j * 0.04 }}
                      />
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Section divider */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#09daed]/20 to-transparent" />
    </section>
  );
}
