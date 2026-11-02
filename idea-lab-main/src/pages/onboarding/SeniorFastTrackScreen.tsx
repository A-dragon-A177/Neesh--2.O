import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Award, ArrowRight, TrendingUp } from 'lucide-react';
import { PioneerGradeBadge } from '@/components/pioneer/PioneerGradeBadge';

export interface SeniorFastTrackScreenProps {
  domain?: string;
  yearsOfExperience?: number;
  jobTitle?: string;
}

export const SeniorFastTrackScreen: React.FC<SeniorFastTrackScreenProps> = ({
  domain = 'B2B SaaS',
  yearsOfExperience = 7,
  jobTitle = 'Senior Product Manager',
}) => {
  const navigate = useNavigate();

  const handleStartSeniorVerification = () => {
    navigate('/explorer/senior-fast-track/verify');
  };

  const handleStartAsRising = () => {
    navigate('/explorer/onboarding?tier=rising');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <PioneerGradeBadge grade="PRO" size="lg" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            You qualify for Pro grade from day one
          </h1>
          <p className="text-slate-400 text-sm">
            Based on your verified LinkedIn background of {yearsOfExperience}+ years as a {jobTitle} in {domain}.
          </p>
        </div>

        {/* Fee Range Display */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 text-center space-y-1">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">Pro Grade Fee Range</div>
          <div className="text-2xl font-extrabold text-emerald-400">
            ₹800–₹3,000 <span className="text-sm font-normal text-slate-400">per interaction</span>
          </div>
          <p className="text-xs text-slate-400 pt-1">
            Interact with startup founders at ₹800–₹3,000 per interaction
          </p>
        </div>

        {/* V19-A Fee Ceiling Acknowledgment Copy */}
        <div className="bg-indigo-950/20 border border-indigo-900/40 rounded-2xl p-4 text-slate-300 text-sm leading-relaxed">
          <div className="flex items-start gap-2.5">
            <TrendingUp className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
            <p>
              Pro grade starts at ₹800/interaction. As you complete more interactions and reach Master or Elite grade, your fee ceiling rises to ₹6,000 and ₹10,000. Your Pioneer profile is permanent — it builds over time.
            </p>
          </div>
        </div>

        {/* CTAs: V19-A Both visible on initial render (no scroll), font-size >= 14px, contrast >= 4.5:1 */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={handleStartSeniorVerification}
            className="w-full py-3.5 px-6 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 transition-all text-base flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25"
          >
            Start Senior Verification <ArrowRight className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={handleStartAsRising}
            className="w-full py-3.5 px-6 rounded-xl font-semibold text-slate-200 border-2 border-slate-700 hover:border-slate-500 hover:bg-slate-800/60 transition-all text-base flex items-center justify-center bg-slate-900"
            style={{ fontSize: '15px' }}
          >
            Start as Rising instead
          </button>
        </div>
      </div>
    </div>
  );
};

export default SeniorFastTrackScreen;

