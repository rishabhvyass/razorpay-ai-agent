import { ArchitectureSection } from '@/components/landing/ArchitectureSection';
import { AuditTrailSection } from '@/components/landing/AuditTrailSection';
import { CTASection } from '@/components/landing/CTASection';
import { FailureHandlingSection } from '@/components/landing/FailureHandlingSection';
import { HeroSection } from '@/components/landing/HeroSection';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { MCPSection } from '@/components/landing/MCPSection';
import { MerchantGrowthSection } from '@/components/landing/MerchantGrowthSection';
import { ProblemSection } from '@/components/landing/ProblemSection';
import { SafetySection } from '@/components/landing/SafetySection';
import { TechnologySection } from '@/components/landing/TechnologySection';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] selection:bg-[#EBF3FF] selection:text-[#0047B3] dark:bg-[#090D16] dark:text-[#F8FAFC]">
      <LandingNavbar />
      <HeroSection />
      <ProblemSection />
      <HowItWorksSection />
      <SafetySection />
      <AuditTrailSection />
      <FailureHandlingSection />
      <ArchitectureSection />
      <MCPSection />
      <MerchantGrowthSection />
      <TechnologySection />
      <CTASection />
      <LandingFooter />
    </div>
  );
}
