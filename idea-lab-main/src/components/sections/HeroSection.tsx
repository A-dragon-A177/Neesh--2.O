import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Link } from "react-router-dom";

export default function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const y = useTransform(scrollYProgress, [0, 0.6], [0, -80]);

  return (
    <section
      ref={containerRef}
      className="relative min-h-[90vh] bg-gray-950 flex items-center overflow-hidden"
    >
      {/* ── Background HD Video (Dark Theme - 40% Opacity) ── */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none opacity-40"
      >
        <source src="/videos/Globe_rotating_full_circle_seamless_202607312227.mp4" type="video/mp4" />
      </video>

      {/* ── Dark gradient overlay for text legibility ── */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-gray-950/70 via-gray-950/40 to-gray-950/80 pointer-events-none" />

      {/* Subtle grid (over the video) */}
      <div
        className="absolute inset-0 z-[2] opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#09daed 1px, transparent 1px), linear-gradient(90deg, #09daed 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Radial glow accents */}
      <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-[#09daed]/10 blur-[150px] pointer-events-none z-[2]" />
      <div className="absolute bottom-1/4 right-1/3 w-72 h-72 bg-[#09daed]/8 blur-[100px] pointer-events-none z-[2]" />

      {/* ── Hero Content ── */}
      <motion.div
        style={{ opacity, y, zIndex: 10, position: "relative" }}
        className="max-w-[1440px] mx-auto px-6 pt-32 pb-16 w-full text-center"
      >
        <div className="flex flex-col items-center">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 border border-[#09daed]/40 bg-[#09daed]/10 backdrop-blur-md mb-8 rounded-sm"
            >
              <div className="w-1.5 h-1.5 bg-[#09daed] animate-pulse" />
              <span className="text-[#09daed] text-xs font-bold tracking-widest uppercase">
                AI-Powered Startup Development and Validation Platform
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.7 }}
              className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-white leading-[1.1] tracking-tight mb-6 drop-shadow-lg"
            >
              With Great{" "}
              <span className="text-[#09daed] font-extrabold drop-shadow-[0_0_20px_rgba(9,218,237,0.5)]">
                Ideas
              </span>{" "}
              Comes Great{" "}
              <span className="text-[#09daed] font-extrabold drop-shadow-[0_0_20px_rgba(9,218,237,0.5)]">
                Responsibility
              </span>
            </motion.h1>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-gray-200 mb-6 drop-shadow-md"
            >
              Find Your <span className="text-[#09daed]">Neesh</span> (Niche) in a Tailor-Made Startup Ecosystem
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="text-gray-300 text-lg md:text-xl leading-relaxed mb-10 max-w-3xl mx-auto font-medium"
            >
              Where founders build, validate, and launch — powered by real audience signals, short-form pitch reels, and community momentum.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center w-full max-w-md sm:max-w-none mx-auto"
            >
              <Link
                to="/signup"
                className="w-full sm:w-auto bg-[#09daed] text-black font-extrabold px-8 py-4 text-sm hover:bg-[#07c4d4] transition-all duration-200 animate-pulse-glow shadow-lg shadow-[#09daed]/25 inline-block text-center rounded-sm"
              >
                Start Validating for Free
              </Link>
              <Link
                to="/space"
                className="w-full sm:w-auto border border-[#09daed]/40 bg-white/10 backdrop-blur-md text-white font-bold px-8 py-4 text-sm hover:bg-white/20 transition-all duration-200 inline-block text-center rounded-sm"
              >
                Explore Pitches
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.6 }}
              className="grid grid-cols-3 gap-3 sm:gap-8 md:gap-12 mt-10 sm:mt-12 pt-8 border-t border-white/10 w-full"
            >
              {[["1,000+", "Founders"], ["23.7k", "Spotlight Views"], ["20.9k", "Validated Signals"]].map(([val, label]) => (
                <div key={label} className="text-center">
                  <div className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#09daed]">{val}</div>
                  <div className="text-[10px] sm:text-xs text-gray-400 font-medium tracking-wider uppercase mt-0.5">{label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Bottom border line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#09daed]/40 to-transparent z-10" />
    </section>
  );
}
