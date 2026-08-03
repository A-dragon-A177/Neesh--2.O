import { motion } from "framer-motion";
import { useInView } from "../../hooks/useScrollProgress";
import { Link } from "react-router-dom";

export default function PricingSection() {
  const { ref, inView } = useInView(0.1);

  return (
    <section id="pricing" className="bg-gradient-to-b from-slate-200/70 via-slate-100/70 to-slate-200/70 py-14 md:py-16 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-[#09daed]/5 blur-[150px] pointer-events-none" />

      <div className="relative z-10 max-w-[1440px] mx-auto px-6 w-full">
        {/* Section Header matching PricingPage */}
        <div ref={ref as React.RefObject<HTMLDivElement>} className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            className="text-[#09daed] text-sm font-bold tracking-widest uppercase mb-4"
          >
            Neesh AI Pricing
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1, duration: 0.7 }}
            className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-950 leading-[1.1] tracking-tight mb-6"
          >
            Completely <span className="text-[#09daed]">Free in Beta</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2 }}
            className="text-slate-700 text-lg md:text-xl max-w-2xl mx-auto font-medium leading-relaxed"
          >
            We are offering unlimited access to early adopters during the beta period. Create spotlights, train chatbots, upload elevator pitches, and connect with audiences with zero costs.
          </motion.p>
        </div>

        {/* Pricing Card matching PricingPage */}
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            className="border border-[#09daed]/40 bg-white p-8 md:p-12 relative overflow-hidden rounded-2xl shadow-[0_24px_64px_rgba(9,218,237,0.12)]"
          >
            {/* Top gradient accent line */}
            <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-[#09daed] via-[#7c3aed] to-[#09daed]" />

            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="space-y-4 text-center md:text-left flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#09daed]/10 border border-[#09daed]/25 text-[#008494] text-xs font-bold tracking-widest uppercase rounded-full">
                  Beta Launch Access
                </div>
                <h3 className="text-3xl font-black text-slate-950">Neesh AI Premium</h3>
                <p className="text-slate-600 text-sm font-medium leading-relaxed max-w-md">
                  Access our full suite of startup developer tools. Create interactive Spotlights, upload 30-60s elevator pitch reels, train custom bots, and engage with early enthusiasts before you build.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {[
                    "No credit card required to start",
                    "Unlimited Spotlight pages",
                    "30-60s elevator pitch video reels",
                    "Custom AI chatbot training",
                    "Doom-scroller audience visibility",
                    "Full access to Pitches Space",
                  ].map((feat) => (
                    <div key={feat} className="flex items-center gap-2 text-xs text-slate-800 font-bold">
                      <div className="w-2 h-2 rounded-full bg-[#09daed] flex-shrink-0" />
                      {feat}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-center justify-center p-8 bg-slate-50 border border-slate-200 text-center min-w-[260px] rounded-xl shadow-xs">
                <div className="text-sm font-bold text-slate-400 line-through">$29.99/mo</div>
                <div className="text-6xl font-black text-slate-950 my-1">$0</div>
                <div className="text-xs text-[#008494] font-extrabold uppercase tracking-wider mb-6">Free during Beta</div>
                <Link to="/signup" className="w-full bg-[#09daed] text-black font-extrabold py-3.5 px-6 text-sm hover:bg-[#07c4d4] transition-all duration-200 block text-center rounded-lg shadow-md hover:scale-[1.02]">
                  Start creating your first Pitch
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#09daed]/20 to-transparent" />
    </section>
  );
}
