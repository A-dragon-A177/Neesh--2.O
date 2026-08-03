import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useInView } from "../../hooks/useScrollProgress";
import { Link } from "react-router-dom";
import { Play, Clock, Rocket, Sparkles, Heart, MessageSquare, Eye, ChevronUp, ChevronDown, Check, Code, ShieldCheck } from "lucide-react";

/* ── Anonymous Startup Concept Pitch Demos ── */
const DEMO_PITCHES = [
  {
    id: "messaging-app",
    title: "Instant Global Messaging Network",
    authorTag: "PITCH DEMO #01",
    authorInitial: "M",
    oneLineSummary: "A fast, lightweight, ad-free mobile messenger that replaces traditional SMS. Send text, voice notes, and media instantly over mobile data without SMS fees.",
    elevatorHook: "Why pay $0.20 per SMS when internet data gives you unlimited instant messaging, photos, and voice calls worldwide for free?",
    duration: 28,
    intentScore: 95.2,
    interested: "104.2k Interested",
    likes: 8420,
    comments: 642,
    views: "43.7k",
    coverGradient: "from-emerald-950 via-[#064e3b] to-slate-950",
    accentColor: "#10b981",
    tag: "COMMUNICATION",
    gifType: "messaging",
  },
  {
    id: "home-sharing",
    title: "Peer-to-Peer Global Home Sharing",
    authorTag: "PITCH DEMO #02",
    authorInitial: "H",
    oneLineSummary: "An open marketplace connecting homeowners with travelers seeking unique, affordable stays instead of expensive traditional hotels.",
    elevatorHook: "What if travelers could book authentic local spare rooms anywhere in the world — and hosts could earn passive income from unused space?",
    duration: 32,
    intentScore: 93.6,
    interested: "118.5k Interested",
    likes: 9140,
    comments: 587,
    views: "38.2k",
    coverGradient: "from-rose-950 via-[#881337] to-slate-950",
    accentColor: "#f43f5e",
    tag: "TRAVEL & HOSPITALITY",
    gifType: "hospitality",
  },
  {
    id: "payments-api",
    title: "7-Line Developer Payment Infrastructure",
    authorTag: "PITCH DEMO #03",
    authorInitial: "P",
    oneLineSummary: "Developer-first financial infrastructure. Accept credit cards and digital payments online instantly with simple code integrations.",
    elevatorHook: "Why does accepting card payments online require 6 weeks of banking bureaucracy and complex code? We fixed it in 7 lines.",
    duration: 25,
    intentScore: 97.4,
    interested: "126.8k Interested",
    likes: 11210,
    comments: 818,
    views: "52.4k",
    coverGradient: "from-indigo-950 via-[#312e81] to-slate-950",
    accentColor: "#6366f1",
    tag: "FINANCIAL TECH",
    gifType: "fintech",
  },
];

