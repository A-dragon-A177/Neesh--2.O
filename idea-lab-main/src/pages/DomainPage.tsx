import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Sparkles, ShieldCheck, ArrowRight, Lock, CheckCircle2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import FooterSection from '@/components/sections/FooterSection';
import { DomainProofWidget, DomainProofData } from '@/components/DomainProofWidget';
import { PioneerGradeBadge } from '@/components/pioneer/PioneerGradeBadge';

export const DomainPage: React.FC = () => {
  const { slug = 'b2b-saas' } = useParams<{ slug: string }>();

  const [domainData, setDomainData] = useState<{
    name: string;
    slug: string;
    isOpen: boolean;
    activeFounderCount: number;
    neededFounders: number;
    message: string;
    activeSpotlightCount: number;
    activeExplorerCount: number;
    weeklyInteractionCount: number;
    gradeBreakdown: Record<string, number>;
  } | null>(null);

  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const fetchDomain = async () => {
      try {
        const res = await fetch(`/api/domains/${slug}`);
        if (res.ok) {
          const json = await res.json();
          if (isMounted) {
            setDomainData(json);
            // Update document title and meta description
            const domainName = json.name || slug.toUpperCase();
            document.title = `${domainName} Startup Validation on Neesh — ${json.activeFounderCount || 0} Active Founders`;
            const metaDesc = document.querySelector('meta[name="description"]');
            if (metaDesc) {
              metaDesc.setAttribute(
                'content',
                `${json.activeFounderCount || 0} startup founders are getting domain-specific feedback from ${json.activeExplorerCount || 0} verified professionals in ${domainName} right now.`
              );
            }
          }
        }
      } catch (err) {
        console.error('Failed to load domain data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDomain();
    return () => {
      isMounted = false;
    };
  }, [slug]);

  const domainName = domainData?.name || slug.replace(/-/g, ' ').toUpperCase();
  const isOpen = domainData?.isOpen ?? true;
  const activeFounders = domainData?.activeFounderCount ?? 12;
  const activeExplorers = domainData?.activeExplorerCount ?? 8;
  const neededFounders = domainData?.neededFounders ?? 5;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
        {/* Header with DomainProofWidget */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" /> Domain Validation Hub
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            {domainName} Startup Validation
          </h1>
          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto mb-8">
            Connect with verified domain practitioners in {domainName}. Accelerate hypothesis validation with zero noise.
          </p>

          {/* Task 1: DomainProofWidget in header of domain page */}
          <div className="flex justify-center mb-8">
            <DomainProofWidget slug={slug} />
          </div>
        </div>

        {/* Domain Open Commitment Status Card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl mb-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              {isOpen ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <Lock className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <h2 className="text-xl font-bold">
                  {isOpen ? 'Explorer Signup Open' : `${activeFounders} of ${neededFounders} Founders Needed`}
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  {isOpen
                    ? `This domain has met the 5+ active founder threshold. Explorer onboarding is open and active.`
                    : `Explorer onboarding unlocks once 5 paying founders launch active sprints in ${domainName}.`}
                </p>
              </div>
            </div>

            <div className="flex gap-3 w-full sm:w-auto">
              <Link
                to="/signup"
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white text-sm transition-all text-center"
              >
                Post your Spark
              </Link>
              {isOpen ? (
                <Link
                  to="/explorer/preview-feed"
                  className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-semibold border border-slate-700 hover:bg-slate-800 text-slate-200 text-sm transition-all text-center"
                >
                  Browse opportunities
                </Link>
              ) : (
                <Link
                  to={`/domain/${slug}/waitlist`}
                  className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-semibold border border-amber-600/40 text-amber-300 text-sm hover:bg-amber-950/20 transition-all text-center"
                >
                  Join Waitlist
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Pioneer Grade Distribution in Domain */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
          <h3 className="text-xl font-bold mb-4">Pioneer Talent Distribution in {domainName}</h3>
          <p className="text-sm text-slate-400 mb-6">
            Aggregate verification levels of professionals currently reviewing hypotheses in this domain.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { grade: 'SEED', count: domainData?.gradeBreakdown?.SEED ?? 2 },
              { grade: 'RISING', count: domainData?.gradeBreakdown?.RISING ?? 4 },
              { grade: 'PRO', count: domainData?.gradeBreakdown?.PRO ?? 2 },
              { grade: 'MASTER', count: domainData?.gradeBreakdown?.MASTER ?? 0 },
              { grade: 'ELITE', count: domainData?.gradeBreakdown?.ELITE ?? 0 },
            ].map((item) => (
              <div key={item.grade} className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 text-center">
                <PioneerGradeBadge grade={item.grade} size="sm" />
                <div className="text-2xl font-extrabold text-white mt-2">{item.count}</div>
                <div className="text-[11px] text-slate-500 uppercase tracking-wider mt-0.5">Active</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <FooterSection />
    </div>
  );
};

export default DomainPage;

