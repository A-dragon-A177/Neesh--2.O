import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import FooterSection from '@/components/sections/FooterSection';
import { PioneerGradeBadge, PioneerGrade } from '@/components/pioneer/PioneerGradeBadge';
import { FoundingExplorerBadge } from '@/components/FoundingExplorerBadge';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Linkedin,
  ShieldCheck,
  TrendingUp,
  Award,
  Layers,
} from 'lucide-react';

interface PreviewSpark {
  id: string;
  content: string;
  domain: string;
  domain_slug: string;
  founder_label: string;
  startup_label: string;
  interaction_count: number;
}

interface DomainOption {
  id: string;
  name: string;
  slug: string;
}

export const ExplorerOnboarding: React.FC = () => {
  const navigate = useNavigate();

  // State machine: 1 = Preview Feed, 2 = LinkedIn, 2.5 = Fast-Track, 3 = Setup, 4 = Welcome
  const [step, setStep] = useState<1 | 2 | 2.5 | 3 | 4>(1);

  // Form State
  const [selectedDomainSlug, setSelectedDomainSlug] = useState('b2b-saas');
  const [availableDomains, setAvailableDomains] = useState<DomainOption[]>([
    { id: '1', name: 'B2B SaaS', slug: 'b2b-saas' },
    { id: '2', name: 'FinTech', slug: 'fintech' },
    { id: '3', name: 'HealthTech', slug: 'healthtech' },
    { id: '4', name: 'AI / DevTools', slug: 'ai-devtools' },
    { id: '5', name: 'E-Commerce', slug: 'ecommerce' },
  ]);
  const [showDomainSelector, setShowDomainSelector] = useState(false);
  const [payingFoundersCount, setPayingFoundersCount] = useState(3);
  const [previewSparks, setPreviewSparks] = useState<PreviewSpark[]>([]);
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [yearsInDomain, setYearsInDomain] = useState(3);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [startAsRising, setStartAsRising] = useState(false);

  // Result state
  const [assignedGrade, setAssignedGrade] = useState<PioneerGrade>('SCOUT');
  const [isFoundingExplorer, setIsFoundingExplorer] = useState(false);
  const [foundingPosition, setFoundingPosition] = useState<number | null>(null);
  const [commissionFreeUntil, setCommissionFreeUntil] = useState<string | null>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Explorer Onboarding — Become a Pioneer | Neesh";

    // Load available domains
    const loadDomains = async () => {
      try {
        const res = await fetch('/api/domains');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.domains) && data.domains.length > 0) {
            setAvailableDomains(data.domains);
          }
        }
      } catch (e) {
        // Fallback domains kept
      }
    };
    loadDomains();
  }, []);

  useEffect(() => {
    // Load preview sparks for selected domain
    const loadPreview = async () => {
      try {
        const res = await fetch(`/api/sparks/preview?domain=${selectedDomainSlug}&limit=3`);
        if (res.ok) {
          const data = await res.json();
          setPreviewSparks(data.sparks || []);
          if (data.payingFoundersCount !== undefined) {
            setPayingFoundersCount(data.payingFoundersCount);
          }
        }
      } catch (err) {
        setPreviewSparks([
          {
            id: 'anon-1',
            content: 'Building an automated churn prevention assistant for mid-market subscription companies.',
            domain: 'B2B SaaS',
            domain_slug: 'b2b-saas',
            founder_label: 'B2B SaaS Founder',
            startup_label: '[Early-Stage Product]',
            interaction_count: 4,
          },
          {
            id: 'anon-2',
            content: 'Creating an API orchestration workflow that synchronizes client CRM data with billing gateways.',
            domain: 'B2B SaaS',
            domain_slug: 'b2b-saas',
            founder_label: 'B2B SaaS Founder',
            startup_label: '[Early-Stage Product]',
            interaction_count: 2,
          },
          {
            id: 'anon-3',
            content: 'Self-serve customer onboarding tour generator that detects user hesitation.',
            domain: 'B2B SaaS',
            domain_slug: 'b2b-saas',
            founder_label: 'B2B SaaS Founder',
            startup_label: '[Early-Stage Product]',
            interaction_count: 3,
          },
        ]);
      }
    };

    loadPreview();
  }, [selectedDomainSlug]);

  // Step 2: Validate LinkedIn URL
  const handleVerifyLinkedIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const linkedInPattern = /^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_\-\.\%]+\/?$/i;
    if (!linkedInPattern.test(linkedinUrl.trim())) {
      setErrorMsg('Please enter a valid LinkedIn URL (e.g., https://linkedin.com/in/yourname)');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/explorer/verify-linkedin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkedinUrl: linkedinUrl.trim(),
          yearsInDomain,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'LinkedIn validation failed');
      }

      if (data.isSeniorFastTrack) {
        setStep(2.5); // Senior Fast-Track Acknowledgment
      } else {
        setStep(3); // Standard Domain & Profile Setup
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'LinkedIn verification error');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Complete Enrollment
  const handleCompleteEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!displayName.trim()) {
      setErrorMsg('Please enter a display name for your Pioneer profile.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/explorer/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainSlug: selectedDomainSlug,
          displayName: displayName.trim(),
          username: username.trim() || displayName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_'),
          linkedinUrl: linkedinUrl.trim(),
          yearsInDomain,
          startAsRising,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete explorer enrollment');
      }

      setAssignedGrade(data.pioneerGrade || 'SCOUT');
      setIsFoundingExplorer(Boolean(data.isFoundingExplorer));
      setFoundingPosition(data.foundingPosition);
      setCommissionFreeUntil(data.commissionFreeUntil);
      setStep(4); // Welcome screen
    } catch (err: any) {
      setErrorMsg(err.message || 'Enrollment error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Compute fee preview based on tenure / choices
  const getFeePreview = () => {
    if (yearsInDomain >= 5 && !startAsRising) {
      return { grade: 'PRO' as PioneerGrade, range: '₹800 – ₹3,000' };
    }
    if (yearsInDomain >= 3 || startAsRising) {
      return { grade: 'RISING' as PioneerGrade, range: '₹200 – ₹800' };
    }
    return { grade: 'SCOUT' as PioneerGrade, range: 'Free (Unpaid Entry Tier)' };
  };

  const preview = getFeePreview();

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
            Sparks Preview
          </div>
          <div className="w-6 h-px bg-slate-800" />
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
            step === 2 || step === 2.5 ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400'
          }`}>
            <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px]">2</span>
            LinkedIn
          </div>
          <div className="w-6 h-px bg-slate-800" />
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
            step === 3 ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400'
          }`}>
            <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px]">3</span>
            Profile
          </div>
          <div className="w-6 h-px bg-slate-800" />
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
            step === 4 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-400'
          }`}>
            <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px]">4</span>
            Welcome
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: PREVIEW FEED (SECTION T.1) */}
        {step === 1 && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
            <div className="mb-6">
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">Step 1 of 4 · Explorer Preview</span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">Live Founder Sparks</h1>
              <p className="text-sm text-slate-400 mt-2">
                Browse 3 real sparks before signing up. Verified domain professionals get paid to answer questions and validate concepts.
              </p>
            </div>

            {/* Domain Selector Header */}
            <div className="mb-6 p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Selected Domain
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">
                    {availableDomains.find((d) => d.slug === selectedDomainSlug)?.name || selectedDomainSlug}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300">
                    Active
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDomainSelector(!showDomainSelector)}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition-colors"
                >
                  {showDomainSelector ? 'Close Domains' : 'Pick a different domain'}
                </button>
              </div>
            </div>

            {showDomainSelector && (
              <div className="mb-6 grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                {availableDomains.map((domain) => (
                  <button
                    key={domain.id}
                    type="button"
                    onClick={() => {
                      setSelectedDomainSlug(domain.slug);
                      setShowDomainSelector(false);
                    }}
                    className={`p-2.5 rounded-lg text-left text-xs font-medium transition-all ${
                      selectedDomainSlug === domain.slug
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'bg-slate-900/60 text-slate-300 hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    {domain.name}
                  </button>
                ))}
              </div>
            )}

            {/* Preview Cards */}
            {previewSparks.length > 0 ? (
              <div className="space-y-4 mb-6">
                {previewSparks.slice(0, 3).map((spark, idx) => (
                  <div key={idx} className="p-5 rounded-xl border border-slate-800 bg-slate-900/40">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                        {availableDomains.find((d) => d.slug === selectedDomainSlug)?.name || 'Domain'} Founder
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        {spark.interaction_count || 4} Explorers responded
                      </span>
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed font-medium">
                      "{spark.content.slice(0, 200)}{spark.content.length > 200 ? '...' : ''}"
                    </p>
                  </div>
                ))}
                <p className="text-xs text-slate-400 text-center italic">
                  These are real startup founders looking for feedback from people like you.
                </p>
              </div>
            ) : (
              <div className="mb-6 p-6 rounded-xl border border-amber-500/30 bg-amber-500/10 text-center">
                <p className="text-sm text-amber-200 font-semibold mb-1">
                  Domain Opening in Progress
                </p>
                <p className="text-xs text-amber-300/80">
                  {payingFoundersCount} of 5 paying founders needed before this domain opens for Explorers.
                </p>
              </div>
            )}

            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 mb-8 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-indigo-400 flex-shrink-0" />
              <p className="text-xs text-indigo-200">
                These are real founders actively looking for feedback. Verify your LinkedIn profile to start responding and set your fee.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowDomainSelector(true)}
                className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                Pick a different domain
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-md"
              >
                Verify your LinkedIn to start responding <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: LINKEDIN VERIFICATION */}
        {step === 2 && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
            <div className="mb-8">
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">Step 2 of 4</span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">Verify Professional Experience</h1>
              <p className="text-sm text-slate-400 mt-2">
                Pioneers are domain professionals with real industry background. Provide your LinkedIn profile and years of domain experience.
              </p>
            </div>

            <form onSubmit={handleVerifyLinkedIn} className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  LinkedIn Profile URL
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Linkedin className="w-4 h-4" />
                  </div>
                  <input
                    type="url"
                    required
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://www.linkedin.com/in/username"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1.5">
                  Must be your personal profile link (e.g., https://linkedin.com/in/yourname).
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Years of Experience in Domain (1–40 years)
                </label>
                <input
                  type="number"
                  min={1}
                  max={40}
                  value={yearsInDomain}
                  onChange={(e) => setYearsInDomain(Number(e.target.value))}
                  className="w-32 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <p className="text-xs text-slate-500 mt-1.5">
                  5+ years in domain qualifies for Senior Fast-Track (Pro grade from day one).
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  ← Back to Preview
                </button>

                <button
                  type="submit"
                  disabled={loading || !linkedinUrl.trim()}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-md disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Continue'} <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 2B: SENIOR FAST-TRACK ACKNOWLEDGMENT */}
        {step === 2.5 && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-4">
              <Award className="w-3.5 h-3.5" /> Senior Fast-Track Eligible
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
              Fast-Track to Pro Pioneer
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed mb-6">
              With 5+ years of domain experience, you are eligible for Pro grade (fee range ₹800–₹3,000 per interaction). Pro pioneers undergo an initial qualification interaction to ensure actionable, domain-specific depth.
            </p>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 mb-8 space-y-2 text-xs text-slate-400">
              <div className="flex items-center justify-between">
                <span>Pro Pioneer Fee Ceiling:</span>
                <span className="font-bold text-white">₹3,000 / interaction</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Elite Roadmap Fee Ceiling:</span>
                <span className="font-bold text-indigo-400">₹10,000 / interaction</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setStartAsRising(true);
                  setStep(3);
                }}
                className="text-sm font-semibold text-slate-400 hover:text-white transition-colors"
              >
                Start as Rising instead
              </button>

              <button
                type="button"
                onClick={() => {
                  setStartAsRising(false);
                  setStep(3);
                }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-md"
              >
                Continue as Pro Candidate <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: DOMAIN & PROFILE SETUP */}
        {step === 3 && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
            <div className="mb-8">
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">Step 3 of 4</span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">Profile & Economics Setup</h1>
              <p className="text-sm text-slate-400 mt-2">
                Set up your public Pioneer identity. Your fee range is automatically calibrated to your verified grade.
              </p>
            </div>

            <form onSubmit={handleCompleteEnrollment} className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g., Alex Carter, B2B SaaS Architect"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Profile Username
                </label>
                <div className="flex items-center">
                  <span className="bg-slate-900 border border-r-0 border-slate-800 rounded-l-xl px-3.5 py-3 text-sm text-slate-500">
                    neesh.ai/explorer/
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                    placeholder="alexcarter"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-r-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              {/* Fee Range Preview Card */}
              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Assigned Pioneer Grade</span>
                  <PioneerGradeBadge grade={preview.grade} size="sm" />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">Allowed Fee Range:</span>
                  <span className="font-bold text-white text-base">{preview.range}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  ← Back to LinkedIn
                </button>

                <button
                  type="submit"
                  disabled={loading || !displayName.trim()}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-md disabled:opacity-50"
                >
                  {loading ? 'Enrolling...' : 'Complete Enrollment'} <Sparkles className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 4: WELCOME SCREEN */}
        {step === 4 && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-5 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
              <Award className="w-8 h-8" />
            </div>

            <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">Welcome to Neesh</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 mb-3">
              You're Enrolled as a Verified Pioneer
            </h1>
            <p className="text-sm text-slate-300 max-w-lg mx-auto mb-6 leading-relaxed">
              Your profile is live and indexed for domain founders. Start reviewing real founder Sparks and earning verified ratings.
            </p>

            <div className="flex flex-col items-center justify-center gap-3 mb-8">
              <PioneerGradeBadge grade={assignedGrade} size="md" />

              {assignedGrade === 'SCOUT' && !isFoundingExplorer && (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  <span>0 / 3 free interactions to Seed Pioneer (WAR ≥ 3.50 required)</span>
                </div>
              )}

              {isFoundingExplorer && (
                <FoundingExplorerBadge
                  position={foundingPosition || 1}
                  commissionFreeUntil={commissionFreeUntil}
                />
              )}
            </div>

            {/* V19-B Grade Progression Roadmap */}
            <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 max-w-lg mx-auto mb-8 text-left">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">
                <TrendingUp className="w-3.5 h-3.5" /> Pioneer Progression
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your grade compounds with every interaction. Elite grade (50 completed paid interactions, 4.5+ average rating) unlocks ₹10,000 fees and direct outreach from top-tier founders.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <Link
                to="/dashboard/explorer"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-500/25"
              >
                Start Responding to Sparks <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </main>

      <FooterSection />
    </div>
  );
};
export default ExplorerOnboarding;

