import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, Users, Zap, ShieldCheck, TrendingUp, Award } from "lucide-react";

const FOUNDER_STEPS = [
  {
    icon: Lightbulb,
    title: "Post your Spark",
    desc: "Write a one-sentence pitch and choose your domain. Your startup stays anonymous until you choose to reveal it.",
  },
  {
    icon: Zap,
    title: "Launch a Sprint",
    desc: "Pay ₹84/day to run a validation sprint. Minimum 3 Pioneers must engage — or your money back.",
  },
  {
    icon: TrendingUp,
    title: "Get domain feedback",
    desc: "Receive structured feedback from verified domain Pioneers with 3–15 years of industry experience.",
  },
  {
    icon: ShieldCheck,
    title: "Sprint Guarantee",
    desc: "If fewer than 3 Pioneers engage in your sprint, claim a full refund within 13 days of expiry.",
  },
];

const EXPLORER_STEPS = [
  {
    icon: Users,
    title: "Verify your domain",
    desc: "Connect LinkedIn to prove your domain experience. We detect your tenure and assign your Pioneer grade.",
  },
  {
    icon: Award,
    title: "Start as SCOUT",
    desc: "New Pioneers start at SCOUT grade. Senior Pioneers (5+ years) begin at PRO with an accelerated track.",
  },
  {
    icon: TrendingUp,
    title: "Engage with Sparks",
    desc: "Browse anonymous startup pitches in your domain. Leave structured feedback — founders pay for your expertise.",
  },
  {
    icon: ShieldCheck,
    title: "Earn & rank up",
    desc: "Each quality interaction earns commission credits and moves you toward MASTER and ELITE grades.",
  },
];

export default function HowItWorksV19Section() {
  const [tab, setTab] = useState<"founder" | "explorer">("founder");
  const steps = tab === "founder" ? FOUNDER_STEPS : EXPLORER_STEPS;

  return (
    <section className="bg-muted/30 py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <span className="text-xs font-semibold tracking-widest text-primary uppercase mb-3 block">
            How it works
          </span>
          <h2 className="text-3xl md:text-4xl font-bold">Two sides. One validation loop.</h2>
        </motion.div>

        {/* Tab switcher */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex rounded-full border p-1 bg-background">
            {(["founder", "explorer"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                  tab === t
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "founder" ? "For Founders" : "For Pioneers"}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3 }}
            className="grid gap-6 sm:grid-cols-2"
          >
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className="rounded-xl border bg-card p-6 flex gap-4"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground font-mono">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <h3 className="font-semibold text-sm">{step.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
