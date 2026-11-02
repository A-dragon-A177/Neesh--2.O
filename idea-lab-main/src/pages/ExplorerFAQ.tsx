import React, { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import FooterSection from '@/components/sections/FooterSection';
import { HelpCircle, ChevronRight } from 'lucide-react';
import { PioneerGradeBadge } from '@/components/pioneer/PioneerGradeBadge';

export const ExplorerFAQ: React.FC = () => {
  useEffect(() => {
    document.title = "Explorer FAQ — Pioneer Grades & Economics | Neesh";
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <HelpCircle className="w-3.5 h-3.5" /> Explorer Knowledge Base
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
            Frequently Asked Questions
          </h1>
          <p className="text-slate-400 text-sm">
            Everything you need to know about Pioneer Grades, verification, and economics on Neesh.
          </p>
        </div>

        <div className="space-y-6">
          {/* Canonical Task 9 FAQ Entry */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <PioneerGradeBadge grade="ELITE" size="sm" />
              <h2 className="text-xl font-bold text-white">How do I reach Elite grade?</h2>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">
              Elite requires 50 completed interactions and a weighted average rating of 4.5 or above. Reaching Master first (30 interactions, 4.3+ rating) is required, after which your final advancement to Elite includes admin review.
            </p>
          </div>

          {/* Grade Progression Reference Table */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-lg">
            <h2 className="text-lg font-bold text-white mb-3">What are the Pioneer Grade requirements and fee ranges?</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase">
                    <th className="py-2.5 px-3">Grade</th>
                    <th className="py-2.5 px-3">Interactions Required</th>
                    <th className="py-2.5 px-3">WAR Required</th>
                    <th className="py-2.5 px-3">Fee Range</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  <tr className="hover:bg-slate-800/20">
                    <td className="py-2.5 px-3"><PioneerGradeBadge grade="SEED" size="sm" /></td>
                    <td className="py-2.5 px-3">0</td>
                    <td className="py-2.5 px-3">—</td>
                    <td className="py-2.5 px-3 text-emerald-400">₹100–₹500</td>
                  </tr>
                  <tr className="hover:bg-slate-800/20">
                    <td className="py-2.5 px-3"><PioneerGradeBadge grade="RISING" size="sm" /></td>
                    <td className="py-2.5 px-3">5</td>
                    <td className="py-2.5 px-3">3.80+</td>
                    <td className="py-2.5 px-3 text-emerald-400">₹200–₹800</td>
                  </tr>
                  <tr className="hover:bg-slate-800/20">
                    <td className="py-2.5 px-3"><PioneerGradeBadge grade="PRO" size="sm" /></td>
                    <td className="py-2.5 px-3">15</td>
                    <td className="py-2.5 px-3">4.00+</td>
                    <td className="py-2.5 px-3 text-emerald-400">₹800–₹3,000</td>
                  </tr>
                  <tr className="hover:bg-slate-800/20">
                    <td className="py-2.5 px-3"><PioneerGradeBadge grade="MASTER" size="sm" /></td>
                    <td className="py-2.5 px-3">30</td>
                    <td className="py-2.5 px-3">4.30+</td>
                    <td className="py-2.5 px-3 text-emerald-400">₹3,000–₹6,000</td>
                  </tr>
                  <tr className="hover:bg-slate-800/20">
                    <td className="py-2.5 px-3"><PioneerGradeBadge grade="ELITE" size="sm" /></td>
                    <td className="py-2.5 px-3">50</td>
                    <td className="py-2.5 px-3">4.50+</td>
                    <td className="py-2.5 px-3 text-emerald-400">₹6,000–₹10,000</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-lg">
            <h2 className="text-lg font-bold text-white mb-2">How are fees paid out?</h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              Fees for Direct Requests are held in platform escrow upon founder payment. When you submit your feedback and the founder rates or completes the interaction, the escrow is released and your net payout is credited to your ledger account balance.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-lg">
            <h2 className="text-lg font-bold text-white mb-2">What is the Founding Explorer benefit?</h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              The first 65 Explorers platform-wide receive 0% commission for their first 90 days, retaining 100% of all founder fees. Furthermore, Neesh guarantees a ₹2,500 earnings baseline at Day 30: if you complete your commitments and earn less than ₹2,500, we credit the shortfall.
            </p>
          </div>
        </div>
      </main>

      <FooterSection />
    </div>
  );
};

export default ExplorerFAQ;
