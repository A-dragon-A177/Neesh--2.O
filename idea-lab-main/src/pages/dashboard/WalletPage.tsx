import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import FooterSection from '@/components/sections/FooterSection';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  X,
} from 'lucide-react';

interface LedgerRow {
  id: string;
  type: 'CREDIT' | 'DEBIT';
  reason: string;
  humanReason: string;
  amount_paise: number;
  amount_rupees: number;
  state: 'COMPLETED' | 'PENDING';
  created_at: string;
}

interface WalletData {
  balancePaise: number;
  balanceRupees: number;
  entries: LedgerRow[];
}

export const WalletPage: React.FC = () => {
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  useEffect(() => {
    document.title = "Wallet & Ledger — Account Balance | Neesh";

    const fetchWallet = async () => {
      try {
        const res = await fetch('/api/wallet');
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        setData({
          balancePaise: 0,
          balanceRupees: 0,
          entries: [],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchWallet();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" /> Immutable Double-Entry Ledger
          </div>
          <h1 className="text-3xl font-extrabold text-white">Neesh Wallet</h1>
          <p className="text-sm text-slate-400 mt-1">
            All credits, sprint purchases, escrow holds, and guarantee refunds are append-only recorded with cryptographic auditability.
          </p>
        </div>

        {/* Balance Card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 mb-10 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-md">
              <Wallet className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider text-slate-400 font-bold block mb-1">
                Available Account Balance
              </span>
              <span className="text-3xl sm:text-4xl font-black text-white">
                ₹{loading ? '...' : (data?.balanceRupees || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowWithdrawModal(true)}
              className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm transition-all border border-slate-700 shadow-sm"
            >
              Withdraw
            </button>
          </div>
        </div>

        {/* Ledger Transaction History */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-400" /> Transaction History
          </h2>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            {loading ? (
              <div className="p-8 text-center text-slate-500 text-sm">Loading ledger history...</div>
            ) : data?.entries && data.entries.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-xs uppercase tracking-wider">
                      <th className="py-3.5 px-6">Date</th>
                      <th className="py-3.5 px-6">Description</th>
                      <th className="py-3.5 px-6">Type</th>
                      <th className="py-3.5 px-6">Status</th>
                      <th className="py-3.5 px-6 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {data.entries.map((entry) => {
                      const isCredit = entry.type === 'CREDIT';
                      const formattedDate = new Date(entry.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      });

                      return (
                        <tr key={entry.id} className="hover:bg-slate-800/20 transition-colors">
                          <td className="py-4 px-6 text-slate-400 text-xs whitespace-nowrap">
                            {formattedDate}
                          </td>
                          <td className="py-4 px-6 font-semibold text-white">
                            {entry.humanReason}
                          </td>
                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              isCredit
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                              {isCredit ? (
                                <>
                                  <ArrowDownLeft className="w-3 h-3" /> Credit
                                </>
                              ) : (
                                <>
                                  <ArrowUpRight className="w-3 h-3" /> Debit
                                </>
                              )}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-xs text-slate-400">
                              {entry.state}
                            </span>
                          </td>
                          <td className={`py-4 px-6 text-right font-black whitespace-nowrap ${
                            isCredit ? 'text-emerald-400' : 'text-slate-300'
                          }`}>
                            {isCredit ? '+' : '-'}₹{entry.amount_rupees.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-10 text-center">
                <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-400">No transactions recorded yet</p>
                <p className="text-xs text-slate-600 mt-1">
                  Transactions appear as you purchase Sprints, receive interaction fees, or claim guarantee refunds.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Task 7: V19 Withdraw Modal Placeholder */}
        {showWithdrawModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
              <button
                type="button"
                onClick={() => setShowWithdrawModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
                <Wallet className="w-6 h-6" />
              </div>

              <h3 className="text-lg font-bold text-white mb-2">Withdrawal Notice</h3>
              <p className="text-sm text-slate-300 leading-relaxed mb-6">
                Withdrawals available in V20 — earnings are safe in your account.
              </p>

              <button
                type="button"
                onClick={() => setShowWithdrawModal(false)}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-md"
              >
                Understood
              </button>
            </div>
          </div>
        )}
      </main>

      <FooterSection />
    </div>
  );
};
export default WalletPage;

