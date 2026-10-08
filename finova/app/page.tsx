'use client';

import React from 'react';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { MarketStrip } from '@/components/shared/MarketStrip';
import { HeroSection } from '@/components/landing/HeroSection';
import { ProblemSection } from '@/components/landing/ProblemSection';
import { UnifiedPortfolioSection } from '@/components/landing/UnifiedPortfolioSection';
import { PortfolioIntelligenceSection } from '@/components/landing/PortfolioIntelligenceSection';
import { BeyondStocksSection } from '@/components/landing/BeyondStocksSection';
import { InsightPreviewSection } from '@/components/landing/InsightPreviewSection';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { SecuritySection } from '@/components/landing/SecuritySection';
import { FinalCTA } from '@/components/landing/FinalCTA';
import { LandingFooter } from '@/components/landing/LandingFooter';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground antialiased selection:bg-brand/20">
      {/* 1. Public Navbar */}
      <LandingNavbar />

      {/* 2. Compact Market Strip directly below Navbar */}
      <MarketStrip />

      {/* Main Content Sections */}
      <main className="flex-1 flex flex-col">
        {/* Two-Column Hero with Interactive Portfolio Preview */}
        <HeroSection />

        {/* 4. Problem & Ingestion Flow Section */}
        <ProblemSection />

        {/* 5. One Portfolio. Every Investment. */}
        <UnifiedPortfolioSection />

        {/* 6. Portfolio Intelligence & Risk Diagnostics */}
        <PortfolioIntelligenceSection />

        {/* 7. Beyond Stocks (REITs, InvITs, Bonds, Equities) */}
        <BeyondStocksSection />

        {/* 8. Personalized News Context Preview */}
        <InsightPreviewSection />

        {/* 9. How Finova Works (3 Steps) */}
        <HowItWorksSection />

        {/* 10. Privacy & Architectural Security */}
        <SecuritySection />

        {/* 11. Final Conversion CTA */}
        <FinalCTA />
      </main>

      {/* 12. Public Footer */}
      <LandingFooter />
    </div>
  );
}
