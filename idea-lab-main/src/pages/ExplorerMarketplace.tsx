import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import FooterSection from '@/components/sections/FooterSection';
import { PioneerGradeBadge, PioneerGrade } from '@/components/pioneer/PioneerGradeBadge';
import {
  Search,
  Star,
  Users,
  ArrowRight,
  Filter,
  Sparkles,
  AlertCircle,
  Loader2,
  MessageSquarePlus,
  Award,
} from 'lucide-react';

interface MarketplaceProfile {
  id: string;
  username: string;
  display_name: string;
  pioneer_grade: PioneerGrade;
  pioneer_points: number;
  interaction_count: number;
  avg_rating: number | null;
  bio: string | null;
  tenure_years: number;
  fee_min_paise: number;
  fee_max_paise: number;
  is_founding_explorer: boolean;
  domain: { name: string; slug: string } | null;
}

const GRADE_OPTIONS: PioneerGrade[] = ['SEED', 'RISING', 'PRO', 'MASTER', 'ELITE'];
const DOMAIN_OPTIONS = [
  { slug: '', label: 'All Domains' },
  { slug: 'b2b-saas', label: 'B2B SaaS' },
  { slug: 'fintech', label: 'FinTech' },
  { slug: 'healthtech', label: 'HealthTech' },
  { slug: 'ai-devtools', label: 'AI / DevTools' },
  { slug: 'ecommerce', label: 'E-Commerce' },
];

function formatFeeRange(minPaise: number, maxPaise: number): string {
  if (!minPaise && !maxPaise) return 'Free';
  const min = Math.round(minPaise / 100);
  const max = Math.round(maxPaise / 100);
  if (min === max) return `₹${min}`;
  return `₹${min} – ₹${max}`;
}

export const ExplorerMarketplace: React.FC = () => {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<MarketplaceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (selectedDomain) params.set('domain', selectedDomain);
      if (selectedGrade) params.set('grade', selectedGrade);

      const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8082';
      const res = await fetch(`${BASE_URL}/api/explorer/marketplace?${params}`);
      if (!res.ok) throw new Error('Failed to fetch Pioneers');
      const data = await res.json();
      setProfiles(data.profiles || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load marketplace');
    } finally {
      setLoading(false);
    }
  }, [selectedDomain, selectedGrade]);

  useEffect(() => {
    document.title = 'Pioneer Marketplace — Find Domain Experts | Neesh';
    fetchProfiles();
  }, [fetchProfiles]);

  const filteredProfiles = profiles.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.display_name.toLowerCase().includes(q) ||
      p.username.toLowerCase().includes(q) ||
      p.domain?.name.toLowerCase().includes(q) ||
      (p.bio || '').toLowerCase().includes(q)
    );
  });

  const handleSendRequest = async (explorerId: string, explorerName: string) => {
    // Navigate to the explorer's profile where the full Direct Request form lives
    navigate(`/explorer/${profiles.find(p => p.id === explorerId)?.username || explorerId}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-3">
            <Users className="w-3.5 h-3.5" /> Pioneer Marketplace
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
            Find Your Domain Expert
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
            Browse verified domain Pioneers — professionals with proven track records who get paid to validate your ideas, review your strategy, and give you direct, honest feedback.
          </p>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, domain, or expertise..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500 flex-shrink-0" />
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors"
            >
              {DOMAIN_OPTIONS.map((d) => (
                <option key={d.slug} value={d.slug}>{d.label}</option>
              ))}
            </select>

            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="">All Grades</option>
              {GRADE_OPTIONS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              <p className="text-sm text-slate-400">Loading Pioneers...</p>
            </div>
          </div>
        ) : filteredProfiles.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-4">
              <Users className="w-7 h-7 text-slate-600" />
            </div>
            <h3 className="text-base font-semibold text-slate-300 mb-2">No Pioneers found</h3>
            <p className="text-sm text-slate-500">
              {searchQuery || selectedDomain || selectedGrade
                ? 'Try adjusting your filters.'
                : 'Be the first Pioneer in this domain!'}
            </p>
            {!searchQuery && !selectedDomain && !selectedGrade && (
              <Link
                to="/onboarding/explorer"
                className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all"
              >
                Become a Pioneer <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        ) : (
          <>
            <p className="text-xs text-slate-500 mb-4">
              {filteredProfiles.length} Pioneer{filteredProfiles.length !== 1 ? 's' : ''} available
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProfiles.map((profile) => (
                <div
                  key={profile.id}
                  className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col hover:border-indigo-500/40 transition-colors group"
                >
                  {/* Header row */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 mr-3">
                      <Link
                        to={`/explorer/${profile.username}`}
                        className="text-sm font-bold text-white hover:text-indigo-300 transition-colors truncate block"
                      >
                        {profile.display_name}
                      </Link>
                      <span className="text-xs text-slate-500">@{profile.username}</span>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <PioneerGradeBadge grade={profile.pioneer_grade} size="sm" />
                      {profile.is_founding_explorer && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20">
                          <Sparkles className="w-2.5 h-2.5" /> Founding
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Domain chip */}
                  {profile.domain && (
                    <span className="inline-flex items-center w-fit px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-3">
                      {profile.domain.name}
                    </span>
                  )}

                  {/* Bio */}
                  {profile.bio && (
                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 mb-4 flex-1">
                      {profile.bio}
                    </p>
                  )}

                  {/* Stats row */}
                  <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                    <span className="flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      {profile.tenure_years}y exp
                    </span>
                    {profile.interaction_count > 0 && (
                      <span className="flex items-center gap-1">
                        <MessageSquarePlus className="w-3 h-3" />
                        {profile.interaction_count} interactions
                      </span>
                    )}
                    {profile.avg_rating !== null && (
                      <span className="flex items-center gap-1 text-amber-400">
                        <Star className="w-3 h-3 fill-amber-400" />
                        {profile.avg_rating.toFixed(1)}
                      </span>
                    )}
                  </div>

                  {/* Fee range + CTA */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Fee Range</span>
                      <span className="text-sm font-bold text-white">
                        {formatFeeRange(profile.fee_min_paise, profile.fee_max_paise)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSendRequest(profile.id, profile.display_name)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-sm"
                    >
                      Request <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* CTA: not yet a Pioneer */}
        <div className="mt-16 p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white mb-1">Are you a domain expert?</h3>
            <p className="text-xs text-slate-400">Join as a Pioneer and get paid for your domain knowledge.</p>
          </div>
          <Link
            to="/onboarding/explorer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-md whitespace-nowrap"
          >
            Become a Pioneer <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>

      <FooterSection />
    </div>
  );
};

export default ExplorerMarketplace;
