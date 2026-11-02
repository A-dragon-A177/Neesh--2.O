import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, AlertCircle, ArrowRight, Wallet, Sparkles } from 'lucide-react';
import { SPRINT_DAY_PRICE_PAISE, ALLOWED_SPRINT_DAYS } from '@/constants/pricing';

export const SprintCheckout: React.FC = () => {
  const { spotlightId } = useParams<{ spotlightId: string }>();
  const navigate = useNavigate();

  const [days, setDays] = useState<number>(7);
  const [applyBalance, setApplyBalance] = useState<boolean>(true);
  const [accountBalanceRupees, setAccountBalanceRupees] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Sprint day price in rupees (₹84.00)
  const sprintDayPriceRupees = Number(SPRINT_DAY_PRICE_PAISE) / 100;
  const totalAmountRupees = days * sprintDayPriceRupees;

  // Credit deduction calculation
  const creditsAppliedRupees = applyBalance
    ? Math.min(accountBalanceRupees, totalAmountRupees)
    : 0;
  const chargeAmountRupees = Math.max(0, totalAmountRupees - creditsAppliedRupees);
  const isGuaranteeEligible = days >= 7;

  useEffect(() => {
    // In production, fetch founder's balance from /api/users/balance
    // For initial load, set default or read from session
    setAccountBalanceRupees(0);
  }, []);

  const handlePurchase = async () => {
    if (!spotlightId) {
      setError('Spotlight ID is missing');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      const response = await fetch('/api/sprints/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          spotlightId,
          days,
          applyCredits: applyBalance,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate Sprint purchase');
      }

      if (data.paidWithBalance || data.chargeAmountPaise === '0') {
        // Paid completely via account balance
        navigate(`/sprint/${data.sprintSessionId}?status=success`);
      } else if (data.cashfreeOrderId) {
        // Redirect to Cashfree payment or trigger SDK
        if (data.paymentSessionId && (window as any).Cashfree) {
          const cashfree = (window as any).Cashfree({ mode: 'sandbox' });
          cashfree.checkout({
            paymentSessionId: data.paymentSessionId,
            redirectTarget: '_self',
          });
        } else {
          // Fallback simulation / redirect
          navigate(`/sprint/${data.sprintSessionId}?simulated=true`);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Payment initiation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden p-6 sm:p-8">
        {/* Header */}
        <div className="border-b border-slate-800 pb-6 mb-6">
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm mb-1 uppercase tracking-wider">
            <Sparkles className="w-4 h-4" /> Neesh V19 Sprint
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">Configure Sprint Duration</h1>
          <p className="text-slate-400 text-sm mt-1">
            Activate high-velocity validation from verified domain Pioneers.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Days Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Select Sprint Duration (₹84/day)
          </label>
          <div className="grid grid-cols-5 gap-2 sm:gap-3">
            {ALLOWED_SPRINT_DAYS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={`py-3 rounded-xl border text-center transition-all ${
                  days === d
                    ? 'border-indigo-500 bg-indigo-600/20 text-white font-bold ring-2 ring-indigo-500/30'
                    : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="text-lg font-bold">{d}</div>
                <div className="text-xs opacity-75">Days</div>
              </button>
            ))}
          </div>
        </div>

        {/* Guarantee Banner */}
        <div
          className={`mb-6 p-4 rounded-xl border transition-all ${
            isGuaranteeEligible
              ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
              : 'bg-slate-800/40 border-slate-800 text-slate-400'
          }`}
        >
          <div className="flex items-start gap-3">
            <ShieldCheck className={`w-5 h-5 mt-0.5 ${isGuaranteeEligible ? 'text-emerald-400' : 'text-slate-500'}`} />
            <div>
              <div className="font-semibold text-sm">
                {isGuaranteeEligible
                  ? '3+ Rising Pioneer Guarantee Active'
                  : 'Guarantee Unlocks at 7+ Days'}
              </div>
              <p className="text-xs mt-0.5 opacity-90">
                {isGuaranteeEligible
                  ? 'If fewer than 3 verified Rising+ Pioneers engage during your Sprint, you qualify for an immediate 100% account credit refund.'
                  : 'Select 7 days or more to activate our 3+ Rising Pioneer satisfaction guarantee.'}
              </p>
            </div>
          </div>
        </div>

        {/* Account Balance Toggle */}
        {accountBalanceRupees > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wallet className="w-5 h-5 text-indigo-400" />
              <div>
                <div className="text-sm font-medium">Use Account Balance</div>
                <div className="text-xs text-slate-400">
                  Available: ₹{accountBalanceRupees.toFixed(2)}
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={applyBalance}
              onChange={(e) => setApplyBalance(e.target.checked)}
              className="w-5 h-5 text-indigo-600 rounded bg-slate-900 border-slate-700 focus:ring-indigo-500"
            />
          </div>
        )}

        {/* Price Breakdown */}
        <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/60 space-y-2 mb-6 text-sm">
          <div className="flex justify-between text-slate-400">
            <span>Sprint Duration</span>
            <span>{days} days × ₹84.00</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Gross Total</span>
            <span>₹{totalAmountRupees.toFixed(2)}</span>
          </div>
          {creditsAppliedRupees > 0 && (
            <div className="flex justify-between text-emerald-400">
              <span>Account Credits Applied</span>
              <span>-₹{creditsAppliedRupees.toFixed(2)}</span>
            </div>
          )}
          <div className="border-t border-slate-800 pt-2 flex justify-between font-bold text-base text-white">
            <span>Amount Due</span>
            <span>₹{chargeAmountRupees.toFixed(2)}</span>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="button"
          disabled={loading}
          onClick={handlePurchase}
          className="w-full py-4 px-6 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            'Processing...'
          ) : chargeAmountRupees === 0 ? (
            <>
              Confirm With Balance (₹0 Due) <CheckCircle2 className="w-5 h-5" />
            </>
          ) : (
            <>
              Pay ₹{chargeAmountRupees.toFixed(2)} with Cashfree <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default SprintCheckout;

