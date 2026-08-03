import { useEffect } from "react";
import Lenis from "lenis";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { gsap } from "../lib/gsap";
import Navbar from "../components/Navbar";
import ScrollCanvas from "../components/ScrollCanvas";
import HeroSection from "../components/sections/HeroSection";
import ProblemLoopSection from "../components/sections/ProblemLoopSection";
import ValidationLoopSection from "../components/sections/ValidationLoopSection";
import BlogShowcaseSection from "../components/sections/BlogShowcaseSection";
import PitchShowcaseSection from "../components/sections/PitchShowcaseSection";
import AudienceSignalsSection from "../components/sections/AudienceSignalsSection";
import SocialProofSection from "../components/sections/SocialProofSection";
import TransformSection from "../components/sections/TransformSection";
import PricingSection from "../components/sections/PricingSection";
import FaqSection from "../components/sections/FaqSection";
import FinalCTASection from "../components/sections/FinalCTASection";
import FooterSection from "../components/sections/FooterSection";

function Index() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      ScrollTrigger.update();
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    gsap.ticker.lagSmoothing(0);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return (
    <div style={{ position: "relative" }}>
      {/* Scroll-linked image sequence background */}
      <ScrollCanvas />

      {/* All content layered above the canvas background */}
      <div className="relative" style={{ position: "relative", zIndex: 1 }}>
        <Navbar />
        <main>
          <HeroSection />
          <ProblemLoopSection />
          <ValidationLoopSection />
          <PitchShowcaseSection />
          <BlogShowcaseSection />
          <AudienceSignalsSection />
          <SocialProofSection />
          <TransformSection />
          <PricingSection />
          <FaqSection />
          <FinalCTASection />
        </main>
        <FooterSection />
      </div>
    </div>
  );
}

export default Index;

