import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout";
import { useInView } from "../hooks/useScrollProgress";
import { BetaBadgeLight } from "../components/BetaBadge";
import { SeoHead } from "../components/SeoHead";

export default function PricingPage() {
  const { ref, inView } = useInView(0.1);

  return (
    <PageLayout>
      <SeoHead
        title="Simple Transparent Pricing | Neesh AI"
        description="Explore Neesh AI pricing plans for founders and creators. Validate ideas, host custom chatbots, and generate startup spotlight reports."
        canonicalUrl="https://neeshglobal.com/pricing"
      />
      <section className="relative bg-white/50 pt-32 pb-24 overflow-hidden min-h-[85vh] flex items-center">
        {/* Subtle background graphics */}
        <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: `linear-gradient(#09daed 1px, transparent 1px), linear-gradient(90deg, #09daed 1px, transparent 1px)`, backgroundSize: "60px 60px" }} />
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-[#09daed]/5 blur-[150px] pointer-events-none" />

        <div className="relative z-10 max-w-[1440px] mx-auto px-6 w-full">
          <div ref={ref as React.RefObject<HTMLDivElement>} className="text-center mb-12">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} className="text-[#09daed] text-sm font-bold tracking-widest uppercase mb-4">
              Neesh AI Pricing
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.1, duration: 0.7 }} className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-950 leading-[1.1] tracking-tight mb-6">
              Completely <span className="text-[#09daed]">Free in Beta</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.2 }} className="text-gray-600 text-lg md:text-xl max-w-2xl mx-auto font-medium leading-relaxed">
              We are offering unlimited access to early adopters during the beta period. Create spotlights, train chatbots, upload elevator pitches, and connect with audiences with zero costs.
            </motion.p>
          </div>

          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              className="border border-[#09daed]/30 bg-white p-8 md:p-12 relative overflow-hidden"
              style={{ boxShadow: "0 24px 64px rgba(9,218,237,0.1)" }}
            >
              {/* Top gradient accent line */}
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#09daed] via-[#7c3aed] to-[#09daed]" />

              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="space-y-4 text-center md:text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#09daed]/10 border border-[#09daed]/20 text-[#09daed] text-xs font-bold tracking-widest uppercase">
                    Beta Launch Access
                  </div>
                  <h3 className="text-3xl font-extrabold text-gray-950">Neesh AI Premium</h3>
                  <p className="text-gray-600 text-sm font-medium leading-relaxed max-w-md">
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
                      <div key={feat} className="flex items-center gap-2 text-xs text-gray-700 font-semibold">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#09daed] flex-shrink-0" />
                        {feat}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center p-8 bg-slate-50 border border-slate-200/60 text-center min-w-[240px]">
                  <div className="text-sm font-bold text-gray-400 line-through">$29.99/mo</div>
                  <div className="text-6xl font-extrabold text-gray-950 my-1">$0</div>
                  <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-6">Free during Beta</div>
                  <Link to="/signup" className="w-full bg-[#09daed] text-black font-bold py-3.5 px-6 text-sm hover:bg-[#07c4d4] transition-colors block text-center rounded-sm">
                    Start creating your first Pitch
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
