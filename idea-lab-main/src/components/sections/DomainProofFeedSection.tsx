import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Zap, ArrowRight, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import apiClient from "@/lib/api";

interface AnonSpark {
  id: string;
  founder_label: string;
  startup_label: string;
  one_sentence_pitch: string;
  domain_name: string;
  domain_slug: string;
  sprint_active: boolean;
  pioneer_count: number;
}

const FALLBACK: AnonSpark[] = [
  {
    id: "anon-preview1",
    founder_label: "Fintech Founder",
    startup_label: "[Startup A]",
    one_sentence_pitch: "Helping India's gig workers build a credit history without a salary slip.",
    domain_name: "Fintech",
    domain_slug: "fintech",
    sprint_active: true,
    pioneer_count: 2,
  },
  {
    id: "anon-preview2",
    founder_label: "EdTech Founder",
    startup_label: "[Startup B]",
    one_sentence_pitch: "Turning India's 50M+ Tier-2 city students into job-ready engineers in 90 days.",
    domain_name: "EdTech",
    domain_slug: "edtech",
    sprint_active: false,
    pioneer_count: 0,
  },
  {
    id: "anon-preview3",
    founder_label: "HealthTech Founder",
    startup_label: "[Startup C]",
    one_sentence_pitch: "Connecting rural India to specialist doctors in under 10 minutes via WhatsApp.",
    domain_name: "HealthTech",
    domain_slug: "healthtech",
    sprint_active: true,
    pioneer_count: 1,
  },
];

export default function DomainProofFeedSection() {
  const [sparks, setSparks] = useState<AnonSpark[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<AnonSpark[]>("/api/sparks/preview")
      .then((data) => setSparks(data?.length ? data : FALLBACK))
      .catch(() => setSparks(FALLBACK))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="bg-background py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <span className="text-xs font-semibold tracking-widest text-primary uppercase mb-3 block">
            Live on Neesh
          </span>
          <h2 className="text-3xl md:text-4xl font-bold">
            Real founders. Real validation.
          </h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            These are anonymized Sparks from founders actively seeking domain feedback.
            Identities are revealed after a Pioneer engages.
          </p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {sparks.map((spark, i) => (
              <motion.div
                key={spark.id}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="rounded-xl border bg-card p-6 flex flex-col gap-4 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs bg-primary/10 text-primary rounded px-2 py-0.5 font-medium">
                    {spark.domain_name}
                  </span>
                  {spark.sprint_active && (
                    <span className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
                      <Zap className="w-3 h-3" /> Sprint Active
                    </span>
                  )}
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">{spark.founder_label}</p>
                  <p className="font-medium text-sm leading-relaxed">{spark.one_sentence_pitch}</p>
                </div>

                <div className="mt-auto pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
                  <span>{spark.pioneer_count} Pioneer{spark.pioneer_count !== 1 ? "s" : ""} engaged</span>
                  <span className="italic">{spark.startup_label}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="text-center mt-10"
        >
          <Link
            to="/domain/fintech"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            Browse all domains <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
