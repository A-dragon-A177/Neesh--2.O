import React from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Zap,
  Compass,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import CinematicVFXCanvas from '@/components/ecosystem/CinematicVFXCanvas';
import OpportunityNetworkSimulator from '@/components/ecosystem/OpportunityNetworkSimulator';
import OrbitalJourneyTimeline from '@/components/ecosystem/OrbitalJourneyTimeline';
import LiveOpportunityCollision from '@/components/ecosystem/LiveOpportunityCollision';
import PixelatedCursor from '@/components/ui/PixelatedCursor';

export const InnovationEcosystem: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-[#09daed] selection:text-black relative overflow-hidden">
      {/* Official White Brand Navbar (Same as Home Page & Site-Wide) */}
      <Navbar />

      {/* Inkbleed Pixelated Cursor movement across Battlefield page */}
      <div className="fixed inset-0 pointer-events-none z-50">
        <PixelatedCursor label={false} />
      </div>

      {/* Real-time Movie Canvas VFX Engine — hidden on mobile for perf */}
      <div className="hidden sm:block">
        <CinematicVFXCanvas enableMouseShockwaves={true} intensity={1.2} />
      </div>

      {/* Main Hero Section: The Gravitational Core */}
      <section className="relative pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 min-h-[80vh] sm:min-h-[90vh] flex flex-col justify-center items-center text-center overflow-hidden">
        {/* Background Radial Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] sm:w-[650px] h-[320px] sm:h-[650px] bg-gradient-to-tr from-[#09daed]/20 via-sky-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center justify-center px-4 sm:px-5 py-2 rounded-full bg-sky-950/90 border border-[#09daed]/60 text-transparent bg-clip-text bg-gradient-to-r from-[#09daed] via-sky-300 to-white text-xs font-['Outfit'] font-black tracking-[0.22em] sm:tracking-[0.25em] uppercase shadow-[0_0_25px_rgba(9,218,237,0.35)]"
          >
            THE INNOVATION BATTLEFIELD
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.15] text-white font-['Plus_Jakarta_Sans']"
          >
            One ecosystem. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#09daed] via-sky-400 to-blue-500 font-['Plus_Jakarta_Sans'] font-black">
              Every opportunity
            </span>{' '}
            a startup needs.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl md:text-2xl text-slate-200 font-['Inter'] font-medium max-w-3xl mx-auto leading-relaxed px-2"
          >
            Founders come to build. People come to discover. <br className="hidden sm:block" />
            <span className="text-[#09daed] underline decoration-[#09daed]/50 font-bold font-['Plus_Jakarta_Sans']">
              Opportunities happen in between.
            </span>
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-3 sm:pt-4 w-full max-w-[340px] sm:max-w-none mx-auto"
          >
            <button
              onClick={() => navigate('/signup')}
              className="w-[88%] sm:w-auto px-5 sm:px-8 py-3.5 sm:py-4 rounded-xl bg-[#09daed] hover:bg-[#08c8d9] text-black font-['Plus_Jakarta_Sans'] font-extrabold text-sm sm:text-base tracking-wide uppercase shadow-[0_0_35px_rgba(9,218,237,0.5)] transition-all hover:scale-105 flex items-center justify-center gap-2"
            >
              Launch Your Idea Into Orbit <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <button
              onClick={() => {
                const el = document.getElementById('pillars-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-[88%] sm:w-auto px-5 sm:px-6 py-3.5 sm:py-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-['Plus_Jakarta_Sans'] font-bold text-sm sm:text-base transition-colors flex items-center justify-center gap-2"
            >
              <Compass className="w-4 h-4 sm:w-5 sm:h-5 text-[#09daed]" />
              Explore Ecosystem
            </button>
          </motion.div>
        </div>

      </section>

      {/* Section 2: The 7 Pillars of Ecosystem Gravity */}
      <div id="pillars-section">
        <OpportunityNetworkSimulator />
      </div>

      {/* Section 3: Orbital Journey Timeline (From Spark to Supernova) */}
      <OrbitalJourneyTimeline />

      {/* Section 4: Live Opportunity Collision Matchmaker */}
      <LiveOpportunityCollision />

      {/* Footer */}
      <footer className="relative py-12 sm:py-20 px-4 bg-slate-950 border-t border-[#09daed]/20 text-center">
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-950/60 border border-[#09daed]/40 text-[#09daed] text-[10px] sm:text-xs font-mono">
            <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#09daed]" />
            READY TO JOIN THE GRAVITATIONAL CORE?
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-white font-['Plus_Jakarta_Sans']">
            Build Together, Not Alone.
          </h2>

          <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto font-['Inter']">
            Whether you have a napkin sketch or an active product, enter the one ecosystem built to turn ideas into unstoppable momentum.
          </p>

          <div>
            <button
              onClick={() => navigate('/signup')}
              className="w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 rounded-2xl bg-gradient-to-r from-[#09daed] via-sky-400 to-blue-500 text-black font-['Plus_Jakarta_Sans'] font-black text-base sm:text-lg uppercase tracking-wider shadow-[0_0_50px_rgba(9,218,237,0.6)] hover:scale-105 transition-transform"
            >
              Enter Neesh AI Ecosystem
            </button>
          </div>

          <div className="pt-8 sm:pt-12 text-[10px] sm:text-xs font-mono text-slate-500 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 border-t border-slate-900">
            <span className="font-['Outfit'] font-black text-slate-400">© 2026 NEESH AI INC.</span>
            <span>THE INNOVATION ECOSYSTEM</span>
            <span>ALL RIGHTS RESERVED</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default InnovationEcosystem;
