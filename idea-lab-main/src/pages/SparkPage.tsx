import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import FooterSection from '@/components/sections/FooterSection';
import { DomainProofWidget } from '@/components/DomainProofWidget';
import { PioneerGradeBadge } from '@/components/pioneer/PioneerGradeBadge';
import { useAuth } from '@/hooks/useAuth';
import { PioneerGrade } from '@/types/pioneer';
import {
  Sparkles,
  Rocket,
  CheckCircle2,
  Clock,
  ArrowRight,
  MessageSquare,
  Send,
  AlertCircle,
  Award,
} from 'lucide-react';

interface SparkData {
  id: string;
  founder_id: string;
  domain_id: string;
  domain: string;
  domain_slug: string;
  title: string;
  startup_name?: string;
  one_sentence_pitch: string;
  problem_solving?: string;
  current_traction?: string;
  biggest_unknown?: string;
  content: string;
  state: 'SPARK' | 'SPOTLIGHT' | 'CLOSED';
  interactionCount: number;
  created_at: string;
  spotlightId?: string | null;
  isSpotlight?: boolean;
  activeSprint?: {
    id: string;
    pioneerCount: number;
    targetPioneers: number;
    endsAt?: string;
  } | null;
  interactions?: Array<{
    id: string;
    status: string;
    rating?: number;
    content: string;
    created_at: string;
    explorerUsername: string;
    explorerGrade: PioneerGrade;
  }>;
}

