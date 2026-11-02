import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, CheckCircle2, TrendingUp, Award } from 'lucide-react';
import Navbar from '@/components/Navbar';
import FooterSection from '@/components/sections/FooterSection';
import { DomainProofWidget } from '@/components/DomainProofWidget';
import { PioneerGradeBadge } from '@/components/pioneer/PioneerGradeBadge';

export const ForExplorers: React.FC = () => {
  useEffect(() => {
    document.title = "Neesh for Explorers — Monetize Your Domain Expertise";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        'Become a verified Pioneer on Neesh. Review startup ideas in your domain, set your own fee, and build a permanent SEO-indexed profile.'
      );
    }
  }, []);

  // Section Z.4: Exactly 5 items in Explorer Offer Stack (no more, no less)
  const explorerOfferStack = [
    {
      title: "Browse 3 real Sparks before signing up",
      description: "Preview actual founder questions and hypotheses in your domain before creating an account.",
    },
    {
      title: "Set your own fee (grade-based)",
      description: "Charge between ₹100 and ₹10,000 per interaction based on your objective Pioneer Grade.",
    },
    {
      title: "Commission-free 90 days (Founding Explorer)",
      description: "The first 65 verified Explorers pay 0% platform commission on all earnings for 90 days.",
    },
    {
      title: "₹2,500 earnings baseline (Founding Explorer)",
      description: "If your Day 30 earnings shortfall is below ₹2,500, Neesh automatically credits the difference.",
    },
    {
      title: "Permanent Pioneer profile (public, SEO-indexed)",
      description: "A verifiable public profile showcasing your domain track record, points, and verified ratings.",
    },
  ];

  // Task 9 (V19-B): Grade progression table
  const gradeRoadmap = [
    { grade: 'SEED', interactions: 0, war: '—', range: '₹100–₹500' },
    { grade: 'RISING', interactions: 5, war: '3.80+', range: '₹200–₹800' },
    { grade: 'PRO', interactions: 15, war: '4.00+', range: '₹800–₹3,000' },
    { grade: 'MASTER', interactions: 30, war: '4.30+', range: '₹3,000–₹6,000' },
    { grade: 'ELITE', interactions: 50, war: '4.50+', range: '₹6,000–₹10,000' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
        {/* Hero Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" /> For Industry Explorers
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            Monetize Your Domain Experience as a Pioneer
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-8">
            Review real startup hypotheses on your schedule. Build an enduring on-chain and search-indexed record of your domain insight.
          </p>

          {/* Task 1: Domain Proof Widget below hero */}
          <div className="flex justify-center mb-8">
            <DomainProofWidget />
          </div>

          <div className="flex justify-center gap-4">
            <Link
              to="/signup"
              className="px-8 py-3.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2"
            >
              Join as Explorer <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Explorer Offer Stack (Strictly 5 Items - Section Z.4) */}
        <div className="mt-12 bg-slate-900/60 border border-slate-800 rounded-2xl p-8 shadow-xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">The Explorer Value Stack</h2>
            <p className="text-sm text-slate-400">Pure meritocracy: objective ratings, transparent fees, permanent credit.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {explorerOfferStack.map((item, index) => (
              <div
                key={index}
                className={`p-5 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 transition-all ${
                  index === 4 ? 'sm:col-span-2' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-white text-base mb-1">{item.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{item.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Task 9: V19-B Elite Tier Roadmap */}
        <div className="mt-12 bg-slate-900/60 border border-slate-800 rounded-2xl p-8 shadow-xl">
          <div className="flex items-center gap-2 mb-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider">
            <TrendingUp className="w-4 h-4" /> Grade Progression
          </div>
          <h2 className="text-2xl font-bold mb-3">Pioneer Grade Progression & Fee Ceilings</h2>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            Your Pioneer grade grows with every interaction. Elite grade (50 completed paid interactions, 4.5+ average rating) unlocks ₹10,000/interaction and direct outreach from top-tier founders. Your profile and grade are permanent — they compound over time.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase">
                  <th className="py-3 px-4">Pioneer Grade</th>
                  <th className="py-3 px-4">Interactions Required</th>
                  <th className="py-3 px-4">WAR Required</th>
                  <th className="py-3 px-4">Allowed Fee Range</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {gradeRoadmap.map((tier) => (
                  <tr key={tier.grade} className="hover:bg-slate-800/20">
                    <td className="py-3 px-4 font-semibold">
                      <PioneerGradeBadge grade={tier.grade} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-medium">
                      {tier.interactions === 0 ? '0 (Entry)' : `${tier.interactions}+ verified`}
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-medium">
                      {tier.war}
                    </td>
                    <td className="py-3 px-4 text-emerald-400 font-semibold">
                      {tier.range}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <FooterSection />
    </div>
  );
};

export default ForExplorers;
