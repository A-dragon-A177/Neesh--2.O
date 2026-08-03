import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, Magnet, Rocket, Globe, CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';

export interface JourneyPhase {
  phaseNum: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
  founderAction: string;
  ecosystemReaction: string;
  result: string;
}

const PHASES: JourneyPhase[] = [
  {
    phaseNum: '01',
    title: 'The Spark',
    subtitle: 'Idea Conception & Initial Gravitational Pulse',
    icon: Lightbulb,
    color: '#09daed',
    founderAction: 'Founder enters the ecosystem with a raw problem statement, vision, or napkin sketch.',
    ecosystemReaction: 'Neesh AI validates market signals, generates real-time feedback loops, and indexes the mission.',
    result: 'Verified Idea Nucleus deployed into the public gravitational field.',
  },
  {
    phaseNum: '02',
    title: 'Gravitational Pull',
    subtitle: 'Pilot Testers & Early Adopters Docking',
    icon: Magnet,
    color: '#0ea5e9',
    founderAction: 'Founder posts feature roadmap and pre-launch milestone goals.',
    ecosystemReaction: 'Early adopters, pilot users, and power-testers naturally gravitate to test the prototype.',
    result: '400+ active beta testers giving high-signal telemetry & instant feedback.',
  },
  {
    phaseNum: '03',
    title: 'The Catalyst',
    subtitle: 'Co-Founders & Syndicate Capital Alignment',
    icon: Rocket,
    color: '#38bdf8',
    founderAction: 'Founder opens key skill-gap positions and opens pitch spotlight visibility.',
    ecosystemReaction: 'Complementary co-founders and angel investors inspect verified pilot usage metrics.',
    result: 'Technical co-founder onboarded & pre-seed funding round filled.',
  },
  {
    phaseNum: '04',
    title: 'Supernova',
    subtitle: 'Market Domination & Enterprise Scaling',
    icon: Globe,
    color: '#0284c7',
    founderAction: 'Startup launches commercial offer and opens enterprise API access.',
    ecosystemReaction: 'Customers and strategic partners integrate product into their workflows.',
    result: 'Self-sustaining market ecosystem with recurring revenue & viral momentum.',
  },
];

export const OrbitalJourneyTimeline: React.FC = () => {
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);

  const activePhase = PHASES[activeStepIndex];

  const handleStepClick = (index: number) => {
    setActiveStepIndex(index);
  };

  return (
    <section className="relative py-14 sm:py-24 px-4 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-t border-slate-900 font-['Inter']">
      <div className="max-w-6xl mx-auto space-y-10 sm:space-y-16">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 sm:space-y-4">
          <div className="text-[10px] sm:text-xs font-mono text-[#09daed] tracking-widest uppercase">
            ORBITAL EVOLUTION TIMELINE
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-white font-['Plus_Jakarta_Sans']">
            From <span className="text-[#09daed]">Spark</span> to <span className="text-sky-400">Supernova</span>
          </h2>
          <p className="text-slate-300 text-sm sm:text-base md:text-lg font-['Inter']">
            How an idea transforms into a thriving enterprise inside the <span className="font-['Outfit'] font-extrabold text-[#09daed]">NEESH AI</span> Ecosystem.
          </p>
        </div>

        {/* Timeline Stepper Header — Horizontal scroll on mobile */}
        <div className="-mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 overflow-x-auto sm:overflow-visible pb-3 sm:pb-0 snap-x snap-mandatory scrollbar-hide">
            {PHASES.map((phase, idx) => {
              const Icon = phase.icon;
              const isActive = idx === activeStepIndex;
              const isCompleted = idx < activeStepIndex;

              return (
                <button
                  key={phase.phaseNum}
                  onClick={() => handleStepClick(idx)}
                  className={`snap-start shrink-0 w-[200px] sm:w-auto relative p-4 sm:p-5 rounded-xl border text-left transition-all duration-300 ${
                    isActive
                      ? 'bg-slate-900/90 border-[#09daed] shadow-[0_0_20px_rgba(9,218,237,0.25)]'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <span
                      className="text-[10px] sm:text-xs font-mono font-bold px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: `${phase.color}20`,
                        color: phase.color,
                        border: `1px solid ${phase.color}40`,
                      }}
                    >
                      PHASE {phase.phaseNum}
                    </span>

                    {isCompleted ? (
                      <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#09daed]" />
                    ) : (
                      <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: phase.color }} />
                    )}
                  </div>

                  <div className="text-sm sm:text-base font-bold text-white mb-0.5 sm:mb-1 font-['Plus_Jakarta_Sans']">{phase.title}</div>
                  <div className="text-[10px] sm:text-xs text-slate-400 line-clamp-1 font-['Inter']">{phase.subtitle}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Phase Detail Stage */}
        <div className="relative rounded-xl sm:rounded-2xl border border-slate-800 bg-slate-950/90 p-5 sm:p-8 md:p-12 backdrop-blur overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePhase.phaseNum}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6 sm:space-y-8"
            >
              <div className="flex flex-col gap-3 sm:gap-4 border-b border-slate-800 pb-4 sm:pb-6">
                <div>
                  <span
                    className="text-[10px] sm:text-xs font-mono uppercase tracking-widest block mb-1"
                    style={{ color: activePhase.color }}
                  >
                    PHASE {activePhase.phaseNum} // {activePhase.subtitle}
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-['Plus_Jakarta_Sans']">{activePhase.title}</h3>
                </div>

                <div className="flex items-center gap-2">
                  {activeStepIndex > 0 && (
                    <button
                      onClick={() => handleStepClick(activeStepIndex - 1)}
                      className="px-3 py-1.5 rounded bg-slate-900 border border-slate-800 text-[10px] sm:text-xs font-mono text-slate-300 hover:text-white flex items-center gap-1"
                    >
                      <ChevronLeft className="w-3 h-3" /> PREV
                    </button>
                  )}
                  {activeStepIndex < PHASES.length - 1 && (
                    <button
                      onClick={() => handleStepClick(activeStepIndex + 1)}
                      className="px-3 py-1.5 rounded bg-sky-950 border border-[#09daed]/40 text-[10px] sm:text-xs font-mono text-[#09daed] hover:bg-sky-900 flex items-center gap-1"
                    >
                      NEXT <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* 3 Step Matrix Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                <div className="p-4 sm:p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <span className="text-[10px] sm:text-xs font-mono text-[#09daed] uppercase tracking-wide">
                    01. Founder Action
                  </span>
                  <p className="text-slate-200 text-xs sm:text-sm leading-relaxed font-['Inter']">
                    {activePhase.founderAction}
                  </p>
                </div>

                <div className="p-4 sm:p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <span className="text-[10px] sm:text-xs font-mono text-sky-400 uppercase tracking-wide">
                    02. Ecosystem Reaction
                  </span>
                  <p className="text-slate-200 text-xs sm:text-sm leading-relaxed font-['Inter']">
                    {activePhase.ecosystemReaction}
                  </p>
                </div>

                <div
                  className="p-4 sm:p-5 rounded-xl bg-slate-900/60 border space-y-2"
                  style={{ borderColor: `${activePhase.color}40` }}
                >
                  <span
                    className="text-[10px] sm:text-xs font-mono uppercase tracking-wide"
                    style={{ color: activePhase.color }}
                  >
                    03. Milestone Outcome
                  </span>
                  <p className="text-white text-xs sm:text-sm font-semibold leading-relaxed font-['Inter']">
                    {activePhase.result}
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};
export default OrbitalJourneyTimeline;
