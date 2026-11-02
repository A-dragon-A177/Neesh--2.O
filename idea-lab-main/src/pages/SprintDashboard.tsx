import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldAlert,
  CheckCircle,
  Clock,
  Star,
  Send,
  MessageSquare,
  AlertCircle,
  Award,
} from 'lucide-react';
import { PioneerGradeBadge } from '@/components/pioneer/PioneerGradeBadge';

interface SprintSession {
  id: string;
  spotlight_id: string;
  founder_id: string;
  days_purchased: number;
  amount_paise: string;
  state: string;
  guarantee_eligible: boolean;
  pioneer_count: number;
  started_at?: string;
  expires_at?: string;
  claim_window_opens_at?: string;
  claim_window_closes_at?: string;
  ineligibility_reason?: string;
}

interface Interaction {
  id: string;
  explorer_id: string;
  content: string;
  founder_response?: string;
  founder_rating?: number;
  state: string;
  created_at: string;
  explorer?: {
    full_name?: string;
    pioneer_grade?: string;
    headline?: string;
  };
}

export const SprintDashboard: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [session, setSession] = useState<SprintSession | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [claiming, setClaiming] = useState<boolean>(false);
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Response form state
  const [activeResponseId, setActiveResponseId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState<string>('');
  const [submittingResponse, setSubmittingResponse] = useState<boolean>(false);

  useEffect(() => {
    fetchSessionData();
  }, [id]);

  const fetchSessionData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      const res = await fetch(`/api/sprints/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSession(data);
      } else {
        // Fallback simulated session for demo
        setSession({
          id,
          spotlight_id: 'spotlight-1',
          founder_id: 'founder-1',
          days_purchased: 7,
          amount_paise: '58800',
          state: 'ACTIVE',
          guarantee_eligible: true,
          pioneer_count: 2,
          started_at: new Date(Date.now() - 3 * 86400000).toISOString(),
          expires_at: new Date(Date.now() + 4 * 86400000).toISOString(),
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load Sprint session');
    } finally {
      setLoading(false);
    }
  };

  const handleClaimGuarantee = async () => {
    if (!id) return;
    setClaiming(true);
    setError(null);
    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      const res = await fetch(`/api/sprints/${id}/guarantee-claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit guarantee claim');
      }

      setClaimSuccess('Guarantee claim submitted! 100% of Sprint fee credited to your account balance.');
      if (session) {
        setSession({ ...session, state: 'GUARANTEE_CLAIMED' });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setClaiming(false);
    }
  };

  const handleSendResponse = async (interactionId: string) => {
    if (!responseText.trim()) return;
    setSubmittingResponse(true);
    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      const res = await fetch(`/api/interactions/${interactionId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ responseText }),
      });

      if (res.ok) {
        setInteractions((prev) =>
          prev.map((i) =>
            i.id === interactionId
              ? { ...i, founder_response: responseText, state: 'RESPONDED' }
              : i
          )
        );
        setActiveResponseId(null);
        setResponseText('');
      }
    } catch (err) {
      console.error('Failed to submit response:', err);
    } finally {
      setSubmittingResponse(false);
    }
  };

  const handleRate = async (interactionId: string, rating: number) => {
    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      const res = await fetch(`/api/interactions/${interactionId}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rating }),
      });

      if (res.ok) {
        setInteractions((prev) =>
          prev.map((i) =>
            i.id === interactionId
              ? { ...i, founder_rating: rating, state: 'RATED' }
              : i
          )
        );
      }
    } catch (err) {
      console.error('Failed to rate interaction:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        Loading Sprint Dashboard...
      </div>
    );
  }

  const isClaimable = session?.state === 'GUARANTEE_CLAIMABLE';
  const isClaimed = session?.state === 'GUARANTEE_CLAIMED';
  const pioneerThreshold = 3;
  const pioneerCount = session?.pioneer_count || 0;
  const guaranteeProgress = Math.min(100, (pioneerCount / pioneerThreshold) * 100);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Guarantee Claim Banner in Section W.6.3 Red (#EF4444) */}
        {isClaimable && (
          <div
            className="p-5 rounded-2xl border text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4"
            style={{
              backgroundColor: '#EF4444',
              borderColor: '#DC2626',
            }}
          >
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-6 h-6 flex-shrink-0 text-white mt-0.5" />
              <div>
                <h2 className="text-lg font-bold">100% Sprint Guarantee Claim Available</h2>
                <p className="text-sm opacity-95 mt-0.5">
                  Your 7-day Sprint concluded with {pioneerCount} of 3 guaranteed Rising Pioneers.
                  Claim your full ₹{Number(session?.amount_paise || 58800) / 100} account credit refund.
                </p>
                {session?.claim_window_closes_at && (
                  <div className="text-xs opacity-90 mt-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Claim window closes on{' '}
                    {new Date(session.claim_window_closes_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              disabled={claiming}
              onClick={handleClaimGuarantee}
              className="px-6 py-3 rounded-xl font-bold bg-white text-red-600 hover:bg-slate-100 active:bg-slate-200 transition-all shadow-md flex-shrink-0 whitespace-nowrap disabled:opacity-50"
            >
              {claiming ? 'Claiming...' : 'Claim 100% Credit'}
            </button>
          </div>
        )}

        {/* Claimed Banner */}
        {isClaimed && (
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-400" />
            <div>
              <span className="font-semibold">Sprint Guarantee Claimed: </span>
              Full Sprint fee credited to your account balance.
            </div>
          </div>
        )}

        {claimSuccess && (
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-400" />
            <span>{claimSuccess}</span>
          </div>
        )}

        {/* Sprint Header & Gauge Widget */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5" /> Active Sprint
              </div>
              <h1 className="text-2xl font-bold mt-1">Sprint Performance & Gauge</h1>
            </div>
            <div className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs font-medium text-slate-300">
              State: <span className="font-bold text-white">{session?.state}</span>
            </div>
          </div>

          {/* Guarantee Gauge Progress */}
          <div className="bg-slate-950/60 rounded-xl p-5 border border-slate-800/80 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-400" /> Pioneer Guarantee Progress
              </span>
              <span className="text-sm font-bold text-indigo-400">
                {pioneerCount} / {pioneerThreshold} Rising+ Pioneers
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  pioneerCount >= pioneerThreshold ? 'bg-emerald-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${guaranteeProgress}%` }}
              />
            </div>
            <div className="text-xs text-slate-400 mt-2 flex justify-between">
              <span>Goal: 3 verified Rising, Pro, Master, or Elite Pioneers</span>
              <span>
                {pioneerCount >= pioneerThreshold ? '✓ Guarantee Fulfilled' : 'In Progress'}
              </span>
            </div>
          </div>
        </div>

        {/* Interactions Thread */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-400" /> Pioneer Interaction Thread
          </h2>

          {interactions.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No pioneer interactions recorded yet. Verified domain Pioneers will review your spotlight shortly.
            </div>
          ) : (
            <div className="space-y-6">
              {interactions.map((interaction) => (
                <div
                  key={interaction.id}
                  className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-5 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="font-semibold text-sm">
                        {interaction.explorer?.full_name || 'Verified Explorer'}
                      </div>
                      <PioneerGradeBadge
                        grade={interaction.explorer?.pioneer_grade || 'RISING'}
                        size="sm"
                      />
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(interaction.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                    {interaction.content}
                  </p>

                  {/* Founder Response */}
                  {interaction.founder_response ? (
                    <div className="bg-slate-900/80 border-l-2 border-indigo-500 p-3 rounded-r-lg text-sm text-slate-300">
                      <div className="text-xs font-semibold text-indigo-400 mb-1">Founder Response:</div>
                      {interaction.founder_response}
                    </div>
                  ) : activeResponseId === interaction.id ? (
                    <div className="space-y-2 pt-2">
                      <textarea
                        rows={3}
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        placeholder="Write your response to this pioneer's feedback..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveResponseId(null)}
                          className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={submittingResponse || !responseText.trim()}
                          onClick={() => handleSendResponse(interaction.id)}
                          className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Send className="w-3.5 h-3.5" /> Send Response
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveResponseId(interaction.id);
                        setResponseText('');
                      }}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                    >
                      + Respond to Pioneer
                    </button>
                  )}

                  {/* Rating Widget */}
                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                    <span>Rate Interaction Depth:</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => handleRate(interaction.id, star)}
                          className={`p-1 transition-colors ${
                            (interaction.founder_rating || 0) >= star
                              ? 'text-amber-400'
                              : 'text-slate-700 hover:text-slate-500'
                          }`}
                        >
                          <Star className="w-4 h-4 fill-current" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SprintDashboard;

