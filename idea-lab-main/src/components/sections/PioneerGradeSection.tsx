import { motion } from "framer-motion";

const GRADES = [
  {
    name: "SCOUT",
    min: 0,
    max: 4,
    color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    dot: "bg-gray-400",
    desc: "Entry-level Pioneer. Builds domain credibility through first interactions.",
  },
  {
    name: "SEED",
    min: 5,
    max: 14,
    color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    dot: "bg-green-500",
    desc: "Established voice. Founders begin to seek out SEED Pioneers by name.",
  },
  {
    name: "RISING",
    min: 15,
    max: 29,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    dot: "bg-blue-500",
    desc: "High-impact feedback. Unlocks priority access to new Sprints.",
  },
  {
    name: "PRO",
    min: 30,
    max: 59,
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    dot: "bg-purple-500",
    desc: "Senior Pioneers fast-track here. Consistently shapes startup direction.",
  },
  {
    name: "MASTER",
    min: 60,
    max: 99,
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
    dot: "bg-yellow-500",
    desc: "Top 5% of domain Pioneers. Invitation to exclusive founder syncs.",
  },
  {
    name: "ELITE",
    min: 100,
    max: null,
    color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    dot: "bg-orange-500",
    desc: "Lifetime domain authority. Commission-free earnings for top contributors.",
  },
];

export default function PioneerGradeSection() {
  return (
    <section className="bg-background py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <span className="text-xs font-semibold tracking-widest text-primary uppercase mb-3 block">
            Pioneer grade ladder
          </span>
          <h2 className="text-3xl md:text-4xl font-bold">Your expertise, ranked.</h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            Every interaction moves you up the grade ladder. Higher grades unlock better commission rates and exclusive access.
          </p>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GRADES.map((grade, i) => (
            <motion.div
              key={grade.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
              className="rounded-xl border bg-card p-5 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${grade.color}`}>
                  {grade.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {grade.max ? `${grade.min}–${grade.max} interactions` : `${grade.min}+ interactions`}
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{grade.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="text-center text-xs text-muted-foreground mt-8"
        >
          Senior Pioneers (5+ years LinkedIn experience) start at PRO grade directly.
        </motion.p>
      </div>
    </section>
  );
}
