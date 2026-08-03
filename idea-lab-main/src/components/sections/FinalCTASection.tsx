import { motion } from "framer-motion";
import { useInView } from "../../hooks/useScrollProgress";
import { Link } from "react-router-dom";

const INDIAN_SCRIPTS = [
  "पहले शुरू करें, फिर इसे सुंदर बनाएं",
  "முதலில் தொடங்குங்கள், பிறகு அதை அழகாக்குங்கள்",
  "ആദ്യം ആരംഭിക്കുക, പിന്നീട് മനോഹരമാക്കുക",
  "ಮೊದಲು ಪ್ರಾರಂಭಿಸಿ, ನಂತರ ಅದನ್ನು ಸುಂದರಗೊಳಿಸಿ",
  "ముందు ప్రారంభించండి, ఆపై దానిని అందంగా తీర్చిదిద్దండి",
  "প্রথমে শুরু করুন, তারপর এটি সুন্দর করুন",
  "आधी सुरुवात करा, मग ते सुंदर बनवा",
  "પહેલા શરૂ કરો, પછી તેને સુંદર બનાવો",
  "ਪਹਿਲਾਂ ਸ਼ੁਰੂ ਕਰੋ, ਫਿਰ ਇਸਨੂੰ ਸੁੰਦਰ ਬਣਾਓ",
  "ପ୍ରଥମେ ଆରମ୍ଭ କରନ୍ତୁ, ତାପରେ ଏହାକୁ ସୁନ୍ଦର କରନ୍ତୁ",
];

export default function FinalCTASection() {
  const { ref, inView } = useInView(0.3);

  return (
    <section className="relative bg-gradient-to-b from-slate-200/70 via-slate-100/70 to-slate-200/70 py-14 md:py-18 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#09daed]/6 blur-[150px] pointer-events-none" />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(#09daed 1px, transparent 1px), linear-gradient(90deg, #09daed 1px, transparent 1px)`,
            backgroundSize: "80px 80px",
          }}
        />
      </div>

      <div ref={ref as React.RefObject<HTMLDivElement>} className="relative z-10 max-w-[1440px] mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.8 }}
          className="border border-[#09daed]/30 p-8 md:p-14 bg-white rounded-3xl animate-pulse-glow"
          style={{ boxShadow: "0 20px 60px rgba(9,218,237,0.12), 0 4px 20px rgba(0,0,0,0.04)" }}
        >
          {/* Big Neesh AI Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="flex justify-center mb-8"
          >
            <img
              src="/neesh-logo.png"
              alt="Neesh AI"
              className="w-28 h-28 md:w-36 md:h-36 object-contain"
              style={{ filter: "drop-shadow(0 0 25px rgba(9,218,237,0.5))" }}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex items-center justify-center gap-1 mb-8"
          >
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <motion.div
                key={i}
                initial={{ width: 40 }}
                animate={inView ? { width: i === 4 ? 80 : 20 } : { width: 40 }}
                transition={{ duration: 0.8, delay: 0.3 + i * 0.05 }}
                className="h-1 rounded-full"
                style={{
                  background: i === 4 ? "#09daed" : "rgba(9,218,237,0.2)",
                }}
              />
            ))}
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-[#008494] text-xs md:text-sm tracking-[0.25em] uppercase mb-4 font-black"
          >
            The final step
          </motion.p>

          {/* Main Headline */}
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-950 leading-[1.1] mb-8"
          >
            First start, then make it{" "}
            <span className="text-[#09daed] drop-shadow-[0_0_15px_rgba(9,218,237,0.3)]">beautiful</span>.
          </motion.h2>

          {/* 10 Indian Language Translations (Without language names or header title) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mb-12 max-w-4xl mx-auto p-5 bg-slate-50 border border-slate-200/80 rounded-2xl"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              {INDIAN_SCRIPTS.map((script, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs flex items-center justify-center text-center hover:border-[#09daed]/50 transition-colors"
                >
                  <div className="text-xs font-bold text-slate-900 leading-snug">
                    {script}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Large Box-Shaped CTA Button: Start Developing */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex justify-center"
          >
            <Link
              to="/signup"
              className="bg-[#09daed] text-black font-black px-12 py-5 text-lg hover:bg-[#07c4d4] transition-all duration-200 shadow-md inline-block text-center rounded-sm transform hover:-translate-y-0.5 tracking-wide"
            >
              Start Developing
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
