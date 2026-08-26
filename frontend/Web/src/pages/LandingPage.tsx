import { AgentInActionSection } from '@/components/landing/AgentInActionSection';
import { AuditLedgerSection } from '@/components/landing/AuditLedgerSection';
import { CommerceAgentSection } from '@/components/landing/CommerceAgentSection';
import { CTASection } from '@/components/landing/CTASection';
import { HeroSection } from '@/components/landing/HeroSection';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { LifecycleSection } from '@/components/landing/LifecycleSection';
import { PaymentResilienceSection } from '@/components/landing/PaymentResilienceSection';
import { SecurityGateSection } from '@/components/landing/SecurityGateSection';
import { SequenceFlowSection } from '@/components/landing/SequenceFlowSection';
import { WhyAgenticSection } from '@/components/landing/WhyAgenticSection';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-purple-500 selection:text-white dark:bg-slate-950 dark:text-slate-100">
      <LandingNavbar />
      <HeroSection />
      <LifecycleSection />
      <CommerceAgentSection />
      <AgentInActionSection />
      <SecurityGateSection />
      <AuditLedgerSection />
      <PaymentResilienceSection />
      <WhyAgenticSection />
      <SequenceFlowSection />
      <CTASection />
      <LandingFooter />
    </div>
  );
}
