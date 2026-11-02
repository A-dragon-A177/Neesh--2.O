import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ShieldCheck, Zap, ArrowRight, CheckCircle2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import FooterSection from '@/components/sections/FooterSection';
import { DomainProofWidget } from '@/components/DomainProofWidget';

export const ForFounders: React.FC = () => {
  useEffect(() => {
    document.title = "Neesh for Founders — High-Velocity Startup Validation";
    
    // Set meta tags
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Validate your startup with domain-specific Pioneers. 3 interactions guaranteed in 7 days or full credits back.');
    }
  }, []);

  // Section Z.4: Exactly 5 items in Founder Offer Stack (no more, no less)
  const founderOfferStack = [
    {
      title: "Post your Spark (free)",
      description: "Submit your idea and domain hypothesis to gather initial signals from verified domain professionals.",
    },
    {
      title: "Sprint ₹84/day",
      description: "Low-friction, high-velocity daily sprint acceleration for focused startup validation.",
    },
    {
      title: "2-day free period + 1 free Sprint day",
      description: "Experience immediate momentum with initial free days included before any commitment.",
    },
    {
      title: "3 Pioneer interactions guaranteed in 7 days or credits back",
      description: "Receive deep, actionable feedback from 3+ Rising Pioneers within a 7-day Sprint or get 100% of credits refunded.",
    },
    {
      title: "Direct Explorer Request",
      description: "Directly commission targeted deep-dive interactions with specific verified industry Pioneers.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
        {/* Hero Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" /> For Startup Founders
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            Real Feedback from Verified Domain Pioneers
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-8">
            Stop pitching into the void. Get structured, high-signal feedback from experienced practitioners in your exact industry.
          </p>

          {/* Task 1: Domain Proof Widget below hero */}
          <div className="flex justify-center mb-8">
            <DomainProofWidget />
          </div>

          <div className="flex justify-center gap-4">
            <Link
              to="/signup"
              className="px-8 py-3.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2"
            >
              Post your Spark (free) <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Founder Offer Stack (Strictly 5 Items - Section Z.4) */}
        <div className="mt-16 bg-slate-900/60 border border-slate-800 rounded-2xl p-8 shadow-xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">The Founder Guarantee & Offer Stack</h2>
            <p className="text-sm text-slate-400">Everything you need to validate your hypothesis with zero risk.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {founderOfferStack.map((item, index) => (
              <div
                key={index}
                className={`p-5 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 transition-all ${
                  index === 4 ? 'sm:col-span-2' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-white text-base mb-1">{item.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{item.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <FooterSection />
    </div>
  );
};

export default ForFounders;

