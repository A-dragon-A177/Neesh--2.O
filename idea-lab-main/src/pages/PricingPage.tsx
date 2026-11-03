import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout";
import { useInView } from "../hooks/useScrollProgress";
import { SeoHead } from "../components/SeoHead";

const SPRINT_DAY_PRICE = 84; // ₹84/day
const SPRINT_DURATIONS = [1, 3, 7, 14, 30] as const;

function sprintTotal(days: number) {
  return SPRINT_DAY_PRICE * days;
}

const gradeRows = [
  { grade: "SCOUT", badge: "bg-slate-100 text-slate-600", range: "Free", interactions: "0", war: "—", note: "Every new Pioneer starts here. All interactions are free." },
  { grade: "SEED",  badge: "bg-green-100 text-green-700", range: "₹100–₹500", interactions: "3+", war: "3.50+", note: "" },
  { grade: "RISING", badge: "bg-blue-100 text-blue-700", range: "₹300–₹1,500", interactions: "3+", war: "3.80+", note: "" },
  { grade: "PRO",   badge: "bg-purple-100 text-purple-700", range: "₹800–₹3,000", interactions: "10+", war: "4.00+", note: "" },
  { grade: "MASTER", badge: "bg-amber-100 text-amber-700", range: "₹1,500–₹6,000", interactions: "25+", war: "4.30+", note: "" },
  { grade: "ELITE", badge: "bg-rose-100 text-rose-700", range: "₹3,000–₹10,000", interactions: "50+", war: "4.50+", note: "Admin-approved. LinkedIn re-verified within 365 days." },
] as const;

export default function PricingPage() {
  const { ref, inView } = useInView(0.1);

  return (
    <PageLayout>
      <SeoHead
        title="Pricing – Sprint Marketplace | Neesh AI"
        description="₹84 per Sprint day. No subscriptions. Buy a Sprint window and get matched with Pioneers who validate your idea. Sprint Guarantee: 3+ interactions or full refund."
        canonicalUrl="https://neeshglobal.com/pricing"
      />

      {/* Hero */}
      <section className="relative bg-white/50 pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: `linear-gradient(#09daed 1px, transparent 1px), linear-gradient(90deg, #09daed 1px, transparent 1px)`, backgroundSize: "60px 60px" }} />
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-[#09daed]/5 blur-[150px] pointer-events-none" />

        <div className="relative z-10 max-w-[1440px] mx-auto px-6 w-full">
          <div ref={ref as React.RefObject<HTMLDivElement>} className="text-center mb-14">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} className="text-[#09daed] text-sm font-bold tracking-widest uppercase mb-4">
              Neesh AI Pricing
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.1, duration: 0.7 }} className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-950 leading-[1.1] tracking-tight mb-6">
              <span className="text-[#09daed]">₹84/day.</span> No subscriptions.
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.2 }} className="text-gray-600 text-lg md:text-xl max-w-2xl mx-auto font-medium leading-relaxed">
              Buy a Sprint window — 1, 3, 7, 14, or 30 days — and get matched with verified Pioneers
              who give you real feedback on your idea. Pay only for the days you Sprint.
            </motion.p>
          </div>

          {/* Sprint duration cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 max-w-4xl mx-auto mb-10">
            {SPRINT_DURATIONS.map((days, i) => (
              <motion.div
                key={days}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.1 * i }}
                className={`border p-5 text-center ${days === 7 ? "border-[#09daed] shadow-[0_0_24px_rgba(9,218,237,0.18)] bg-[#09daed]/5" : "border-slate-200 bg-white"}`}
              >
                <div className="text-2xl font-extrabold text-gray-950">{days}d</div>
                <div className="text-xs text-gray-500 font-semibold mt-0.5 mb-2">Sprint</div>
                <div className="text-lg font-bold text-[#09daed]">₹{sprintTotal(days).toLocaleString('en-IN')}</div>
                {days === 7 && <div className="mt-2 text-[10px] font-bold tracking-widest uppercase text-[#09daed]">Popular</div>}
              </motion.div>
            ))}
          </div>

          {/* Sprint Guarantee callout */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.5 }}
            className="max-w-2xl mx-auto border border-emerald-200 bg-emerald-50 px-6 py-4 flex items-start gap-3 mb-6"
          >
            <span className="text-emerald-600 text-xl mt-0.5">✓</span>
            <div>
              <span className="font-bold text-emerald-800">Sprint Guarantee</span>
              <span className="text-emerald-700 text-sm ml-2">
                Buy 7+ days and don't get at least 3 qualifying interactions? We refund 100% of your Sprint — no questions asked. (SEED grade and above only.)
              </span>
            </div>
          </motion.div>

          <div className="text-center">
            <Link
              to="/signup"
              className="inline-block bg-[#09daed] text-black font-bold py-3.5 px-10 text-sm hover:bg-[#07c4d4] transition-colors rounded-sm"
            >
              Start your first Sprint →
            </Link>
          </div>
        </div>
      </section>

      {/* Pioneer grade fee table */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-10">
            <div className="text-[#09daed] text-sm font-bold tracking-widest uppercase mb-3">Pioneer Grades</div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-950 mb-3">What Pioneers earn per interaction</h2>
            <p className="text-gray-500 text-base max-w-xl mx-auto">
              Pioneers are paid per interaction from your Sprint budget. Grade is based on WAR (Weighted Average Rating) earned over real sessions.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left py-3 px-4 font-bold text-gray-700">Grade</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-700">Fee per interaction</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-700">Min. interactions</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-700">Min. WAR</th>
                </tr>
              </thead>
              <tbody>
                {gradeRows.map((row) => (
                  <tr key={row.grade} className="border-b border-slate-100 hover:bg-white transition-colors">
                    <td className="py-3 px-4">
                      <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded ${row.badge}`}>{row.grade}</span>
                      {row.note && <span className="ml-2 text-xs text-gray-400">{row.note}</span>}
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-800">{row.range}</td>
                    <td className="py-3 px-4 text-gray-600">{row.interactions}</td>
                    <td className="py-3 px-4 text-gray-600">{row.war}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-400 mt-4 text-center">
            SCOUT interactions are always free — no Sprint budget is consumed. SCOUT Pioneers graduate to SEED automatically once they reach N≥3 qualifying interactions with WAR≥3.50 and LinkedIn verified.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white py-20">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-gray-950">Common questions</h2>
          </div>
          <div className="space-y-6">
            {[
              {
                q: "Is there a subscription?",
                a: "No. You pay only for the Sprint days you buy. When your Sprint window ends, you stop being charged — nothing auto-renews.",
              },
              {
                q: "What counts as a qualifying interaction?",
                a: "A session that runs to completion and receives a founder rating. Auto-completed sessions (timed out after 7 days) also count but at a reduced weight.",
              },
              {
                q: "How does the Sprint Guarantee work?",
                a: "If you purchase a Sprint of 7 days or more and receive fewer than 3 qualifying interactions, we refund the full Sprint amount in paise. Available for SEED grade and above.",
              },
              {
                q: "Can I buy multiple Sprints?",
                a: "Yes — Sprints stack. You can purchase a new Sprint while one is active, and the days are added to your active window.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="border-b border-slate-100 pb-6">
                <div className="font-bold text-gray-900 mb-1">{q}</div>
                <div className="text-gray-600 text-sm leading-relaxed">{a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