/* ── Perfectly Aligned GIF Video Simulation Renderers ── */
function MessagingGifVisual() {
  return (
    <div className="w-full h-full flex flex-col justify-between p-3.5 bg-[#071e16]/90 backdrop-blur-md rounded-2xl border border-emerald-500/30 text-white relative overflow-hidden shadow-inner">
      <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">Instant Messenger</span>
        </div>
        <span className="text-[9px] text-emerald-300/80 font-mono">0.00s / data-only</span>
      </div>

      <div className="space-y-2 py-2">
        {/* Animated Message Bubble 1 */}
        <motion.div
          initial={{ opacity: 0, x: -15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ repeat: Infinity, repeatDelay: 3, duration: 0.5 }}
          className="max-w-[88%] bg-slate-900/90 border border-slate-700 p-2 rounded-xl text-xs space-y-0.5 shadow-md"
        >
          <div className="text-[9px] text-emerald-400 font-bold">User A</div>
          <div className="text-[11px] text-slate-200">Hey! Did you pay $0.20 for that SMS? 💸</div>
        </motion.div>

        {/* Animated Message Bubble 2 */}
        <motion.div
          initial={{ opacity: 0, x: 15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7, repeat: Infinity, repeatDelay: 3, duration: 0.5 }}
          className="max-w-[88%] ml-auto bg-emerald-600/40 border border-emerald-400/50 p-2 rounded-xl text-xs space-y-0.5 shadow-md text-emerald-50"
        >
          <div className="text-[9px] text-emerald-300 font-bold">User B</div>
          <div className="text-[11px]">No way! Sending unlimited text, photos & voice over data for $0! 🚀</div>
          <div className="flex justify-end items-center gap-1 text-[8px] text-emerald-300 pt-0.5">
            <span>12:04 PM</span>
            <Check className="w-3 h-3 text-emerald-300" />
          </div>
        </motion.div>

        {/* Animated Audio Waveform Bubble */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.4, repeat: Infinity, repeatDelay: 3, duration: 0.5 }}
          className="max-w-[80%] bg-emerald-950/90 border border-emerald-500/40 p-1.5 px-2.5 rounded-xl flex items-center gap-2 shadow-md"
        >
          <div className="w-5 h-5 rounded-full bg-emerald-500 text-black font-black text-[10px] flex items-center justify-center shrink-0">
            ▶
          </div>
          <div className="flex-1 flex items-center gap-0.5 h-3">
            {[40, 80, 60, 100, 50, 90, 70, 40, 80].map((h, i) => (
              <motion.div
                key={i}
                animate={{ height: ["30%", "100%", "40%"] }}
                transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.1 }}
                className="w-1 bg-emerald-400 rounded-full"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <span className="text-[9px] font-mono text-emerald-300">0:14</span>
        </motion.div>
      </div>

      <div className="flex items-center justify-between text-[9px] text-emerald-300/80 font-bold pt-1.5 border-t border-emerald-500/20">
        <span>⚡ Instant Delivery</span>
        <span>🔒 End-to-End Encrypted</span>
      </div>
    </div>
  );
}

