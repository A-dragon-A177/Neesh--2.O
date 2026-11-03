import Navbar from "../components/Navbar";
import HeroSection from "../components/sections/HeroSection";
import DomainProofFeedSection from "../components/sections/DomainProofFeedSection";
import HowItWorksV19Section from "../components/sections/HowItWorksV19Section";
import PioneerGradeSection from "../components/sections/PioneerGradeSection";
import SprintPricingSection from "../components/sections/SprintPricingSection";
import SocialProofSection from "../components/sections/SocialProofSection";
import FinalCTASection from "../components/sections/FinalCTASection";
import FooterSection from "../components/sections/FooterSection";

function Index() {
  return (
    <div className="bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <DomainProofFeedSection />
        <HowItWorksV19Section />
        <PioneerGradeSection />
        <SprintPricingSection />
        <SocialProofSection />
        <FinalCTASection />
      </main>
      <FooterSection />
    </div>
  );
}

export default Index;
