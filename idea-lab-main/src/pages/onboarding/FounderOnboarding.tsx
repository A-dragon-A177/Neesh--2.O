import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import FooterSection from '@/components/sections/FooterSection';
import { DomainProofWidget } from '@/components/DomainProofWidget';
import { Sparkles, ArrowRight, CheckCircle2, AlertCircle, Rocket, Layers } from 'lucide-react';

interface DomainItem {
  id: string;
  name: string;
  slug: string;
  isOpen: boolean;
  activeFounderCount?: number;
}

export const FounderOnboarding: React.FC = () => {
  const navigate = useNavigate();

  // State machine: 1 = Domain Selection, 2 = Post Spark, 3 = Confirmation
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form state
  const [domains, setDomains] = useState<DomainItem[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<DomainItem | null>(null);
  const [sparkTitle, setSparkTitle] = useState('');
  const [sparkBody, setSparkBody] = useState('');
  const [createdSparkId, setCreatedSparkId] = useState<string | null>(null);

  // Validation & UI state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Founder Onboarding — Post Your Spark | Neesh";

    // Fetch active domains
    const fetchDomains = async () => {
      try {
        const res = await fetch('/api/domains');
        if (res.ok) {
          const data = await res.json();
          const items = (data.domains || data || []).map((d: any) => ({
            id: d.id,
            name: d.name,
            slug: d.slug,
            isOpen: d.is_open ?? (d.activeFounderCount >= 5),
            activeFounderCount: d.activeFounderCount || 0,
          }));
          setDomains(items);
          if (items.length > 0) setSelectedDomain(items[0]);
        }
      } catch (err) {
        // Fallback standard domains
        const defaults: DomainItem[] = [
          { id: 'dom-1', name: 'B2B SaaS', slug: 'b2b-saas', isOpen: true, activeFounderCount: 8 },
          { id: 'dom-2', name: 'FinTech', slug: 'fintech', isOpen: true, activeFounderCount: 6 },
          { id: 'dom-3', name: 'HealthTech', slug: 'healthtech', isOpen: false, activeFounderCount: 3 },
          { id: 'dom-4', name: 'AI & Developer Tools', slug: 'ai-developer-tools', isOpen: true, activeFounderCount: 11 },
          { id: 'dom-5', name: 'EdTech', slug: 'edtech', isOpen: false, activeFounderCount: 4 },
        ];
        setDomains(defaults);
        setSelectedDomain(defaults[0]);
      }
    };

    fetchDomains();
  }, []);

  // Sentence count calculation: matches ending punctuation (. ? !)
  const countSentences = (text: string): number => {
    const matches = text.match(/[^.!?]+[.!?]+(\s|$)/g);
    return matches ? matches.length : (text.trim().length > 0 ? 1 : 0);
  };

  const sentenceCount = countSentences(sparkBody);
  const isContentLengthValid = sparkBody.trim().length >= 50 && sparkBody.trim().length <= 300;
  const isSentenceCountValid = sentenceCount >= 2 && sentenceCount <= 4;

  const handlePostSpark = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedDomain) {
      setErrorMsg('Please select a domain for your startup idea.');
      return;
    }

    if (!sparkTitle.trim()) {
      setErrorMsg('Please enter a startup title (max 80 characters).');
      return;
    }

    if (sparkBody.trim().length < 50) {
      setErrorMsg('Spark content must be at least 50 characters.');
      return;
    }

    if (sparkBody.trim().length > 300) {
      setErrorMsg('Spark content must not exceed 300 characters.');
      return;
    }

    if (!isSentenceCountValid) {
      setErrorMsg('Please provide your idea in 2 to 4 sentences (recommended: 3 clear sentences).');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/sparks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain_id: selectedDomain.id,
          domain: selectedDomain.slug,
          title: sparkTitle.trim(),
          content: sparkBody.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to post spark');
      }

      setCreatedSparkId(data.id);
      setStep(3); // Advance to confirmation
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating spark. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 mb-10">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
            step === 1 ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400'
          }`}>
            <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px]">1</span>
            Domain
          </div>
          <div className="w-6 h-px bg-slate-800" />
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
            step === 2 ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400'
          }`}>
            <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px]">2</span>
            Post Spark
          </div>
          <div className="w-6 h-px bg-slate-800" />
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
            step === 3 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-400'
          }`}>
            <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px]">3</span>
            Confirmation
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: DOMAIN SELECTION */}
        {step === 1 && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
            <div className="mb-8">
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">Step 1 of 3</span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">Select Your Industry Domain</h1>
              <p className="text-sm text-slate-400 mt-2">
                Pioneers evaluate your startup inside focused domain pools. Choose the domain that best represents your core customer.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {domains.map((dom) => {
                const isSelected = selectedDomain?.id === dom.id;
                return (
                  <button
                    key={dom.id}
                    type="button"
                    onClick={() => setSelectedDomain(dom)}
                    className={`text-left p-5 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                        : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-base text-white">{dom.name}</span>
                      {isSelected && <CheckCircle2 className="w-5 h-5 text-indigo-400" />}
                    </div>

                    {/* Section N Domain Open Commitment status */}
                    <div className="text-xs">
                      {dom.isOpen ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          Explorer signup open
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-amber-400 font-medium">
                          <span className="w-2 h-2 rounded-full bg-amber-400" />
                          {dom.activeFounderCount || 2} of 5 founders committed
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                disabled={!selectedDomain}
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-md disabled:opacity-50"
              >
                Continue to Step 2 <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: POST YOUR SPARK */}
        {step === 2 && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">Step 2 of 3</span>
                <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full font-medium">
                  Domain: {selectedDomain?.name}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">Post Your Startup Spark</h1>
              <p className="text-sm text-slate-400 mt-2">
                A Spark is a concise 3-sentence summary of your startup concept. Verified Pioneers review it to provide targeted feedback.
              </p>
            </div>

            <form onSubmit={handlePostSpark} className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Startup Title / Project Name <span className="text-slate-500">({sparkTitle.length}/80)</span>
                </label>
                <input
                  type="text"
                  maxLength={80}
                  value={sparkTitle}
                  onChange={(e) => setSparkTitle(e.target.value)}
                  placeholder="e.g., NexaFlow — Real-time Churn Automation"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Your 3-Sentence Spark Body
                  </label>
                  <span className={`text-xs ${
                    isContentLengthValid ? 'text-emerald-400 font-semibold' : 'text-slate-500'
                  }`}>
                    {sparkBody.length} / 300 chars · {sentenceCount} sentences (2–4 allowed)
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={sparkBody}
                  onChange={(e) => setSparkBody(e.target.value)}
                  placeholder="Sentence 1: What problem are you solving? Sentence 2: How does your solution work? Sentence 3: What is your primary hypothesis or biggest question for domain experts?"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors leading-relaxed"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Keep it between 50 and 300 characters. Punctuate each sentence with a period, question mark, or exclamation point.
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  ← Back to Domain Selection
                </button>

                <button
                  type="submit"
                  disabled={loading || !sparkTitle.trim() || !isContentLengthValid || !isSentenceCountValid}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-md disabled:opacity-50"
                >
                  {loading ? 'Posting...' : 'Post Spark (Free)'} <Sparkles className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 3: CONFIRMATION & NEXT STEPS */}
        {step === 3 && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-5 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Spark Activated</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 mb-3">
              Your Spark is Live!
            </h1>
            <p className="text-sm text-slate-300 max-w-lg mx-auto mb-8 leading-relaxed">
              Your startup is now published to the <strong>{selectedDomain?.name}</strong> domain pool. Verified Explorers and Pioneers will review your concept and provide structured signals.
            </p>

            {/* Embedded Domain Proof Feed Widget */}
            <div className="max-w-md mx-auto mb-8 text-left">
              <div className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider text-center">
                Live Domain Activity
              </div>
              <DomainProofWidget slug={selectedDomain?.slug} />
            </div>

            {/* Next Step CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 border-t border-slate-800">
              <Link
                to={createdSparkId ? `/spark/${createdSparkId}` : `/dashboard/founder`}
                className="w-full sm:w-auto px-6 py-3 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200 font-bold text-sm transition-all"
              >
                View Your Spark
              </Link>
              <Link
                to={createdSparkId ? `/sprint/checkout?spark_id=${createdSparkId}` : `/pricing`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-500/25"
              >
                Upgrade to 7-Day Sprint (₹588) <Rocket className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </main>

      <FooterSection />
    </div>
  );
};
export default FounderOnboarding;