function HospitalityGifVisual() {
  return (
    <div className="w-full h-full flex flex-col justify-between p-3.5 bg-[#230811]/90 backdrop-blur-md rounded-2xl border border-rose-500/30 text-white relative overflow-hidden shadow-inner">
      <div className="flex items-center justify-between border-b border-rose-500/20 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
          <span className="text-[10px] font-black text-rose-400 uppercase tracking-wider">Home Sharing Network</span>
        </div>
        <span className="text-[9px] text-rose-300/80 font-mono">P2P Stay Demo</span>
      </div>

      <div className="space-y-2.5 py-2">
        {/* Animated Room Card */}
        <motion.div
          animate={{ y: [0, -3, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          className="bg-slate-900/90 border border-rose-500/40 rounded-xl p-2.5 shadow-lg space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-500/30 border border-rose-400/40 flex items-center justify-center text-xs font-black text-rose-300">
                🏡
              </div>
              <div>
                <div className="text-xs font-bold text-white">Cozy Loft in City Center</div>
                <div className="text-[9px] text-rose-300 font-medium">Hosted by Sarah · 4.9 ★ (124 reviews)</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-black text-rose-400">$45</div>
              <div className="text-[8px] text-slate-400">/ night</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-0.5 text-[9px]">
            <div className="bg-slate-800/80 p-1 rounded-md border border-slate-700 text-slate-300 flex items-center justify-between px-2">
              <span>Dates:</span>
              <span className="font-bold text-rose-300">Jul 14 - 18</span>
            </div>
            <div className="bg-slate-800/80 p-1 rounded-md border border-slate-700 text-slate-300 flex items-center justify-between px-2">
              <span>Guests:</span>
              <span className="font-bold text-white">2 Guests</span>
            </div>
          </div>
        </motion.div>

        {/* Animated Booking Confirmation Toast */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, repeat: Infinity, repeatDelay: 2.5, duration: 0.4 }}
          className="bg-rose-600/30 border border-rose-400/50 p-2 rounded-xl flex items-center justify-between text-xs text-rose-100 font-bold shadow-md"
        >
          <div className="flex items-center gap-1.5 text-[10px]">
            <ShieldCheck className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>Instant Stay Reservation Confirmed!</span>
          </div>
          <span className="text-[8px] bg-rose-500 text-white px-1.5 py-0.5 rounded-full font-black uppercase shrink-0">Verified</span>
        </motion.div>
      </div>

      <div className="flex items-center justify-between text-[9px] text-rose-300/80 font-bold pt-1.5 border-t border-rose-500/20">
        <span>🏡 100% Peer-to-Peer</span>
        <span>💰 Host Passive Income</span>
      </div>
    </div>
  );
}

function FintechGifVisual() {
  return (
    <div className="w-full h-full flex flex-col justify-between p-3.5 bg-[#0e0c24]/90 backdrop-blur-md rounded-2xl border border-indigo-500/30 text-white relative overflow-hidden shadow-inner">
      <div className="flex items-center justify-between border-b border-indigo-500/20 pb-2">
        <div className="flex items-center gap-2">
          <Code className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider">7-Line Payment API</span>
        </div>
        <span className="text-[9px] text-indigo-300/80 font-mono">Terminal Output</span>
      </div>

      <div className="space-y-2 py-1.5 font-mono text-[9px]">
        {/* Animated Code Lines */}
        <div className="bg-slate-950 p-2.5 rounded-xl border border-indigo-500/30 space-y-0.5 text-slate-300 shadow-lg leading-relaxed">
          <div className="text-indigo-400 font-bold">// 1. Initialize Payments API</div>
          <div className="flex items-center gap-1">
            <span className="text-purple-400 font-bold">const</span>
            <span>payments =</span>
            <span className="text-yellow-300 font-bold">initNeeshPay</span>();
          </div>
          <div className="flex items-center gap-1">
            <span className="text-purple-400 font-bold">await</span>
            <span>payments.</span>
            <span className="text-blue-400 font-bold">chargeCard</span>(&#123;
          </div>
          <div className="pl-3 text-emerald-300">amount: 12000, currency: "USD",</div>
          <div className="pl-3 text-emerald-300">cardToken: "tok_visa_4242"</div>
          <div>&#125;);</div>
        </div>

        {/* Live Payment Executed Popup */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.1, repeat: Infinity, repeatDelay: 2.5, duration: 0.4 }}
          className="bg-emerald-500/20 border border-emerald-400/50 p-2 rounded-xl flex items-center justify-between text-xs text-emerald-300 font-bold shadow-md"
        >
          <div className="flex items-center gap-1.5 text-[10px]">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span>HTTP 200 OK — Payment Approved</span>
          </div>
          <span className="font-mono text-white text-[11px] font-black shrink-0">$120.00</span>
        </motion.div>
      </div>

      <div className="flex items-center justify-between text-[9px] text-indigo-300/80 font-bold pt-1.5 border-t border-indigo-500/20">
        <span>⚡ 7 Lines of Code</span>
        <span>💳 Global Instant Checkout</span>
      </div>
    </div>
  );
}

export default function PitchShowcaseSection() {
  const { ref, inView } = useInView(0.15);
  const [activePitch, setActivePitch] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const pitch = DEMO_PITCHES[activePitch];

  // Auto-scroll vertically down to next pitch every 5 seconds
  const goNext = useCallback(() => {
    setActivePitch((prev) => (prev + 1) % DEMO_PITCHES.length);
    setProgress(0);
  }, []);

  const goPrev = useCallback(() => {
    setActivePitch((prev) => (prev - 1 + DEMO_PITCHES.length) % DEMO_PITCHES.length);
    setProgress(0);
  }, []);

  useEffect(() => {
    if (isHovered) return;
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          goNext();
          return 0;
        }
        return prev + 2;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isHovered, goNext]);

  const formatDuration = (sec: number) => {
    return sec < 60 ? `${sec}s` : `${Math.floor(sec / 60)}m ${sec % 60}s`;
  };

  return (
    <section className="relative bg-gradient-to-b from-slate-200/70 via-slate-100/70 to-slate-200/70 py-16 md:py-20 overflow-hidden">
      {/* Glow */}
      <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-[#09daed]/5 blur-[150px] pointer-events-none" />

      <div className="max-w-[1440px] mx-auto px-4 md:px-6 relative z-10">
        {/* Header */}
        <div ref={ref as React.RefObject<HTMLDivElement>} className="text-center mb-10 md:mb-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 border border-[#09daed]/30 bg-[#09daed]/10 text-[#008494] text-xs font-black tracking-widest uppercase rounded-full mb-4"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#09daed]" />
            Neesh Pitch Reels
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-950 leading-[1.1] tracking-tight mb-4"
          >
            Pitch your vision in <span className="text-[#09daed]">30 seconds.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2 }}
            className="text-slate-600 text-base md:text-lg max-w-2xl mx-auto font-medium leading-relaxed"
          >
            Showcase your startup through interactive elevator pitch reels. Real audience validation, AI chatbot training, and investor-ready Spotlights — all in one link.
          </motion.p>
        </div>

        {/* ── Pitch Card Showcase ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="max-w-5xl mx-auto"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Auto-scroll progress indicators */}
          <div className="flex items-center gap-2 mb-5">
            {DEMO_PITCHES.map((p, i) => (
              <button
                key={p.id}
                onClick={() => { setActivePitch(i); setProgress(0); }}
                className="flex-1 h-1.5 rounded-full overflow-hidden bg-slate-200 transition-all"
              >
                <div
                  className="h-full rounded-full transition-all duration-100"
                  style={{
                    width: i === activePitch ? `${progress}%` : i < activePitch ? "100%" : "0%",
                    background: i <= activePitch ? "#09daed" : "transparent",
                  }}
                />
              </button>
            ))}
          </div>

          {/* Main pitch card container */}
          <div className="relative bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.06)] min-h-[460px]">
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#09daed] via-[#7c3aed] to-[#09daed] z-20" />

            {/* Reels Downward Scroll Transition */}
            <AnimatePresence mode="wait">
              <motion.div
                key={pitch.id}
                initial={{ opacity: 0, y: 70 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -70 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="grid grid-cols-1 lg:grid-cols-12 min-h-[460px]"
              >
                {/* ── LEFT: Startup GIF Video Simulation Card ── */}
                <div className="lg:col-span-5 relative">
                  <div className={`h-full min-h-[360px] lg:min-h-[460px] bg-gradient-to-br ${pitch.coverGradient} relative overflow-hidden flex flex-col justify-between p-5`}>
                    {/* Grid Pattern */}
                    <div
                      className="absolute inset-0 opacity-[0.12]"
                      style={{
                        backgroundImage: `linear-gradient(#09daed 1px, transparent 1px), linear-gradient(90deg, #09daed 1px, transparent 1px)`,
                        backgroundSize: "20px 20px",
                      }}
                    />

                    {/* Bottom gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-black/30 pointer-events-none z-0" />

                    {/* Top Badges */}
                    <div className="relative z-10 flex items-center justify-between">
                      <span className="text-[10px] font-black tracking-widest px-2.5 py-1 rounded-md bg-white/10 backdrop-blur-md text-white border border-white/20 uppercase">
                        {pitch.tag}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-[#09daed]" />
                          {formatDuration(pitch.duration)}
                        </span>
                        <span className="text-[10px] font-black tracking-wider px-2.5 py-1 rounded-lg bg-[#09daed] text-black uppercase">
                          PITCH
                        </span>
                      </div>
                    </div>

                    {/* Live GIF Video Simulation Container (Centered & Unobstructed) */}
                    <div className="relative z-10 my-auto h-56 w-full flex items-center justify-center">
                      {pitch.gifType === "messaging" && <MessagingGifVisual />}
                      {pitch.gifType === "hospitality" && <HospitalityGifVisual />}
                      {pitch.gifType === "fintech" && <FintechGifVisual />}
                    </div>

                    {/* Bottom Right: Engagement Stats */}
                    <div className="relative z-10 flex items-center justify-between pt-2">
                      <div className="text-xs font-black text-amber-400 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-amber-400/30">
                        🔥 {pitch.interested}
                      </div>
                      <div className="flex items-center gap-3 text-white/80">
                        <div className="flex items-center gap-1">
                          <Heart className="w-3.5 h-3.5 fill-white/20" />
                          <span className="text-[11px] font-bold">{pitch.likes.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span className="text-[11px] font-bold">{pitch.comments}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" />
                          <span className="text-[11px] font-bold">{pitch.views}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── RIGHT: Pitch Details & Validation ── */}
                <div className="lg:col-span-7 p-6 md:p-8 flex flex-col justify-between">
                  <div>
                    {/* Header with Title & Interested Badge */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <div className="text-[10px] font-black text-[#008494] tracking-widest uppercase mb-1">
                          {pitch.authorTag}
                        </div>
                        <h3 className="text-2xl font-black text-slate-950 leading-tight">{pitch.title}</h3>
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-600 rounded-full text-xs font-black shrink-0">
                        🔥 {pitch.interested}
                      </div>
                    </div>

                    {/* Summary */}
                    <p className="text-sm text-slate-700 font-semibold leading-relaxed mb-6">
                      {pitch.oneLineSummary}
                    </p>

                    {/* Validation Metrics Bar */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-center">
                        <div className="text-xl font-black text-slate-950">{pitch.intentScore}%</div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Validation Score</div>
                      </div>
                      <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/20 text-center">
                        <div className="text-xl font-black text-amber-600">🔥 100k+</div>
                        <div className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">Interested Signals</div>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-center">
                        <div className="text-xl font-black text-[#008494]">{pitch.views}</div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Spotlight Views</div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Link
                      to="/space"
                      className="flex-1 bg-[#09daed] text-black font-extrabold py-3.5 px-5 text-sm hover:bg-[#07c4d4] transition-all rounded-xl text-center flex items-center justify-center gap-2 shadow-md hover:scale-[1.02]"
                    >
                      <Rocket className="w-4 h-4" />
                      Explore Neesh Space
                    </Link>
                    <Link
                      to="/signup"
                      className="flex-1 border-2 border-slate-900 text-slate-950 font-extrabold py-3.5 px-5 text-sm hover:bg-slate-900 hover:text-white transition-all rounded-xl text-center"
                    >
                      Submit Your Pitch
                    </Link>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Vertical Reels Navigation Control Buttons */}
            <button
              onClick={goPrev}
              className="absolute right-4 top-4 z-30 w-8 h-8 rounded-full bg-white/90 border border-slate-200 shadow-md flex items-center justify-center hover:bg-white hover:scale-110 transition-all"
              title="Previous Pitch"
            >
              <ChevronUp className="w-5 h-5 text-slate-700" />
            </button>
            <button
              onClick={goNext}
              className="absolute right-4 top-14 z-30 w-8 h-8 rounded-full bg-white/90 border border-slate-200 shadow-md flex items-center justify-center hover:bg-white hover:scale-110 transition-all"
              title="Next Pitch"
            >
              <ChevronDown className="w-5 h-5 text-slate-700" />
            </button>
          </div>

          {/* Pitch selector pills */}
          <div className="flex items-center justify-center gap-3 mt-6">
            {DEMO_PITCHES.map((p, i) => (
              <button
                key={p.id}
                onClick={() => { setActivePitch(i); setProgress(0); }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  i === activePitch
                    ? "bg-[#09daed]/15 text-[#008494] border border-[#09daed]/40"
                    : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
                }`}
              >
                <span
                  className="w-5 h-5 rounded-full text-white flex items-center justify-center text-[9px] font-black"
                  style={{ background: p.accentColor }}
                >
                  #{i + 1}
                </span>
                {p.tag}
              </button>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#09daed]/20 to-transparent" />
    </section>
  );
}
