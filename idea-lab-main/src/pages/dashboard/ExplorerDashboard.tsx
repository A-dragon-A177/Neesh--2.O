import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import FooterSection from '@/components/sections/FooterSection';
import { PioneerGradeBadge, PioneerGrade } from '@/components/pioneer/PioneerGradeBadge';
import { FoundingExplorerBadge } from '@/components/FoundingExplorerBadge';
import {
  Sparkles,
  TrendingUp,
  MessageSquare,
  Clock,
  Wallet,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

interface ActiveInteraction {
  id: string;
  state: string;
  sparkDomain: string;
  founderRating?: number | null;
  fee_paise: string;
}

interface PendingDirectRequest {
  id: string;
  fee_paise: string;
  expiresAt: string;
}

interface ExplorerDashboardData {
  pioneerGrade: PioneerGrade;
  pioneerPoints: number;
  gradeProgressPercent: number;
  activeInteractions: ActiveInteraction[];
  pendingDirectRequests: PendingDirectRequest[];
  totalEarningsPaise: number;
  totalEarningsRupees?: number;
  commissionFreeUntil?: string | null;
  isFoundingExplorer: boolean;
}

export const ExplorerDashboard: React.FC = () => {
  const [data, setData] = useState<ExplorerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Explorer Dashboard — Pioneer Operations | Neesh";

    const fetchDashboard = async () => {
      try {
        const res = await fetch('/api/dashboard/explorer');
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        // Fallback default state
        setData({
          pioneerGrade: 'RISING',
          pioneerPoints: 145,
          gradeProgressPercent: 62,
          activeInteractions: [],
          pendingDirectRequests: [],
          totalEarningsPaise: 0,
          totalEarningsRupees: 0,
          commissionFreeUntil: null,
          isFoundingExplorer: false,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const totalEarningsRupees = (data?.totalEarningsPaise || 0) / 100;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        {/* Header & Overview Grid */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <ShieldCheck className="w-3.5 h-3.5" /> Verified Pioneer
            </div>
            <h1 className="text-3xl font-extrabold text-white">Explorer Operations</h1>
          </div>

          {/* Earnings summary */}
          <div className="flex items-center gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:px-6 shadow-md">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
                Total Earnings
              </span>
              <span className="text-xl font-black text-white">
                ₹{loading ? '...' : totalEarningsRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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

        {/* Pioneer Grade & Status Card */}
        <div className="mb-10 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <PioneerGradeBadge grade={data?.pioneerGrade || 'SEED'} size="md" />
              {data?.isFoundingExplorer && (
                <FoundingExplorerBadge
                  position={12}
                  commissionFreeUntil={data.commissionFreeUntil}
                />
              )}
            </div>

            <div className="text-sm text-slate-400">
              Pioneer Points: <strong className="text-white text-base">{data?.pioneerPoints || 0}</strong>
            </div>
          </div>

          {/* Grade Progress Bar */}
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-400 font-medium">Progression to Next Pioneer Grade</span>
              <span className="font-bold text-indigo-400">{data?.gradeProgressPercent || 0}% Complete</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-500"
                style={{ width: `${data?.gradeProgressPercent || 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Pending Direct Requests (48h countdown) */}
        {data?.pendingDirectRequests && data.pendingDirectRequests.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" /> Pending Direct Requests (48h Action Required)
            </h2>
            <div className="space-y-3">
              {data.pendingDirectRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-5 rounded-xl border border-amber-500/30 bg-amber-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                        Targeted Review Request
                      </span>
                      <span className="text-xs text-slate-400">· Fee: ₹{Number(req.fee_paise) / 100}</span>
                    </div>
                    <p className="text-xs text-slate-300">
                      A founder has commissioned your direct review. Accept or decline within 48 hours.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300">
                      Decline
                    </button>
                    <button className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-sm">
                      Accept & Review
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Interactions List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-400" /> Active Interactions
            </h2>
            <Link
              to="/space"
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Browse Public Feed →
            </Link>
          </div>

          {loading ? (
            <div className="h-32 bg-slate-900/40 border border-slate-800 rounded-2xl animate-pulse" />
          ) : data?.activeInteractions && data.activeInteractions.length > 0 ? (
            <div className="space-y-3">
              {data.activeInteractions.map((int) => (
                <div
                  key={int.id}
                  className="p-5 rounded-xl border border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-700 transition-all"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                        {int.sparkDomain}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">
                        State: <strong className="text-white">{int.state}</strong>
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      {int.state === 'PENDING'
                        ? 'Requires your response to submit to founder.'
                        : 'Response submitted. Awaiting founder rating.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 font-medium">
                      Payout: ₹{Number(int.fee_paise) / 100}
                    </span>
                    <button className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200">
                      Open Interaction
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-10 rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 text-center">
              <MessageSquare className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white mb-1">No active interactions</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
                Check the Spotlight feed to find live founder questions in your domain and submit verified reviews.
              </p>
              <Link
                to="/space"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-md"
              >
                Browse Spotlight Feed <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </main>

      <FooterSection />
    </div>
  );
};
export default ExplorerDashboard;

