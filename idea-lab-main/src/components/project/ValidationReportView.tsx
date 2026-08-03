import { useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Shield,
  Target,
  Users,
  Wrench,
  ArrowRight,
  Info,
  Sparkles,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────
interface ModuleData {
  name: string;
  confidence: number;
  status: string;
  insight: string;
  warnings: string[];
}

interface ValidationReport {
  overallScore: number;
  overallStatus: string;
  hasFatalZero: boolean;
  modules: {
    cvp: ModuleData;
    market: ModuleData;
    acquisition: ModuleData;
    defensibility: ModuleData;
    buildability: ModuleData;
  };
  strengths: string[];
  weaknesses: string[];
  warnings: string[];
  nextStep: string;
}

interface ValidationReportViewProps {
  reportJson: string;
}

// ─── Module icon / color mappings ──────────────────────────────
const MODULE_META: Record<string, { icon: typeof Target; color: string; bg: string; border: string }> = {
  cvp: {
    icon: Target,
    color: "#2563eb",
    bg: "rgba(37, 99, 235, 0.08)",
    border: "rgba(37, 99, 235, 0.2)",
  },
  market: {
    icon: TrendingUp,
    color: "#7c3aed",
    bg: "rgba(124, 58, 237, 0.08)",
    border: "rgba(124, 58, 237, 0.2)",
  },
  acquisition: {
    icon: Users,
    color: "#059669",
    bg: "rgba(5, 150, 105, 0.08)",
    border: "rgba(5, 150, 105, 0.2)",
  },
  defensibility: {
    icon: Shield,
    color: "#d97706",
    bg: "rgba(217, 119, 6, 0.08)",
    border: "rgba(217, 119, 6, 0.2)",
  },
  buildability: {
    icon: Wrench,
    color: "#4f46e5",
    bg: "rgba(79, 70, 229, 0.08)",
    border: "rgba(79, 70, 229, 0.2)",
  },
};

function scoreColor(score: number): string {
  if (score >= 85) return "#10B981";
  if (score >= 70) return "#06B6D4";
  if (score >= 55) return "#F59E0B";
  return "#EF4444";
}

function statusBadgeStyle(status: string): { bg: string; text: string; border: string } {
  const s = status ? status.toLowerCase() : "";
  if (s.includes("strong") || s.includes("pass")) {
    return { bg: "rgba(16, 185, 129, 0.12)", text: "#047857", border: "rgba(16, 185, 129, 0.3)" };
  }
  if (s.includes("moderate") || s.includes("good")) {
    return { bg: "rgba(6, 182, 212, 0.12)", text: "#0e7490", border: "rgba(6, 182, 212, 0.3)" };
  }
  if (s.includes("weak")) {
    return { bg: "rgba(245, 158, 11, 0.12)", text: "#b45309", border: "rgba(245, 158, 11, 0.3)" };
  }
  // Critical / Fatal / Failed
  return { bg: "rgba(244, 63, 94, 0.12)", text: "#be123c", border: "rgba(244, 63, 94, 0.3)" };
}

// ─── Component ─────────────────────────────────────────────────
const ValidationReportView = ({ reportJson }: ValidationReportViewProps) => {
  const report = useMemo<ValidationReport | null>(() => {
    try {
      if (!reportJson || reportJson === "{}" || reportJson === "null") {
        return null;
      }
      const raw = JSON.parse(reportJson);
      if (!raw) return null;

      // Map backend fields to frontend ValidationReport interface
      const mappedModules: any = {};
      
      if (Array.isArray(raw.modules)) {
        raw.modules.forEach((mod: any) => {
          const nameLower = mod.name ? mod.name.toLowerCase() : "";
          let key = "cvp";
          if (nameLower.includes("value") || nameLower.includes("cvp")) key = "cvp";
          else if (nameLower.includes("market")) key = "market";
          else if (nameLower.includes("acquisition")) key = "acquisition";
          else if (nameLower.includes("defensibility")) key = "defensibility";
          else if (nameLower.includes("buildability")) key = "buildability";

          let status = "Moderate";
          if (mod.internalScore === 0) status = "Critical";
          else if (mod.internalScore === 1) status = "Weak";
          else if (mod.internalScore === 2) status = "Moderate";
          else if (mod.internalScore === 3) status = "Strong";

          mappedModules[key] = {
            name: mod.name || "",
            confidence: mod.confidencePercent !== undefined ? mod.confidencePercent : 50,
            status: mod.status || status,
            insight: mod.insight || "",
            warnings: Array.isArray(mod.warnings) ? mod.warnings : [],
          };
        });
      } else if (raw.modules && typeof raw.modules === "object") {
        Object.entries(raw.modules).forEach(([k, mod]: [string, any]) => {
          mappedModules[k] = {
            name: mod.name || "",
            confidence: mod.confidence !== undefined ? mod.confidence : (mod.confidencePercent || 50),
            status: mod.status || "Moderate",
            insight: mod.insight || "",
            warnings: Array.isArray(mod.warnings) ? mod.warnings : [],
          };
        });
      }

      const defaultModule = (name: string) => ({
        name,
        confidence: 50,
        status: "Moderate",
        insight: "No insight available.",
        warnings: []
      });
      if (!mappedModules.cvp) mappedModules.cvp = defaultModule("Core Value Proposition");
      if (!mappedModules.market) mappedModules.market = defaultModule("Market Size");
      if (!mappedModules.acquisition) mappedModules.acquisition = defaultModule("Customer Acquisition");
      if (!mappedModules.defensibility) mappedModules.defensibility = defaultModule("Defensibility");
      if (!mappedModules.buildability) mappedModules.buildability = defaultModule("Buildability");

      const moduleValues = Object.values(mappedModules) as ModuleData[];
      const avgScore = moduleValues.length > 0 
        ? Math.round(moduleValues.reduce((sum, m) => sum + (m.confidence ?? 50), 0) / moduleValues.length)
        : 0;

      const hasFatalZero = Boolean(
        raw.hasFatalZero || 
        moduleValues.some((m: any) => (m.confidence !== undefined && m.confidence < 50) || m.status === "Critical" || m.internalScore === 0)
      );

      const overallStatus = hasFatalZero 
        ? "Slight Adjustments Needed" 
        : (raw.overallStatus && !raw.overallStatus.toLowerCase().includes("failed") ? raw.overallStatus : "100% Market Ready Startup");

      const strengths = Array.isArray(raw.strengths) 
        ? raw.strengths 
        : (raw.actionPlan && Array.isArray(raw.actionPlan.strengths) ? raw.actionPlan.strengths : []);

      const warnings = Array.isArray(raw.warnings) ? raw.warnings : [];
      const nextStep = raw.nextStep || (raw.actionPlan ? raw.actionPlan.nextStep : "") || "";

      return {
        overallScore: avgScore,
        overallStatus,
        hasFatalZero,
        modules: mappedModules,
        strengths,
        weaknesses: [],
        warnings,
        nextStep,
      };
    } catch (e) {
      console.error("[ValidationReportView] JSON parse error:", e);
      return null;
    }
  }, [reportJson]);

  if (!report) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-gray-500 shadow-sm">
        <Info className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm font-medium">Validation report is being generated or answers are incomplete.</p>
      </div>
    );
  }

  const radius = 94;
  const circumference = 2 * Math.PI * radius; // ~590.62
  const strokeDash = (report.overallScore / 100) * circumference;

  return (
    <div className="space-y-6 font-sans">
      {/* ──── Cybernetic Futuristic Hero Score Banner ──── */}
      <div className="relative rounded-3xl p-7 md:p-9 bg-gradient-to-br from-[#0B132B] via-[#1C2541] to-[#0A1128] text-white shadow-[0_20px_50px_-10px_rgba(8,145,178,0.25)] border border-cyan-500/30 overflow-hidden group">
        {/* Background Subtle Tech Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#38bdf80f_1px,transparent_1px),linear-gradient(to_bottom,#38bdf80f_1px,transparent_1px)] bg-[size:28px_28px] pointer-events-none" />
        
        {/* Ambient Glowing Background Bulbs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-cyan-500/15 blur-[100px] pointer-events-none group-hover:bg-cyan-500/25 transition-all duration-700" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-indigo-500/15 blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Left Details */}
          <div className="text-center md:text-left space-y-3.5 max-w-xl">
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-400/30 text-cyan-200 text-xs font-sans font-semibold tracking-normal backdrop-blur-xl shadow-inner">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
              </span>
              <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
              <span>{report.overallStatus}</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-snug font-display">
              Phase 1 Validation Report
            </h2>

            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed font-medium">
              Your startup concept has been evaluated across 5 critical market dimensions using startup-ready validation algorithms. Review your score breakdown below to optimize your launch trajectory.
            </p>
          </div>

          {/* Right Expanded & Perfect Illuminated Gauge */}
          <div className="relative w-56 h-56 md:w-64 md:h-64 flex-shrink-0 flex items-center justify-center">
            {/* Outer Subtle Pulsing Ring */}
            <div className="absolute inset-2 rounded-full border border-cyan-400/20 animate-pulse pointer-events-none" />

            <svg
              className="w-full h-full transform -rotate-90 drop-shadow-[0_0_20px_rgba(6,182,212,0.45)]"
              viewBox="0 0 240 240"
            >
              <defs>
                <linearGradient id="futuristicScoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="50%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
                <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              
              {/* Inner ambient fill circle */}
              <circle cx="120" cy="120" r="78" fill="rgba(6, 182, 212, 0.03)" />

              {/* Outer track circle (Full Background Ring) */}
              <circle
                cx="120"
                cy="120"
                r={radius}
                fill="none"
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth="16"
              />

              {/* Active Score Segment Ring */}
              <circle
                cx="120"
                cy="120"
                r={radius}
                fill="none"
                stroke="url(#futuristicScoreGradient)"
                strokeWidth="16"
                strokeLinecap="round"
                strokeDasharray={`${strokeDash} ${circumference}`}
                filter="url(#glowEffect)"
                style={{ transition: "stroke-dasharray 1.4s cubic-bezier(0.16, 1, 0.3, 1)" }}
              />
            </svg>

            {/* Inner Score Label Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 pointer-events-none">
              <span className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-cyan-300 tracking-tighter drop-shadow-md font-display">
                {report.overallScore}%
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-300 bg-cyan-950/80 px-3 py-0.5 rounded-full border border-cyan-400/30 mt-1 shadow-sm font-display">
                Validation Score
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ──── Module Cards Grid ──── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(Object.entries(report.modules) as [string, ModuleData][]).map(([key, mod]) => {
          const meta = MODULE_META[key] || MODULE_META.cvp;
          const Icon = meta.icon;
          const badge = statusBadgeStyle(mod.status);
          const confCircum = 2 * Math.PI * 28; // 175.93
          const confDash = (mod.confidence / 100) * confCircum;

          return (
            <div
              key={key}
              className="group relative bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-cyan-400/60 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-xs"
                      style={{ background: meta.bg, borderColor: meta.border }}
                    >
                      <Icon className="w-5 h-5" style={{ color: meta.color }} />
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm font-display">{mod.name}</h3>
                  </div>
                  <span
                    className="text-[11px] font-bold px-3 py-0.5 rounded-full border uppercase tracking-wide shadow-2xs font-sans"
                    style={{ background: badge.bg, color: badge.text, borderColor: badge.border }}
                  >
                    {mod.status}
                  </span>
                </div>

                {/* Confidence Ring + Insight */}
                <div className="flex items-start gap-3.5 my-2">
                  <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 72 72">
                      <circle cx="36" cy="36" r="28" fill="none" stroke="#f1f5f9" strokeWidth="6" />
                      <circle
                        cx="36"
                        cy="36"
                        r="28"
                        fill="none"
                        stroke={scoreColor(mod.confidence)}
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={`${confDash} ${confCircum}`}
                        style={{ transition: "stroke-dasharray 1s ease-out" }}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-slate-900 font-display">
                      {mod.confidence}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium pt-1">
                    {mod.insight}
                  </p>
                </div>
              </div>

              {/* Module Warnings */}
              {mod.warnings && mod.warnings.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                  {mod.warnings.map((w, wi) => (
                    <p key={wi} className="text-[11px] text-amber-800 font-medium flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      {w}
                    </p>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ──── Key Strengths (Full Width) ──── */}
      <div className="w-full rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-100">
            <CheckCircle2 className="w-5 h-5 text-cyan-600" />
          </div>
          <h3 className="text-base font-bold text-slate-900 font-display">Key Core Strengths</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {report.strengths.length > 0 ? (
            report.strengths.map((s, i) => (
              <div key={i} className="flex items-start gap-2.5 bg-slate-50/80 p-3.5 rounded-xl border border-slate-100">
                <div className="w-2 h-2 rounded-full bg-cyan-500 mt-1.5 shrink-0" />
                <p className="text-xs sm:text-sm text-slate-700 font-medium">{s}</p>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 italic">Complete more onboarding questions to unlock detailed strengths.</p>
          )}
        </div>
      </div>

      {/* ──── Recommended Next Step Banner ──── */}
      <div className="rounded-2xl p-6 bg-gradient-to-r from-cyan-600 via-teal-600 to-cyan-700 text-white shadow-lg shadow-cyan-500/20 border border-cyan-400/30 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30">
          <ArrowRight className="w-6 h-6 text-white" />
        </div>
        <div className="space-y-0.5">
          <h4 className="text-sm font-extrabold text-white uppercase tracking-wider font-display">Recommended Next Step</h4>
          <p className="text-xs sm:text-sm text-cyan-50 font-medium leading-relaxed">
            Verify your Spotlight pitch and edit if needed. Then, publish it in our cross-promotional engine, share it across your network, and start gathering real-world audience insights!
          </p>
        </div>
      </div>
    </div>
  );
};

export default ValidationReportView;

