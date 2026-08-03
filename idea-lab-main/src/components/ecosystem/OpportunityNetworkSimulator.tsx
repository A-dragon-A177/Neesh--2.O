import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  TrendingUp,
  UserCheck,
  Award,
  UserPlus,
  ShoppingBag,
  Handshake,
  Zap,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

export interface OpportunityPillar {
  id: string;
  title: string;
  icon: React.ElementType;
  tagline: string;
  color: string;
  metric: string;
  metricLabel: string;
  description: string;
  highlights: string[];
}

export const PILLARS: OpportunityPillar[] = [
  {
    id: 'pilot-users',
    title: 'Pilot Users',
    icon: Users,
    tagline: 'Instant cohort of hungry early adopters',
    color: '#09daed',
    metric: '480+',
    metricLabel: 'Active Beta Testers / Project',
    description: 'Stop shouting into the void. Founders connect directly with tech-forward power users ready to test pre-launch MVPs and give high-signal feedback.',
    highlights: ['Zero acquisition cost', 'Real-time telemetry & session logs', 'Direct feature iteration loops'],
  },
  {
    id: 'investors',
    title: 'Investors',
    icon: TrendingUp,
    tagline: 'Capital that gravitates toward proven traction',
    color: '#0ea5e9',
    metric: '$4.2M',
    metricLabel: 'Syndicate Capital Allocated',
    description: 'Angel investors and seed funds monitor the ecosystem in real time, discovering startups based on organic momentum rather than cold pitch decks.',
    highlights: ['Traction-driven discovery', 'Instant term sheet matching', 'Verifiable milestone metrics'],
  },
  {
    id: 'co-founders',
    title: 'Co-Founders',
    icon: UserCheck,
    tagline: 'Complementary visionaries to share the mission',
    color: '#38bdf8',
    metric: '98%',
    metricLabel: 'Skill-Gap Synergy Match Rate',
    description: 'Pair technical builders with domain growth leaders. AI-powered synergy algorithms analyze vision, work ethic, and complementary strengths.',
    highlights: ['Skill gap AI matchmaking', 'Vetted co-builder network', 'Shared equity escrow framework'],
  },
  {
    id: 'mentors',
    title: 'Mentors',
    icon: Award,
    tagline: 'Battle-tested guidance from 10x founders',
    color: '#0284c7',
    metric: '120+',
    metricLabel: 'Unicorn & Exit Advisors',
    description: 'Access elite founders who have built $100M+ companies. Get 1-on-1 teardowns, GTM playbooks, and strategic navigation through critical roadblocks.',
    highlights: ['Weekly masterclasses', 'Asynchronous deck reviews', 'Direct warm introductions'],
  },
  {
    id: 'team-members',
    title: 'Team',
    icon: UserPlus,
    tagline: 'Top-tier engineers, designers & operators',
    color: '#2563eb',
    metric: '1.2K',
    metricLabel: 'Specialized Tech Talent Pool',
    description: 'Recruit mission-driven builders who believe in your vision before you even post a traditional job listing.',
    highlights: ['Mission-aligned talent', 'Fractional & full-time hiring', 'Proof-of-work portfolio verification'],
  },
  {
    id: 'customers',
    title: 'Customers',
    icon: ShoppingBag,
    tagline: 'First paying accounts & enterprise pilots',
    color: '#60a5fa',
    metric: '14 Days',
    metricLabel: 'Avg. Time to First Paid User',
    description: 'Convert community enthusiasm into recurring revenue. Launch early bird subscriptions, enterprise trials, and pre-orders effortlessly.',
    highlights: ['Built-in payment intent engine', 'B2B enterprise pipeline', 'Automated referral loops'],
  },
  {
    id: 'partnerships',
    title: 'Partners',
    icon: Handshake,
    tagline: 'Strategic alliances & API ecosystem integrations',
    color: '#00f0ff',
    metric: '85+',
    metricLabel: 'Infrastructure & Tech Partners',
    description: 'Unlock enterprise cloud credits, distribution channels, and co-marketing campaigns with global technology providers.',
    highlights: ['$150k+ partner perk credits', 'Co-marketing spotlights', 'Cross-platform API distribution'],
  },
];

