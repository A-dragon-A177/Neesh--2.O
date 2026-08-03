import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { Home, Layers, Eye, CreditCard, Rocket, LogIn, ArrowRight, Sparkles } from "lucide-react";
import { BetaBadgeLight } from "./BetaBadge";
import { NeeshLogo } from "./NeeshLogo";

const NAV_ITEMS = [
  { label: "Home", to: "/", icon: Home },
  { label: "Battlefield", to: "/innovation-ecosystem", icon: Sparkles },
  { label: "Features", to: "/features", icon: Layers },
  { label: "Spotlight", to: "/spotlight-info", icon: Eye },
  { label: "Pricing", to: "/pricing", icon: CreditCard },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  // Close on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white border-b border-slate-200 shadow-md"
          : "bg-white border-b border-slate-200/80 shadow-sm"
      }`}
    >
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 h-14 md:h-16 flex items-center justify-between overflow-hidden">
        <div className="flex items-center gap-2 h-full overflow-hidden">
          <Link to="/" className="flex items-center shrink-0 max-h-full">
            <NeeshLogo size="sm" showText={false} />
          </Link>
          <BetaBadgeLight variant="glow" type="beta" />
        </div>

        <div className="hidden md:flex items-center gap-8 h-full">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.to || (item.to === "/innovation-ecosystem" && location.pathname === "/battle-of-innovation");
            return (
              <Link
                key={item.label}
                to={item.to}
                className={`text-sm transition-all duration-200 font-semibold relative py-1.5 ${
                  isActive 
                    ? "text-[#09daed] font-extrabold" 
                    : "text-slate-700 hover:text-slate-950"
                }`}
              >
                {item.label}
                {isActive && (
                  <motion.div
                    layoutId="activeNavLine"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#09daed]"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link 
            to="/space" 
            className="relative flex items-center justify-center gap-2 px-6 py-2 rounded-xl border border-[#09daed]/60 bg-[#030712] text-white shadow-[0_0_15px_rgba(9,218,237,0.3)] hover:shadow-[0_0_25px_rgba(9,218,237,0.6)] transition-all duration-300 transform hover:scale-105 group overflow-hidden mr-2"
          >
            {/* Subtle Moving Galaxy Background & Stars */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#09daed]/20 via-sky-950/40 to-[#030712] pointer-events-none" />
            <div 
              className="absolute inset-0 opacity-60 pointer-events-none animate-[ping_4s_cubic-bezier(0,0,0.2,1)_infinite]"
              style={{
                backgroundImage: `radial-gradient(circle, #09daed 1px, transparent 1px), radial-gradient(circle, #ffffff 1px, transparent 1px)`,
                backgroundSize: "16px 16px",
                backgroundPosition: "0 0, 8px 8px",
              }}
            />
            <span className="relative z-10 font-['Outfit'] font-black tracking-wider text-sm text-white drop-shadow-[0_0_8px_rgba(9,218,237,0.8)]">
              Space
            </span>
            <span className="relative z-10 w-1.5 h-1.5 rounded-full bg-[#09daed] animate-pulse shadow-[0_0_8px_#09daed]" />
          </Link>
          <Link to="/login" className="text-slate-700 hover:text-slate-950 text-sm transition-colors px-4 py-2 font-semibold">
            Sign in
          </Link>
          <Link to="/signup" className="bg-[#09daed] text-black text-sm font-bold px-5 py-2.5 hover:bg-[#07c4d4] transition-colors inline-block text-center rounded-sm shadow-sm">
            Start Free
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-slate-800 w-10 h-10 flex flex-col items-center justify-center gap-1.5 focus:outline-none"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle Menu"
        >
          <div className={`w-6 h-0.5 bg-slate-900 transition-all duration-300 ${mobileOpen ? "rotate-45 translate-y-2" : ""}`} />
          <div className={`w-6 h-0.5 bg-slate-900 transition-all duration-300 ${mobileOpen ? "opacity-0" : ""}`} />
          <div className={`w-6 h-0.5 bg-slate-900 transition-all duration-300 ${mobileOpen ? "-rotate-45 -translate-y-2" : ""}`} />
        </button>
      </div>

      {/* ── Mobile Bottom Sheet Menu ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
              onClick={closeMobile}
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 rounded-t-[20px] shadow-[0_-4px_32px_rgba(0,0,0,0.15)] overflow-hidden"
              style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-9 h-1 bg-slate-300 rounded-full" />
              </div>

              {/* Navigation links */}
              <div className="px-5 pb-2">
                {NAV_ITEMS.map((item) => {
                  const isActive = location.pathname === item.to || (item.to === "/innovation-ecosystem" && location.pathname === "/battle-of-innovation");
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.label}
                      to={item.to}
                      className={`flex items-center gap-4 py-4 border-b border-slate-100 last:border-b-0 transition-colors ${
                        isActive ? "text-[#09daed]" : "text-slate-900"
                      }`}
                      onClick={closeMobile}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isActive ? "bg-[#09daed]/15 border border-[#09daed]/30" : "bg-slate-100"
                      }`}>
                        <Icon className={`w-5 h-5 ${isActive ? "text-[#09daed]" : "text-slate-700"}`} />
                      </div>
                      <span className={`text-base font-['Plus_Jakarta_Sans'] ${isActive ? "font-bold text-[#09daed]" : "font-semibold text-slate-900"}`}>
                        {item.label}
                      </span>
                      {isActive && (
                        <div className="ml-auto w-2 h-2 rounded-full bg-[#09daed] shadow-[0_0_8px_#09daed]" />
                      )}
                    </Link>
                  );
                })}
              </div>

              {/* CTA buttons */}
              <div className="px-5 pt-3 pb-4 space-y-3 border-t border-slate-100">
                <Link
                  to="/space"
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl border border-cyan-300/80 bg-cyan-50/80 transition-all active:scale-[0.98]"
                  onClick={closeMobile}
                >
                  <Rocket className="w-4.5 h-4.5 text-[#008494]" />
                  <span className="text-[#008494] font-bold text-sm tracking-wide">
                    Explore Space
                  </span>
                </Link>
                
                <div className="flex gap-3">
                  <Link
                    to="/login"
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border border-slate-200 text-slate-900 font-semibold text-sm transition-colors active:bg-slate-100"
                    onClick={closeMobile}
                  >
                    <LogIn className="w-4 h-4" />
                    Sign in
                  </Link>
                  <Link
                    to="/signup"
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#09daed] text-black font-bold text-sm transition-all active:scale-[0.98]"
                    onClick={closeMobile}
                  >
                    Start Free
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
