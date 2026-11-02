import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import FooterSection from '@/components/sections/FooterSection';
import {
  Sparkles,
  Rocket,
  ShieldAlert,
  Wallet,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  Eye,
} from 'lucide-react';

interface SparkSummary {
  id: string;
  title: string;
  pitch: string;
  state: string;
  interactionCount: number;
  domain: string;
}

interface ActiveSprintSummary {
  id: string;
  state: string;
  daysPurchased: number;
  daysRemaining: number;
  pioneerInteractionCount: number;
  guaranteeEligible: boolean;
  claimWindowClosesAt?: string;
  ineligibilityReason?: string;
}

interface FounderDashboardData {
  sparks: SparkSummary[];
  activeSprints: ActiveSprintSummary[];
  accountBalance: number;
  accountBalancePaise?: string;
  pendingSprintCost: number;
}

export const FounderDashboard: React.FC = () => {
  const [data, setData] = useState<FounderDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Founder Dashboard — Sprints & Sparks | Neesh";

    const fetchDashboard = async () => {
      try {
        const res = await fetch('/api/dashboard/founder');
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        // Fallback default state
        setData({
          sparks: [],
          activeSprints: [],
          accountBalance: 0,
          pendingSprintCost: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const claimableSprint = data?.activeSprints.find((s) => s.state === 'GUARANTEE_CLAIMABLE');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        {/* Guarantee Claim Banner (Section W.6.3, Y.10.2) */}
        {claimableSprint && (
          <div
            className="mb-8 p-5 rounded-2xl border text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4"
            style={{ backgroundColor: '#EF4444', borderColor: '#DC2626' }}
          >
            <div className="flex items-center gap-3.5">
              <ShieldAlert className="w-6 h-6 text-white flex-shrink-0" />
              <div>
                <h3 className="font-extrabold text-base">Sprint Guarantee Refund Ready to Claim</h3>
                <p className="text-xs text-red-100">
                  Your 7-day Sprint concluded with fewer than 3 verified Pioneer interactions. Claim 100% full refund back to your balance.
                </p>
              </div>
            </div>
            <Link
              to={`/sprint/${claimableSprint.id}`}
              className="px-5 py-2.5 rounded-xl bg-white text-red-600 font-extrabold text-xs uppercase tracking-wider hover:bg-red-50 transition-all shadow-md shrink-0"
            >
              Claim Refund Now →
            </Link>
          </div>
        )}

        {/* Dashboard Header & Balance */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" /> Founder Workspace
            </div>
            <h1 className="text-3xl font-extrabold text-white">Startup Operations</h1>
          </div>

          {/* Account Balance Widget */}
          <div className="flex items-center gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:px-6 shadow-md">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
                Account Balance
              </span>
              <span className="text-xl font-black text-white">
                ₹{loading ? '...' : (data?.accountBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <Link
              to="/dashboard/wallet"
              className="ml-2 text-xs text-indigo-400 hover:text-indigo-300 font-bold transition-colors"
            >
              Wallet →
            </Link>
          </div>
        </div>

        {/* Active Sprints Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Rocket className="w-5 h-5 text-indigo-400" /> Active Sprints
            </h2>
            <Link
              to="/pricing"
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Sprint Pricing (₹84/day) →
            </Link>
          </div>

          {loading ? (
            <div className="h-32 bg-slate-900/40 border border-slate-800 rounded-2xl animate-pulse" />
          ) : data?.activeSprints && data.activeSprints.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-6">
              {data.activeSprints.map((sprint) => {
                const count = sprint.pioneerInteractionCount || 0;
                const progressPct = Math.min(100, Math.round((count / 3) * 100));

                return (
                  <div
                    key={sprint.id}
                    className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 border border-blue-500/30 text-blue-400">
                        {sprint.state}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        {sprint.daysRemaining} days remaining
                      </span>
                    </div>

                    {/* Sprint Gauge Widget: Pioneer Interaction Progress (Count / 3) */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-slate-300 font-semibold">Pioneer Guarantee Progress:</span>
                        <span className="font-bold text-white">{count} / 3 Interactions</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs text-slate-400">
                      <span>{sprint.daysPurchased}-day sprint duration</span>
                      <Link
                        to={`/sprint/${sprint.id}`}
                        className="text-indigo-400 font-bold hover:underline"
                      >
                        Sprint Details →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 text-center">
              <Rocket className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-300">No active sprints running</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Accelerate customer validation with a 7-day Sprint. 3 Pioneer interactions guaranteed or full credits back.
              </p>
              <Link
                to="/pricing"
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
              >
                Start Sprint (₹84/day) <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* My Sparks Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" /> My Sparks
            </h2>
            <Link
              to="/onboarding/founder"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Post New Spark
            </Link>
          </div>

          {loading ? (
            <div className="h-40 bg-slate-900/40 border border-slate-800 rounded-2xl animate-pulse" />
          ) : data?.sparks && data.sparks.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {data.sparks.map((spark) => (
                <div
                  key={spark.id}
                  className="p-5 rounded-xl border border-slate-800 bg-slate-900/50 hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                        {spark.domain}
                      </span>
                      <span className="text-xs text-slate-500">{spark.interactionCount} responses</span>
                    </div>
                    <h3 className="font-bold text-white text-base mb-1">{spark.title}</h3>
                    <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed mb-4">
                      "{spark.pitch}"
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-800/60 text-xs">
                    <span className="text-slate-500 uppercase font-semibold text-[10px]">State: {spark.state}</span>
                    <Link
                      to={`/spark/${spark.id}`}
                      className="text-indigo-400 font-bold hover:underline inline-flex items-center gap-1"
                    >
                      View Details <Eye className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-10 rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 text-center">
              <Sparkles className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white mb-1">You haven't posted a Spark yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
                Post your idea hypothesis in 3 simple sentences to gather real feedback from domain Pioneers.
              </p>
              <Link
                to="/onboarding/founder"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-md"
              >
                Post Your First Spark <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </main>

      <FooterSection />
    </div>
  );
};
export default FounderDashboard;

