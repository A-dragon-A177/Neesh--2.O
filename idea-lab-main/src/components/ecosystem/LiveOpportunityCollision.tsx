import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Rocket, Search, Zap, CheckCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const LiveOpportunityCollision: React.FC = () => {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<'founder' | 'discoverer'>('founder');
  const [selectedDomain, setSelectedDomain] = useState<string>('AI & Agentic Systems');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationResult, setSimulationResult] = useState<boolean>(false);

  const domains = [
    'AI & Agentic Systems',
    'FinTech & DeFI',
    'BioTech & Health',
    'Quantum & Hardware',
    'SaaS & Dev Tools',
  ];

  const handleRunSimulation = () => {
    setIsSimulating(true);
    setSimulationResult(false);

    setTimeout(() => {
      setIsSimulating(false);
      setSimulationResult(true);
    }, 1200);
  };

  const handleToggleRole = (role: 'founder' | 'discoverer') => {
    setUserRole(role);
    setSimulationResult(false);
  };

  return (
    <section className="relative py-14 sm:py-24 px-4 bg-slate-950 border-t border-slate-900 font-['Inter']">
      <div className="max-w-5xl mx-auto space-y-8 sm:space-y-12">
        {/* Section Header */}
        <div className="text-center space-y-3 sm:space-y-4 max-w-2xl mx-auto">
          <div className="text-[10px] sm:text-xs font-mono text-[#09daed] tracking-widest uppercase">
            LIVE ECOSYSTEM MATCHMAKER
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-white font-['Plus_Jakarta_Sans']">
            Experience Opportunity Gravitational Collision
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm md:text-base font-['Inter']">
            Choose your role and domain to see how <span className="font-['Outfit'] font-extrabold text-[#09daed]">NEESH AI</span> instantly matches you with your next breakthrough opportunity.
          </p>
        </div>

        {/* Simulator Card */}
        <div className="rounded-xl sm:rounded-2xl border border-[#09daed]/30 bg-slate-900/90 p-5 sm:p-8 md:p-12 shadow-[0_0_50px_rgba(0,0,0,0.9)] space-y-6 sm:space-y-8 relative overflow-hidden">
          {/* Top Role Selector Tabs */}
          <div className="flex rounded-xl bg-slate-950 border border-slate-800 p-1 sm:p-1.5 max-w-md mx-auto font-['Plus_Jakarta_Sans']">
            <button
              onClick={() => handleToggleRole('founder')}
              className={`flex-1 py-2.5 sm:py-3 px-2 sm:px-4 rounded-lg text-[11px] sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
                userRole === 'founder'
                  ? 'bg-[#09daed] text-black shadow-lg font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Rocket className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              I am a Founder
            </button>

            <button
              onClick={() => handleToggleRole('discoverer')}
              className={`flex-1 py-2.5 sm:py-3 px-2 sm:px-4 rounded-lg text-[11px] sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
                userRole === 'discoverer'
                  ? 'bg-sky-500 text-white shadow-lg font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">I am a Discoverer / Investor</span>
              <span className="sm:hidden">Discoverer / Investor</span>
            </button>
          </div>

          {/* Domain Selection */}
          <div className="space-y-3 text-center">
            <label className="text-[10px] sm:text-xs font-mono text-slate-400 uppercase tracking-wider block">
              Select Innovation Domain:
            </label>
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 font-mono">
              {domains.map((domain) => (
                <button
                  key={domain}
                  onClick={() => {
                    setSelectedDomain(domain);
                  }}
                  className={`px-2.5 sm:px-3.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-mono border transition-all ${
                    selectedDomain === domain
                      ? 'bg-slate-800 border-[#09daed] text-[#09daed] font-bold'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {domain}
                </button>
              ))}
            </div>
          </div>

          {/* Collision Trigger Action Button */}
          <div className="text-center">
            <button
              onClick={handleRunSimulation}
              disabled={isSimulating}
              className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl bg-gradient-to-r from-[#09daed] via-sky-400 to-blue-500 text-black font-['Plus_Jakarta_Sans'] font-extrabold text-sm sm:text-base md:text-lg tracking-wide uppercase shadow-[0_0_30px_rgba(9,218,237,0.4)] hover:scale-105 active:scale-95 transition-transform flex items-center justify-center gap-2 sm:gap-3 mx-auto"
            >
              {isSimulating ? (
                <>
                  <Zap className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-black" />
                  <span className="hidden sm:inline">Calculating Gravitational Match...</span>
                  <span className="sm:hidden">Calculating Match...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
                  <span className="hidden sm:inline">Simulate Opportunity Collision</span>
                  <span className="sm:hidden">Simulate Collision</span>
                </>
              )}
            </button>
          </div>

          {/* Simulation Output Card */}
          {simulationResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 sm:p-6 md:p-8 rounded-xl bg-slate-950 border border-[#09daed]/50 space-y-4 sm:space-y-6 text-left font-['Inter']"
            >
              <div className="flex items-start sm:items-center gap-2 sm:gap-3 text-[#09daed] font-mono text-[10px] sm:text-xs uppercase tracking-widest border-b border-slate-800 pb-3">
                <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#09daed] shrink-0 mt-0.5 sm:mt-0" />
                <span className="leading-tight">HIGH SIGNAL MATCH DETECTED // {selectedDomain}</span>
              </div>

              {userRole === 'founder' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                  <div className="p-3 sm:p-4 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] sm:text-xs font-mono text-[#09daed] block mb-1">FOUND PILOT COHORT</span>
                    <div className="text-white font-bold text-sm sm:text-base font-['Plus_Jakarta_Sans']">340+ Verified Alpha Testers</div>
                    <div className="text-slate-400 text-[10px] sm:text-xs mt-1 font-['Inter']">Ready to test early product builds immediately.</div>
                  </div>
                  <div className="p-3 sm:p-4 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] sm:text-xs font-mono text-sky-400 block mb-1">FOUND SYNDICATE INVESTOR</span>
                    <div className="text-white font-bold text-sm sm:text-base font-['Plus_Jakarta_Sans']">$250K Seed Match</div>
                    <div className="text-slate-400 text-[10px] sm:text-xs mt-1 font-['Inter']">Matched with 2 domain-focused angel syndicates.</div>
                  </div>
                  <div className="p-3 sm:p-4 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] sm:text-xs font-mono text-blue-400 block mb-1">FOUND CO-FOUNDER</span>
                    <div className="text-white font-bold text-sm sm:text-base font-['Plus_Jakarta_Sans']">Lead AI Engineer</div>
                    <div className="text-slate-400 text-[10px] sm:text-xs mt-1 font-['Inter']">96% skill-gap match score looking for your exact vision.</div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                  <div className="p-3 sm:p-4 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] sm:text-xs font-mono text-[#09daed] block mb-1">HIGH-TRACTION STARTUP</span>
                    <div className="text-white font-bold text-sm sm:text-base font-['Plus_Jakarta_Sans']">Aether Quantum AI</div>
                    <div className="text-slate-400 text-[10px] sm:text-xs mt-1 font-['Inter']">+140% weekly pilot user growth trajectory.</div>
                  </div>
                  <div className="p-3 sm:p-4 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] sm:text-xs font-mono text-sky-400 block mb-1">DECK & METRICS DEEP-DIVE</span>
                    <div className="text-white font-bold text-sm sm:text-base font-['Plus_Jakarta_Sans']">Live Data Escrow</div>
                    <div className="text-slate-400 text-[10px] sm:text-xs mt-1 font-['Inter']">Full access to telemetry, session duration & retention.</div>
                  </div>
                  <div className="p-3 sm:p-4 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] sm:text-xs font-mono text-blue-400 block mb-1">WARM FOUNDER ACCESS</span>
                    <div className="text-white font-bold text-sm sm:text-base font-['Plus_Jakarta_Sans']">Direct Founder Chat</div>
                    <div className="text-slate-400 text-[10px] sm:text-xs mt-1 font-['Inter']">Instant invite to private project channel.</div>
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-center sm:justify-end">
                <button
                  onClick={() => {
                    if (userRole === 'founder') {
                      navigate('/dashboard');
                    } else {
                      navigate('/space');
                    }
                  }}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-[#09daed] hover:bg-[#08c8d9] text-black font-bold text-sm font-['Plus_Jakarta_Sans'] flex items-center justify-center gap-2 transition-colors shadow-[0_0_20px_rgba(9,218,237,0.3)] hover:scale-105"
                >
                  Enter The Ecosystem <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
};
export default LiveOpportunityCollision;
