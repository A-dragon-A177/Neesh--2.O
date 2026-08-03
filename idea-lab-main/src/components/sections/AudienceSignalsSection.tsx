import { motion } from "framer-motion";
import { useInView } from "../../hooks/useScrollProgress";
import { Users, AlertCircle, ShoppingBag, MessageSquare, ArrowRight, CheckCircle2 } from "lucide-react";

const SIGNAL_CARDS = [
  {
    icon: AlertCircle,
    color: "#f59e0b",
    badge: "INSIGHT ENGINE",
    title: "Confusion & Gap Detection",
    desc: "Automatically spot where visitors drop off, get confused, or raise objections on your Spotlight page.",
    metrics: [
      { label: "Clarity Index", val: "94%" },
      { label: "Gaps Identified", val: "3 core" },
    ],
  },
  {
    icon: ShoppingBag,
    color: "#09daed",
    badge: "CONVERSION SIGNALS",
    title: "Validated Buyers & Pilot Cohorts",
    desc: "Track high-intent audience members who express willingness to pay and join your early pilot cohorts.",
    metrics: [
      { label: "Validated Buyers", val: "20.9k+" },
      { label: "Intent Score", val: "High" },
    ],
  },
  {
    icon: MessageSquare,
    color: "#10b981",
    badge: "REAL-TIME AUDIENCE",
    title: "Audience POV & Custom Feedbacks",
    desc: "Capture direct reactions, questions, and qualitative feedback through interactive Spotlight widgets.",
    metrics: [
      { label: "Feedback Signals", val: "10.5k+" },
      { label: "POV Response Rate", val: "88%" },
    ],
  },
];

export default function AudienceSignalsSection() {
  const { ref, inView } = useInView(0.15);

  return (
    <section className="relative bg-gradient-to-b from-slate-200/70 via-slate-100/70 to-slate-200/70 py-12 md:py-16 overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#09daed]/5 blur-[150px] pointer-events-none" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(#09daed 1px, transparent 1px), linear-gradient(90deg, #09daed 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <div ref={ref as React.RefObject<HTMLDivElement>} className="max-w-[1440px] mx-auto px-4 md:px-6 relative z-10">
        {/* Header */}
        <div className="text-center mb-8 md:mb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            className="text-[#09daed] text-sm font-bold tracking-[0.25em] uppercase mb-4"
          >
            Audience Intelligence
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-extrabold text-gray-950 mb-4"
          >
            Turn visitor signals into{" "}
            <span className="text-[#09daed]">validated buyers</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2 }}
            className="text-gray-600 max-w-xl mx-auto font-medium"
          >
            Stop relying on guesswork. Neesh AI aggregates real-time audience POVs, confusion detection, and buying intent before you build.
          </motion.p>
        </div>

        {/* 3-Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {SIGNAL_CARDS.map((card, i) => {
            const Icon = card.icon;

            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.2 + i * 0.15 }}
                className="group relative bg-white border border-gray-200 hover:border-[#09daed]/40 p-6 md:p-8 transition-all duration-300 flex flex-col justify-between hover:shadow-[0_12px_40px_rgba(9,218,237,0.12)] hover:-translate-y-1"
              >
                {/* Top scanning line on hover */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <motion.div
                    className="absolute left-0 right-0 h-px"
                    style={{ background: `linear-gradient(90deg, transparent, ${card.color}, transparent)`, opacity: 0.3 }}
                    animate={{ top: ["0%", "100%"] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear", delay: i * 0.4 }}
                  />
                </div>

                <div>
                  {/* Icon & Badge */}
                  <div className="flex items-center justify-between mb-5">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                      style={{ background: `${card.color}15`, border: `1px solid ${card.color}30` }}
                    >
                      <Icon className="w-6 h-6" style={{ color: card.color }} />
                    </div>
                    <span
                      className="text-[9px] font-extrabold tracking-widest px-2.5 py-1 uppercase rounded-full"
                      style={{ background: `${card.color}10`, color: card.color, border: `1px solid ${card.color}25` }}
                    >
                      {card.badge}
                    </span>
                  </div>

                  {/* Title & Desc */}
                  <h3 className="text-xl font-extrabold text-gray-950 mb-3 leading-tight">
                    {card.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed font-medium mb-6">
                    {card.desc}
                  </p>
                </div>

                {/* Metrics Footer */}
                <div className="pt-4 border-t border-gray-100 grid grid-cols-2 gap-3 bg-gray-50/50 p-3 rounded-lg">
                  {card.metrics.map((m) => (
                    <div key={m.label}>
                      <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{m.label}</div>
                      <div className="text-base font-extrabold text-gray-950 mt-0.5" style={{ color: card.color }}>
                        {m.val}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Section divider */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#09daed]/20 to-transparent" />
    </section>
  );
}
