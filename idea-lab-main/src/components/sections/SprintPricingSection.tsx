import { motion } from "framer-motion";
import { ShieldCheck, Zap } from "lucide-react";
import { Link } from "react-router-dom";

const DAYS = [
  { days: 1, label: "1 day", popular: false },
  { days: 3, label: "3 days", popular: false },
  { days: 7, label: "7 days", popular: true },
  { days: 14, label: "14 days", popular: false },
  { days: 30, label: "30 days", popular: false },
];

const DAY_PRICE_RS = 84;

export default function SprintPricingSection() {
  return (
    <section className="bg-muted/30 py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <span className="text-xs font-semibold tracking-widest text-primary uppercase mb-3 block">
            Sprint pricing
          </span>
          <h2 className="text-3xl md:text-4xl font-bold">
            ₹84/day. No hidden fees.
          </h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            Pick the duration that fits your validation window. 7-day and longer sprints are eligible for the
            Sprint Guarantee.
          </p>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-5">
          {DAYS.map((tier, i) => {
            const total = tier.days * DAY_PRICE_RS;
            return (
              <motion.div
                key={tier.days}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className={`rounded-xl border p-5 flex flex-col gap-3 relative ${
                  tier.popular
                    ? "border-primary bg-primary/5 shadow-md"
                    : "bg-card"
                }`}
              >
                {tier.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-0.5 rounded-full">
                    Most popular
                  </span>
                )}
                <div className="text-center">
                  <p className="text-2xl font-bold">₹{total}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{tier.label}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">
                    ₹{DAY_PRICE_RS}/day
                  </p>
                  {tier.days >= 7 && (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mt-1">
                      <ShieldCheck className="w-3 h-3" /> Guarantee eligible
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="mt-10 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4"
        >
          <ShieldCheck className="w-8 h-8 text-green-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-green-800 dark:text-green-200">Sprint Guarantee</p>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
              If your Sprint ends with fewer than 3 Pioneer engagements, claim a full refund within 13 days.
              Applies to all Sprints of 7 days or longer.
            </p>
          </div>
          <Link
            to="/for-founders"
            className="text-sm text-green-700 dark:text-green-300 font-medium flex items-center gap-1 hover:underline flex-shrink-0"
          >
            Learn more <Zap className="w-3 h-3" />
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="text-center mt-8"
        >
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-full font-semibold hover:bg-primary/90 transition-colors"
          >
            <Zap className="w-4 h-4" /> Start your first Sprint
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
