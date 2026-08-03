import { motion } from "framer-motion";
import { useState } from "react";
import { useInView } from "../../hooks/useScrollProgress";
import { ChevronDown } from "lucide-react";

export const FAQ_ITEMS = [
  {
    question: "How does Neesh AI validate raw startup ideas?",
    answer: "Neesh AI converts your notes into publishable Spotlight pages and short-form pitch reels. Custom AI chatbots engage visitors, answer questions 24/7, and surface objection points and confusion signals."
  },
  {
    question: "Do I need to write code to use Neesh AI?",
    answer: "No. Neesh AI is completely code-free. You can upload pitch reels, train chatbots, and collect structured feedback without writing code."
  },
  {
    question: "How does the context-aware AI chatbot get trained?",
    answer: "You can upload your pitch decks, FAQs, whitepapers, or project briefs. The AI indexes your documents to answer visitor questions accurately."
  },
  {
    question: "Is Neesh AI free to use during Beta?",
    answer: "Yes, Neesh AI is completely free during our beta period for founders and creators."
  }
];

export default function FaqSection() {
  const { ref, inView } = useInView(0.1);
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (i: number) => {
    setOpenIndex(openIndex === i ? null : i);
  };

  return (
    <section id="faq" className="bg-gradient-to-b from-slate-200/70 via-slate-100/70 to-slate-200/70 py-12 md:py-16 relative overflow-hidden">
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 relative z-10">
        <div ref={ref as React.RefObject<HTMLDivElement>} className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            className="text-[#09daed] text-sm font-bold tracking-widest uppercase mb-4"
          >
            Got Questions?
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-extrabold text-gray-950 mb-4"
          >
            Frequently Asked Questions
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2 }}
            className="text-gray-600 max-w-lg mx-auto font-medium"
          >
            Everything you need to know about validating your startup concepts on Neesh AI.
          </motion.p>
        </div>

        <div className="max-w-3xl mx-auto space-y-4">
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <motion.div
                key={item.question}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: index * 0.1 }}
                className="border border-slate-200/80 bg-white rounded-xl overflow-hidden shadow-sm hover:border-[#09daed]/40 transition-colors"
              >
                <button
                  onClick={() => toggle(index)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left gap-4 font-bold text-gray-900 text-lg hover:text-[#09daed] transition-colors"
                >
                  <span>{item.question}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${
                      isOpen ? "rotate-180 text-[#09daed]" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 pt-1 text-gray-600 text-base leading-relaxed font-medium border-t border-slate-100 bg-slate-50/50">
                    {item.answer}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
