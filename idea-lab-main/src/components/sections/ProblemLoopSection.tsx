import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useInView } from "../../hooks/useScrollProgress";
import { gsap, ScrollTrigger } from "../../lib/gsap";

const NODES = [
  { label: "Answer", angle: -90, desc: "Answer 5 core project questions" },
  { label: "Spotlight", angle: -18, desc: "Auto-generate Spotlight page" },
  { label: "Pitch", angle: 54, desc: "Record 30s Elevator Pitch Reel" },
  { label: "Connect", angle: 126, desc: "Engage audience & capture signals" },
  { label: "Validate", angle: 198, desc: "5-Aspect report & Buyer Signals" },
];

function polarToXY(angleDeg: number, r: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: r * Math.cos(rad), y: r * Math.sin(rad) };
}

export default function ProblemLoopSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [activeNode, setActiveNode] = useState(-1);
  const { ref: textRef, inView } = useInView(0.3);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top 30%",
        end: "bottom 70%",
        scrub: 0.3,
        onUpdate: (self) => {
          // Map progress with slight acceleration at the end
          // so "Validate" finishes animating before scroll leaves the section
          const accelerated = Math.min(self.progress * 1.3, 1);
          const idx = Math.floor(accelerated * 5);
          setActiveNode(Math.min(idx, 4));
        },
      },
    });

    return () => {
      tl.kill();
      ScrollTrigger.getAll().forEach((t) => {
        if (t.vars.trigger === section) t.kill();
      });
    };
  }, []);

  const R = 140;
  const cx = 175;
  const cy = 175;

  return (
    <section ref={sectionRef} className="relative bg-gradient-to-b from-slate-200/70 via-slate-100/70 to-slate-200/70 py-16 md:py-20 overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(#09daed 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
        }}
      />

      <div className="max-w-[1440px] mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Loop Diagram */}
          <div className="flex items-center justify-center">
            <div className="relative" style={{ width: 350, height: 350 }}>
              <svg width="350" height="350" className="absolute inset-0">
                <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(9,218,237,0.15)" strokeWidth="1" strokeDasharray="4 8" />
                <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(9,218,237,0.2)" strokeWidth="1" />
                <circle
                  cx={cx} cy={cy} r={R} fill="none" stroke="#09daed" strokeWidth="2.5"
                  strokeDasharray={`${2 * Math.PI * R * ((activeNode + 1) / 5)} ${2 * Math.PI * R}`}
                  className="transition-all duration-300"
                  style={{ transform: `rotate(-90deg)`, transformOrigin: `${cx}px ${cy}px` }}
                />
                {NODES.map((node, i) => {
                  const from = polarToXY(node.angle, R);
                  const to = polarToXY(NODES[(i + 1) % NODES.length].angle, R);
                  return (
                    <line
                      key={`line-${i}`}
                      x1={cx + from.x} y1={cy + from.y}
                      x2={cx + to.x} y2={cy + to.y}
                      stroke={i <= activeNode ? "#09daed" : "rgba(148,163,184,0.3)"}
                      strokeWidth="1.5"
                      className="transition-all duration-300"
                    />
                  );
                })}
              </svg>

              <div className="absolute" style={{ left: cx - 40, top: cy - 40 }}>
                <div
                  className="w-20 h-20 border-2 border-[#09daed]/40 bg-white/90 shadow-md flex items-center justify-center rounded-xl backdrop-blur-sm"
                >
                  <img
                    src="/neesh-logo.png"
                    alt="Neesh AI"
                    className="w-12 h-12 object-contain"
                  />
                </div>
              </div>

              {NODES.map((node, i) => {
                const { x, y } = polarToXY(node.angle, R);
                const isActive = i <= activeNode;
                return (
                  <div
                    key={node.label}
                    className="absolute flex flex-col items-center"
                    style={{ left: cx + x - 34, top: cy + y - 34, width: 68 }}
                  >
                    <div
                      className={`w-[68px] h-[68px] border-2 rounded-xl flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                        isActive
                          ? "border-[#09daed] bg-white text-[#008494] shadow-[0_0_20px_rgba(9,218,237,0.35)]"
                          : "border-slate-300 bg-slate-200/90 text-slate-600"
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-[10px] font-extrabold">{i + 1}</div>
                        <div className="text-[9px] leading-tight font-bold">{node.label}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Text */}
          <div ref={textRef as React.RefObject<HTMLDivElement>} className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7 }}
            >
              <div className="text-[#008494] text-sm font-extrabold tracking-widest uppercase mb-3">The Problem</div>
              <h2 className="text-4xl md:text-5xl font-black text-slate-950 leading-tight mb-4 drop-shadow-sm">
                Most ideas die in isolation before anyone even sees them.
              </h2>
              <p className="text-slate-700 text-lg font-semibold">
                Without structured feedback and real market signals, founders build products nobody wants.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="border-l-4 border-[#09daed] pl-4 py-1"
            >
              <p className="text-slate-950 text-xl font-black">
                Neesh AI turns confusion into clarity.
              </p>
            </motion.div>

            <div className="space-y-3">
              {NODES.map((node, i) => (
                <motion.div
                  key={node.label}
                  initial={{ opacity: 0, x: 20 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.1 * i }}
                  className={`flex items-center gap-3 p-3.5 border-2 rounded-xl transition-all duration-300 ${
                    i <= activeNode
                      ? "border-[#09daed]/60 bg-white/90 shadow-sm"
                      : "border-slate-300/80 bg-slate-200/60"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black transition-all duration-300 ${
                      i <= activeNode ? "bg-[#09daed] text-black shadow-sm" : "bg-slate-300 text-slate-600"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <div>
                    <div
                      className={`text-sm font-black transition-colors duration-300 ${
                        i <= activeNode ? "text-slate-950" : "text-slate-600"
                      }`}
                    >
                      {node.label}
                    </div>
                    <div className="text-xs text-slate-600 font-semibold">{node.desc}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-400/40 to-transparent" />
    </section>
  );
}