export const OpportunityNetworkSimulator: React.FC = () => {
  const [activePillarId, setActivePillarId] = useState<string>('pilot-users');

  const activePillar = PILLARS.find((p) => p.id === activePillarId) || PILLARS[0];

  const handleSelectPillar = (id: string) => {
    setActivePillarId(id);
  };

  return (
    <section className="relative py-14 sm:py-24 px-4 overflow-hidden bg-slate-950/95 border-t border-[#09daed]/20 font-['Inter']">
      {/* Background Radial Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sky-950/40 via-slate-950 to-slate-950 pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16 space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-950/60 border border-[#09daed]/40 text-[#09daed] text-[10px] sm:text-xs tracking-widest uppercase font-mono">
            <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-pulse text-[#09daed]" />
            The 7 Pillars of Ecosystem Gravity
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold tracking-tight text-white font-['Plus_Jakarta_Sans']">
            Founders enter with an <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#09daed] via-sky-400 to-blue-500 font-['Plus_Jakarta_Sans']">Idea</span>. <br />
            They leave with an <span className="text-[#09daed] underline decoration-[#09daed]/50 font-['Plus_Jakarta_Sans']">Empire</span>.
          </h2>

          <p className="text-slate-300 text-sm sm:text-base md:text-lg font-['Inter']">
            One ecosystem. Every opportunity a startup needs to orbit, attract capital, recruit world-class builders, and scale endlessly.
          </p>
        </div>

        {/* 7 Pillars Interactive Selector Grid — Horizontally scrollable on mobile */}
        <div className="mb-8 sm:mb-12 -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex sm:grid sm:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3 overflow-x-auto sm:overflow-visible pb-3 sm:pb-0 snap-x snap-mandatory scrollbar-hide">
            {PILLARS.map((pillar) => {
              const Icon = pillar.icon;
              const isActive = pillar.id === activePillarId;

              return (
                <button
                  key={pillar.id}
                  onClick={() => handleSelectPillar(pillar.id)}
                  className={`snap-start shrink-0 w-[90px] sm:w-auto relative group p-3 sm:p-4 rounded-xl border transition-all duration-300 flex flex-col items-center text-center space-y-2 sm:space-y-3 ${
                    isActive
                      ? 'bg-gradient-to-b from-sky-950/90 to-slate-950 border-[#09daed] shadow-[0_0_25px_rgba(9,218,237,0.35)] scale-105'
                      : 'bg-slate-900/40 border-slate-800 hover:border-[#09daed]/50 hover:bg-slate-900/80'
                  }`}
                >
                  <div
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                    style={{
                      backgroundColor: `${pillar.color}15`,
                      border: `1px solid ${pillar.color}40`,
                    }}
                  >
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: pillar.color }} />
                  </div>

                  <span className="text-[10px] sm:text-xs md:text-sm font-semibold tracking-wide text-white font-['Plus_Jakarta_Sans']">
                    {pillar.title}
                  </span>

                  {isActive && (
                    <motion.div
                      layoutId="activePillarIndicator"
                      className="absolute -bottom-1.5 w-10 sm:w-12 h-1 rounded-full"
                      style={{ backgroundColor: pillar.color }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Opportunity Holographic Detail Panel */}
        <div className="relative rounded-xl sm:rounded-2xl border border-[#09daed]/30 bg-gradient-to-b from-slate-900/90 via-slate-950 to-slate-950 p-4 sm:p-6 md:p-10 backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden">
          {/* Laser Accent Light */}
          <div
            className="absolute top-0 left-1/4 right-1/4 h-[2px] blur-sm transition-all duration-500"
            style={{ backgroundColor: activePillar.color }}
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={activePillar.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center"
            >
              {/* Left Column - Core Info */}
              <div className="lg:col-span-7 space-y-4 sm:space-y-6">
                <div className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-1 rounded-md bg-slate-900 border border-slate-800 text-[10px] sm:text-xs font-mono text-[#09daed]">
                  <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" style={{ color: activePillar.color }} />
                  GRAVITY VECTOR 0{PILLARS.findIndex((p) => p.id === activePillar.id) + 1}
                </div>

                <div>
                  <h3 className="text-xl sm:text-2xl md:text-4xl font-bold text-white mb-1 sm:mb-2 font-['Plus_Jakarta_Sans']">
                    {activePillar.title}
                  </h3>
                  <p className="text-sm sm:text-base md:text-xl font-medium font-['Inter']" style={{ color: activePillar.color }}>
                    "{activePillar.tagline}"
                  </p>
                </div>

                <p className="text-slate-300 leading-relaxed text-xs sm:text-sm md:text-base font-['Inter']">
                  {activePillar.description}
                </p>

                <div className="space-y-2">
                  <span className="text-[10px] sm:text-xs uppercase font-mono text-slate-400 tracking-wider">
                    Key Advantages in <span className="font-['Outfit'] font-extrabold text-[#09daed]">NEESH AI</span>:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                    {activePillar.highlights.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 sm:p-3 rounded-lg bg-slate-900/70 border border-slate-800 text-[11px] sm:text-xs text-slate-200 flex items-center gap-2 font-['Inter']"
                      >
                        <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" style={{ color: activePillar.color }} />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column - Holographic Metric Badge */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center">
                <div
                  className="w-full max-w-sm p-5 sm:p-8 rounded-xl sm:rounded-2xl border bg-slate-950/90 text-center relative space-y-3 sm:space-y-4 group transition-transform hover:scale-105"
                  style={{
                    borderColor: `${activePillar.color}50`,
                    boxShadow: `0 0 40px ${activePillar.color}20`,
                  }}
                >
                  <div className="text-[10px] sm:text-xs font-mono text-slate-400 uppercase tracking-widest">
                    {activePillar.metricLabel}
                  </div>

                  <div
                    className="text-4xl sm:text-5xl md:text-6xl font-black font-mono tracking-tight drop-shadow-md"
                    style={{ color: activePillar.color }}
                  >
                    {activePillar.metric}
                  </div>

                  <div className="pt-3 sm:pt-4 border-t border-slate-800 text-[10px] sm:text-xs text-slate-400 flex items-center justify-center gap-2 font-mono">
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#09daed] animate-ping" />
                    <span>Real-time Telemetry Live</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};
export default OpportunityNetworkSimulator;