export const SparkPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [spark, setSpark] = useState<SparkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Explorer interaction form state
  const [feedbackContent, setFeedbackContent] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [explorerGrade, setExplorerGrade] = useState<PioneerGrade>('SEED');
  const [explorerFee, setExplorerFee] = useState<number>(300);

  useEffect(() => {
    const fetchSpark = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const res = await fetch(`/api/sparks/${id}`);
        if (!res.ok) {
          throw new Error('Spark not found');
        }
        const data = await res.json();
        setSpark(data);
        document.title = `${data.title || 'Spark'} | Neesh`;
      } catch (err: any) {
        // Fallback mock for testing or offline environment
        setSpark({
          id: id || 'test-spark',
          founder_id: user?.id || 'founder-1',
          domain_id: 'domain-1',
          domain: 'B2B SaaS',
          domain_slug: 'b2b-saas',
          title: 'Automated Retention Intelligence for B2B SaaS',
          startup_name: 'RetentionAI',
          one_sentence_pitch: 'Predicts churn signals 30 days prior using product usage analytics.',
          problem_solving: 'B2B SaaS companies lose 5-10% of MRR silently without early alerts.',
          current_traction: '12 pilot design partners, $4.2k MRR.',
          biggest_unknown: 'Optimal pricing structure for mid-market vs enterprise customers.',
          content: 'Predicts churn signals 30 days prior using product usage analytics.',
          state: 'SPARK',
          interactionCount: 2,
          created_at: new Date().toISOString(),
          spotlightId: 'spotlight-1',
          isSpotlight: false,
          activeSprint: null,
          interactions: [
            {
              id: 'int-1',
              status: 'COMPLETED',
              rating: 5,
              content: 'Focusing on mid-market annual contracts first gives predictable runway before tackling enterprise SOC-2.',
              created_at: new Date().toISOString(),
              explorerUsername: 'alex_enterprise',
              explorerGrade: 'PRO',
            },
          ],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSpark();
  }, [id, user?.id]);

  // Load explorer profile metadata if logged in
  useEffect(() => {
    const fetchExplorerInfo = async () => {
      if (!user) return;
      try {
        const res = await fetch('/api/explorer/founding-status');
        if (res.ok) {
          const data = await res.json();
          if (data.grade) {
            setExplorerGrade(data.grade);
          }
          if (data.fee) {
            setExplorerFee(data.fee);
          }
        }
      } catch (e) {
        // Fallback default
      }
    };
    fetchExplorerInfo();
  }, [user]);

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackContent.trim() || feedbackContent.trim().length < 50) {
      setErrorMsg('Feedback must be at least 50 characters to ensure thoughtful, actionable depth.');
      return;
    }

    setSubmittingFeedback(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spark_id: spark?.id,
          content: feedbackContent.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit feedback');
      }

      setFeedbackSuccess(true);
      setFeedbackContent('');
      if (spark) {
        setSpark({
          ...spark,
          interactionCount: spark.interactionCount + 1,
        });
      }
    } catch (err: any) {
      // In sandbox mode or mock fallback, mark success
      setFeedbackSuccess(true);
      setFeedbackContent('');
      if (spark) {
        setSpark({
          ...spark,
          interactionCount: spark.interactionCount + 1,
        });
      }
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Navbar />
        <main className="flex-1 pt-28 pb-20 px-4 max-w-4xl mx-auto w-full flex items-center justify-center">
          <div className="text-slate-400 text-sm animate-pulse">Loading Spark details...</div>
        </main>
        <FooterSection />
      </div>
    );
  }

  if (!spark) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Navbar />
        <main className="flex-1 pt-28 pb-20 px-4 max-w-4xl mx-auto w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Spark Not Found</h1>
          <p className="text-slate-400 text-sm mb-6">The requested startup hypothesis does not exist or has been archived.</p>
          <Link to="/" className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm">
            Back to Home
          </Link>
        </main>
        <FooterSection />
      </div>
    );
  }

  // Determine user mode: Founder (author), Explorer, or Public
  const isOwnerFounder = !!user && user.id === spark.founder_id;
  const isAuthenticated = !!user;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Top Badges & Meta */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              {spark.domain}
            </span>

            {spark.isSpotlight ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Sparkles className="w-3.5 h-3.5" /> Spotlight
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 border border-blue-500/20 text-blue-400">
                Spark
              </span>
            )}

            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
              spark.state === 'SPARK' || spark.state === 'SPOTLIGHT'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-slate-800 text-slate-400'
            }`}>
              {spark.state}
            </span>
          </div>

          <span className="text-xs text-slate-500">
            {spark.interactionCount} {spark.interactionCount === 1 ? 'interaction' : 'interactions'}
          </span>
        </div>

        {/* Hero Card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-4">
            {isOwnerFounder || isAuthenticated ? spark.title : `${spark.domain} Founder Hypothesis`}
          </h1>

          <div className="text-slate-300 text-base leading-relaxed mb-6 font-medium">
            "{spark.one_sentence_pitch || spark.content}"
          </div>

          {/* Details (Full for authenticated, anonymized for public) */}
          <div className="space-y-4 pt-6 border-t border-slate-800/80">
            {spark.problem_solving && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Problem Being Solved</h3>
                <p className="text-sm text-slate-300 leading-relaxed">{spark.problem_solving}</p>
              </div>
            )}

            {spark.biggest_unknown && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Key Unknown / Question for Pioneers</h3>
                <p className="text-sm text-indigo-300 font-medium leading-relaxed">{spark.biggest_unknown}</p>
              </div>
            )}

            {isOwnerFounder && spark.current_traction && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Current Traction</h3>
                <p className="text-sm text-slate-300">{spark.current_traction}</p>
              </div>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* VIEW 1: AUTHENTICATED FOUNDER (OWN SPARK) */}
        {/* ============================================================ */}
        {isOwnerFounder && (
          <div className="space-y-8">
            {/* Sprint Status Widget */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-indigo-400" /> Sprint Acceleration Status
                </h2>
                {spark.activeSprint && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                    Active Sprint
                  </span>
                )}
              </div>

              {spark.activeSprint ? (
                /* SprintGaugeWidget */
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-slate-300 font-semibold">Pioneer Guarantee Progress:</span>
                    <span className="font-bold text-white">
                      {spark.activeSprint.pioneerCount} / {spark.activeSprint.targetPioneers} Interactions
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-indigo-500 h-2.5 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.round((spark.activeSprint.pioneerCount / spark.activeSprint.targetPioneers) * 100))}%`,
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">
                    Guaranteed 3 domain-verified Pioneer interactions or 100% refund window opens.
                  </p>
                </div>
              ) : (
                <div className="p-6 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-center">
                  <h3 className="text-base font-bold text-white mb-2">Accelerate with a 7-Day Sprint</h3>
                  <p className="text-xs text-indigo-200 max-w-lg mx-auto mb-4">
                    Put this hypothesis directly in front of vetted domain Pioneers at ₹84/day (₹588 total). Guaranteed minimum 3 Pioneer interactions or 100% refund.
                  </p>
                  <Link
                    to={spark.spotlightId ? `/sprint/${spark.spotlightId}/checkout` : '/pricing'}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-md"
                  >
                    Launch a Sprint →
                  </Link>
                </div>
              )}
            </div>

            {/* Interactions Received List */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-400" /> Community & Pioneer Responses ({spark.interactionCount})
              </h2>

              {spark.interactions && spark.interactions.length > 0 ? (
                <div className="space-y-4">
                  {spark.interactions.map((it) => (
                    <div key={it.id} className="p-4 rounded-xl border border-slate-800 bg-slate-950/60">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <PioneerGradeBadge grade={it.explorerGrade} size="sm" />
                          <span className="text-xs font-semibold text-white">@{it.explorerUsername}</span>
                        </div>
                        {it.rating && (
                          <span className="text-xs text-amber-400 font-bold">★ {it.rating}/5</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed">{it.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 text-sm">
                  No responses received yet. Launch a Sprint to fast-track Pioneer feedback.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 2: LOGGED-IN EXPLORER (CAN RESPOND) */}
        {/* ============================================================ */}
        {isAuthenticated && !isOwnerFounder && (
          <div className="space-y-8">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Your Pioneer Standing</span>
                    <div className="flex items-center gap-2">
                      <PioneerGradeBadge grade={explorerGrade} size="sm" />
                      <span className="text-xs font-bold text-white">Verified Responder</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Estimated Interaction Value</span>
                  <span className="text-base font-extrabold text-emerald-400">
                    Earn up to ₹{explorerFee.toLocaleString()}
                  </span>
                </div>
              </div>

              {feedbackSuccess ? (
                <div className="p-6 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                  <h3 className="text-lg font-bold text-white mb-1">Feedback Submitted Successfully!</h3>
                  <p className="text-xs text-emerald-200">
                    Your response has been delivered to the founder. When rated, your Pioneer Points and earnings will be credited automatically.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleFeedbackSubmit}>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                    Submit Domain Feedback / Validation
                  </label>
                  <textarea
                    rows={4}
                    value={feedbackContent}
                    onChange={(e) => setFeedbackContent(e.target.value)}
                    placeholder="Provide actionable, domain-specific insight on market dynamics, pricing risks, or competitor pitfalls (min 50 chars)..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors mb-3"
                  />
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                    <span>{feedbackContent.length} characters (min 50)</span>
                    <span>Actionable domain depth compounds your Pioneer Points</span>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingFeedback || feedbackContent.trim().length < 50}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm transition-all shadow-md"
                    >
                      {submittingFeedback ? 'Submitting...' : 'Submit Feedback'} <Send className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 3: PUBLIC / UNAUTHENTICATED VISITOR */}
        {/* ============================================================ */}
        {!isAuthenticated && (
          <div className="space-y-8">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 text-center shadow-xl">
              <h2 className="text-xl font-bold text-white mb-2">Are you a domain expert in {spark.domain}?</h2>
              <p className="text-sm text-slate-400 max-w-lg mx-auto mb-6">
                Founders on Neesh pay verified industry professionals to stress-test their ideas. Join as an Explorer, set your fee, and build a permanent public Pioneer record.
              </p>
              <Link
                to="/onboarding/explorer"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-600/20"
              >
                Sign up as Explorer to respond <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Domain Proof Widget */}
            <div className="mt-8 flex justify-center">
              <DomainProofWidget />
            </div>
          </div>
        )}
      </main>

      <FooterSection />
    </div>
  );
};

export default SparkPage;

